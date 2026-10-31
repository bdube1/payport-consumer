import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';

// Scan-to-pay code for the session, shown only when QR payments are switched on.
function ScanToPay({ sessionId }) {
    const [img, setImg] = useState(null);
    useEffect(() => {
        let live = true;
        checkoutApi.qr(sessionId)
            .then(r => (r.data?.data || r.data)?.payload)
            .then(p => p && QRCode.toDataURL(p, { margin: 1, width: 220 }))
            .then(url => { if (live && url) setImg(url); })
            .catch(() => {});
        return () => { live = false; };
    }, [sessionId]);
    if (!img) return null;
    return (
        <div style={{ textAlign: 'center', margin: '4px 0 18px' }}>
            <img src={img} alt="Scan to pay" style={{ width: 200, height: 200, borderRadius: 12, background: '#fff', padding: 8 }} />
            <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '6px 0 0' }}>Scan to pay, or pay below</p>
        </div>
    );
}
import { useParams } from 'react-router-dom';
import { checkoutApi, walletApi, isLoggedIn, formatAmount, BASE } from '../lib/api';

const TERMINAL_STATUSES = new Set(['PAID', 'FAILED', 'EXPIRED', 'CANCELLED']);
const POLL_INTERVAL_MS = 3000;

// Methods with a backend adaptor behind them.
const METHOD_LABELS = {
    ECOCASH: 'EcoCash',
    ONEMONEY: 'OneMoney',
    OMARI: 'Omari',
    INNBUCKS: 'InnBucks',
    ZIMSWITCH: 'Card',
};

export default function Checkout() {
    const { sessionId } = useParams();

    const [session, setSession] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [method, setMethod] = useState(() => (isLoggedIn() ? 'WALLET' : 'ECOCASH'));
    const [submitting, setSubmitting] = useState(false);
    const [payError, setPayError] = useState('');
    const [widgetJsUrl, setWidgetJsUrl] = useState(null);
    const [paymentCode, setPaymentCode] = useState(null);
    const [widgetScriptLoaded, setWidgetScriptLoaded] = useState(false);
    const widgetScriptRef = useRef(null);
    const pollRef = useRef(null);
    const picked = useRef(false);

    const isCardMethod = method === 'ZIMSWITCH';
    const isWallet = method === 'WALLET';
    const [pin, setPin] = useState('');
    // A signed-in PayPort customer can also pay from their wallet (only if PayPort has switched wallets on).
    // Only the methods this business accepts (when the server says), the customer's choice from the store first.
    const accepted = Array.isArray(session?.methods) ? session.methods : Object.keys(METHOD_LABELS);
    const offered = Object.fromEntries(Object.entries(METHOD_LABELS).filter(([code]) => accepted.includes(code)));
    const labels = isLoggedIn() ? { WALLET: 'PayPort Wallet', ...offered } : offered;

    const loadSession = async () => {
        try {
            const res = await checkoutApi.getSession(sessionId);
            const s = res.data?.data || res.data;
            setSession(s);
            if (picked.current) return;
            picked.current = true;
            if (s?.preferredMethod && (s.methods || []).includes(s.preferredMethod)) setMethod(s.preferredMethod);
            else if (!isLoggedIn() && Array.isArray(s?.methods) && s.methods.length && !s.methods.includes('ECOCASH')) setMethod(s.methods[0]);
            setLoadError('');
        } catch (e) {
            setLoadError(e.response?.data?.message || 'This checkout link is invalid or has expired.');
        }
    };

    useEffect(() => {
        loadSession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId]);

    // Poll while the session is actively being paid (PENDING) -- stops
    // itself the moment a terminal status is reached, and is never
    // running at all before the customer has submitted payment.
    useEffect(() => {
        if (!session) return;
        if (session.status !== 'PENDING') {
            clearInterval(pollRef.current);
            return;
        }
        pollRef.current = setInterval(async () => {
            try {
                const res = await checkoutApi.getSession(sessionId);
                const updated = res.data?.data || res.data;
                setSession(updated);
                if (TERMINAL_STATUSES.has(updated.status)) {
                    clearInterval(pollRef.current);
                }
            } catch {
                // A transient poll failure isn't worth surfacing to the
                // customer -- the next tick tries again.
            }
        }, POLL_INTERVAL_MS);
        return () => clearInterval(pollRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.status]);

    // Same script-injection pattern as ZimSwitchWidget.jsx -- OPPWA's own
    // script renders the actual card fields into the form below, so a raw
    // card number never touches Payport's own code at any point.
    useEffect(() => {
        if (!widgetJsUrl) return;
        if (widgetScriptRef.current) {
            document.head.removeChild(widgetScriptRef.current);
            widgetScriptRef.current = null;
        }
        const script = document.createElement('script');
        script.src = widgetJsUrl;
        script.async = true;
        script.onload = () => setWidgetScriptLoaded(true);
        script.onerror = () => setPayError('Could not load the card payment form. Please check your connection and try again.');
        document.head.appendChild(script);
        widgetScriptRef.current = script;
        return () => {
            if (widgetScriptRef.current && document.head.contains(widgetScriptRef.current)) {
                document.head.removeChild(widgetScriptRef.current);
            }
        };
    }, [widgetJsUrl]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setPayError('');

        if (isWallet) {
            if (pin.length < 4) { setPayError('Enter your PayPort PIN'); return; }
            setSubmitting(true);
            try {
                await walletApi.payCheckout(sessionId, pin);
                setPin('');
                await loadSession();
            } catch (err) {
                setPayError(err.response?.data?.message || 'Could not pay from your wallet. Please try again.');
            } finally {
                setSubmitting(false);
            }
            return;
        }
        if (!isCardMethod && !/^\+263\d{9}$/.test(phone)) {
            setPayError('Enter your number in the format +263771234567');
            return;
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setPayError('Enter a valid email address, or leave it blank');
            return;
        }

        setSubmitting(true);
        try {
            const res = await checkoutApi.pay(sessionId, {
                customerPhone: isCardMethod ? null : phone,
                customerEmail: email || null,
                paymentMethodCode: method,
            });
            const result = res.data?.data || res.data;

            if (result.widgetJsUrl) {
                // Card payment -- render OPPWA's widget instead of the
                // "check your phone" screen. Session status polling (the
                // effect above) keeps running in the background and picks
                // up PAID/FAILED once ZimSwitch's webhook lands, exactly
                // the same way it already does for mobile money.
                setWidgetJsUrl(result.widgetJsUrl);
            }
            if (result.paymentCode) setPaymentCode(result.paymentCode);
            await loadSession();
        } catch (e) {
            setPayError(e.response?.data?.message || 'Could not submit payment. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loadError) {
        return (
            <div style={S.page}>
                <div style={S.card}>
                    <div style={S.errorIcon}>⚠️</div>
                    <h2 style={S.title}>Checkout unavailable</h2>
                    <p style={S.muted}>{loadError}</p>
                </div>
            </div>
        );
    }

    if (!session) {
        return (
            <div style={S.page}>
                <div style={S.card}><p style={S.muted}>Loading…</p></div>
            </div>
        );
    }

    const amount = formatAmount(session.amountCents, session.currency);

    return (
        <div style={S.page}>
            <style>{`@keyframes pp-spin { to { transform: rotate(360deg); } }`}</style>
            <div style={S.card}>
                <div style={S.brandRow}>
                    <img src="/images/brand/lockup.png" alt="Payport" style={S.logo} />
                    <span style={S.secureTag}>🔒 Secure checkout</span>
                </div>

                <p style={S.merchantLabel}>Paying</p>
                <h1 style={S.merchantName}>{session.merchantName}</h1>
                <div style={S.amount}>{amount}</div>
                {session.description && <p style={S.description}>{session.description}</p>}

                {session.status === 'PAID' && (
                    <div style={S.resultBlock}>
                        <div style={S.successIcon}>✓</div>
                        <h2 style={S.title}>Payment successful</h2>
                        <p style={S.muted}>Thank you — your payment has been confirmed.</p>
                    </div>
                )}

                {session.status === 'FAILED' && (
                    <div style={S.resultBlock}>
                        <div style={S.errorIcon}>✕</div>
                        <h2 style={S.title}>Payment failed</h2>
                        <p style={S.muted}>Your payment could not be completed. No money was deducted.</p>
                    </div>
                )}

                {(session.status === 'EXPIRED' || session.status === 'CANCELLED') && (
                    <div style={S.resultBlock}>
                        <div style={S.errorIcon}>⏱</div>
                        <h2 style={S.title}>{session.status === 'EXPIRED' ? 'This checkout link has expired' : 'Checkout cancelled'}</h2>
                        <p style={S.muted}>Please ask {session.merchantName} for a new payment link.</p>
                    </div>
                )}

                {session.status === 'PENDING' && !widgetJsUrl && (
                    <div style={S.resultBlock}>
                        <div style={S.spinner} />
                        {paymentCode ? <>
                            <h2 style={S.title}>Approve in InnBucks</h2>
                            <div style={{ fontFamily: 'monospace', fontSize: 26, fontWeight: 800, letterSpacing: '0.08em', margin: '8px 0' }}>{paymentCode}</div>
                            <p style={S.muted}>Open the InnBucks app and approve this code. This page updates automatically.</p>
                        </> : <>
                            <h2 style={S.title}>Check your phone</h2>
                            <p style={S.muted}>Approve the {METHOD_LABELS[method] || method} prompt on {phone || session.customerPhone}. This page updates automatically.</p>
                        </>}
                    </div>
                )}

                {session.status === 'PENDING' && widgetJsUrl && (
                    <div>
                        <div style={S.trustBadge}>🔒 256-bit SSL · ZimSwitch certified · Payport never stores your card details</div>
                        {widgetScriptLoaded ? (
                            <form action={`${BASE}/api/v1/callbacks/zimswitch/result`} className="paymentWidgets" data-brands="ZIMSWITCH VISA MASTER" />
                        ) : (
                            <div style={S.resultBlock}>
                                <div style={S.spinner} />
                                <p style={S.muted}>Loading card form…</p>
                            </div>
                        )}
                    </div>
                )}

                {session.status === 'CREATED' && <ScanToPay sessionId={sessionId} />}
                {session.status === 'CREATED' && (
                    <form onSubmit={handleSubmit} style={S.form}>
                        {payError && <div style={S.errorBox}>{payError}</div>}

                        <label style={S.label}>Pay with</label>
                        <div style={S.methodGrid}>
                            {Object.entries(labels).map(([code, label]) => (
                                <button key={code} type="button" onClick={() => setMethod(code)}
                                    style={{ ...S.methodBtn, ...(method === code ? S.methodBtnActive : {}) }}>
                                    {label}
                                </button>
                            ))}
                        </div>

                        {isWallet && (
                            <>
                                <label style={S.label}>PayPort PIN</label>
                                <input
                                    type="password" inputMode="numeric" maxLength={6} value={pin}
                                    onChange={e => setPin(e.target.value.replace(/\D/g, ''))} style={S.input} required
                                />
                            </>
                        )}

                        {!isCardMethod && !isWallet && (
                            <>
                                <label style={S.label}>Mobile money number</label>
                                <input
                                    type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                                    style={S.input} required
                                />
                            </>
                        )}

                        <label style={S.label}>Email {isCardMethod ? '' : '(optional)'} — for your receipt</label>
                        <input
                            type="email" value={email} onChange={e => setEmail(e.target.value)}
                            style={S.input}
                        />

                        {isCardMethod && (
                            <p style={S.cardNote}>You'll enter your card details on the next screen, handled directly and securely by ZimSwitch — Payport never sees or stores your card number.</p>
                        )}

                        <button type="submit" disabled={submitting} style={S.payBtn}>
                            {submitting ? 'Submitting…' : isCardMethod ? 'Continue to card payment' : `Pay ${amount}`}
                        </button>
                    </form>
                )}

                <p style={S.footer}>Payments are processed securely by Payport. {session.merchantName} never sees your mobile money PIN or card details.</p>
            </div>
        </div>
    );
}

const S = {
    page: { minHeight: '100vh', background: '#F4F7FB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'system-ui, sans-serif' },
    card: { width: '100%', maxWidth: 420, background: 'var(--bg-card)', borderRadius: 20, padding: '32px 28px', boxShadow: '0 12px 40px rgba(9,30,62,0.10)' },
    brandRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
    logo: { height: 26, width: 'auto' },
    secureTag: { fontSize: 12, color: 'var(--text-2)', fontWeight: 600 },
    merchantLabel: { fontSize: 12, color: '#9098A8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0, fontWeight: 700 },
    merchantName: { fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: '4px 0 14px' },
    amount: { fontSize: 38, fontWeight: 900, color: 'var(--text)', marginBottom: 4 },
    description: { fontSize: 14, color: 'var(--text-2)', marginBottom: 20 },
    form: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 },
    label: { fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 10 },
    input: { padding: '13px 14px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 15, outline: 'none' },
    methodRow: { display: 'flex', gap: 10, marginBottom: 6 },
    methodGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 6 },
    methodBtn: { flex: 1, padding: '12px 10px', borderRadius: 10, border: '1.5px solid #E1E6ED', background: 'var(--bg-card)', color: 'var(--text)', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
    methodBtnActive: { borderColor: '#06A3DA', background: 'rgba(6,163,218,0.08)', color: '#06A3DA' },
    trustBadge: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(52,173,84,0.07)', border: '1px solid rgba(52,173,84,0.2)', borderRadius: 10, fontSize: 12.5, color: '#2a6e3a', fontWeight: 600, marginBottom: 18 },
    cardNote: { fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5, margin: '4px 0 2px' },
    payBtn: { marginTop: 16, padding: 15, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #06A3DA, #0487B8)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer' },
    errorBox: { background: '#FEF2F2', color: '#B91C1C', padding: '10px 14px', borderRadius: 10, fontSize: 13 },
    resultBlock: { textAlign: 'center', padding: '20px 0' },
    successIcon: { width: 52, height: 52, borderRadius: '50%', background: '#DCFCE7', color: '#16A34A', fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' },
    errorIcon: { width: 52, height: 52, borderRadius: '50%', background: '#FEE2E2', color: '#DC2626', fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' },
    spinner: { width: 36, height: 36, border: '3px solid #E1E6ED', borderTopColor: '#06A3DA', borderRadius: '50%', margin: '0 auto 16px', animation: 'pp-spin 0.8s linear infinite' },
    title: { fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: '0 0 6px' },
    muted: { fontSize: 14, color: 'var(--text-2)', margin: 0 },
    footer: { fontSize: 11.5, color: '#9098A8', textAlign: 'center', marginTop: 24, lineHeight: 1.5 },
};

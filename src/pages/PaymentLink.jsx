import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { paymentLinkApi, formatAmount } from '../lib/api';

export default function PaymentLink() {
    const { slug } = useParams();
    const navigate = useNavigate();

    const [link, setLink] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [customAmount, setCustomAmount] = useState('');
    const [starting, setStarting] = useState(false);
    const [startError, setStartError] = useState('');

    useEffect(() => {
        paymentLinkApi.getInfo(slug)
            .then(res => setLink(res.data?.data || res.data))
            .catch(err => setLoadError(err.response?.data?.message || 'This payment link is invalid.'));
    }, [slug]);

    const handleContinue = async () => {
        setStartError('');
        let amountCents = null;
        if (link.requiresCustomAmount) {
            const parsed = parseFloat(customAmount);
            if (!parsed || parsed <= 0) {
                setStartError('Enter a valid amount');
                return;
            }
            amountCents = Math.round(parsed * 100);
        }
        setStarting(true);
        try {
            const res = await paymentLinkApi.start(slug, amountCents);
            const sessionId = res.data?.data?.checkoutSessionId || res.data?.checkoutSessionId;
            navigate(`/checkout/${sessionId}`, { replace: true });
        } catch (err) {
            setStartError(err.response?.data?.message || 'Could not start this payment. Please try again.');
            setStarting(false);
        }
    };

    if (loadError) {
        return (
            <div style={S.page}>
                <div style={S.card}>
                    <div style={S.errorIcon}>⚠️</div>
                    <h2 style={S.title}>Link unavailable</h2>
                    <p style={S.muted}>{loadError}</p>
                </div>
            </div>
        );
    }

    if (!link) {
        return <div style={S.page}><div style={S.card}><p style={S.muted}>Loading…</p></div></div>;
    }

    return (
        <div style={S.page}>
            <div style={S.card}>
                <div style={S.brandRow}>
                    <img src="/images/brand/lockup.png" alt="Payport" style={S.logo} />
                    <span style={S.secureTag}>🔒 Secure checkout</span>
                </div>

                {link.description && <p style={S.description}>{link.description}</p>}

                {link.requiresCustomAmount ? (
                    <>
                        <label style={S.label}>Amount ({link.currency})</label>
                        <input
                            type="number" step="0.01" min="0.01" value={customAmount}
                            onChange={e => setCustomAmount(e.target.value)}
                            style={S.amountInput}
                        />
                    </>
                ) : (
                    <div style={S.amount}>{formatAmount(link.amountCents, link.currency)}</div>
                )}

                {startError && <div style={S.errorBox}>{startError}</div>}

                <button onClick={handleContinue} disabled={starting} style={S.payBtn}>
                    {starting ? 'Starting…' : 'Continue to payment'}
                </button>

                <p style={S.footer}>Payments are processed securely by Payport.</p>
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
    description: { fontSize: 15, color: 'var(--text)', fontWeight: 700, marginBottom: 20 },
    amount: { fontSize: 38, fontWeight: 900, color: 'var(--text)', marginBottom: 24 },
    label: { fontSize: 13, fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: 8 },
    amountInput: { width: '100%', padding: '13px 14px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 20, fontWeight: 700, marginBottom: 20, boxSizing: 'border-box' },
    payBtn: { width: '100%', padding: 15, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #06A3DA, #0487B8)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer' },
    errorBox: { background: '#FEF2F2', color: '#B91C1C', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 },
    errorIcon: { width: 52, height: 52, borderRadius: '50%', background: '#FEE2E2', color: '#DC2626', fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' },
    title: { fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: '0 0 6px', textAlign: 'center' },
    muted: { fontSize: 14, color: 'var(--text-2)', margin: 0, textAlign: 'center' },
    footer: { fontSize: 11.5, color: '#9098A8', textAlign: 'center', marginTop: 24 },
};

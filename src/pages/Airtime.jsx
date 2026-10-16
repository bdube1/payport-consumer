import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { productsApi, startPayment, paymentError, normalizePhone, formatAmount, generateReference, visibleMethods } from '../lib/api';
import WalletPin from '../components/flow/WalletPin';
import { useAuth } from '../lib/AuthContext';
import FlowSection from '../components/flow/FlowSection';
import ConfirmModal from '../components/flow/ConfirmModal';

const C = { primary: '#06A3DA', green: '#34AD54', dark: '#091E3E', light: '#EEF9FF' };

// Network logo mapping (fallback if no logo in API)
const NETWORK_LOGOS = {
    'ECONET': '/images/logos/econet.png',
    'NETONE': '/images/logos/netone.png',
    'TELECEL': '/images/logos/telecel.png',
};

const MOBILE_MONEY = ['ECOCASH', 'ONEMONEY', 'TELECASH', 'OMARI'];

function Field({ label, children, hint }) {
    return (
        <div style={{ marginBottom: 20 }}>
            {label && <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>}
            {children}
            {hint && <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 6 }}>{hint}</p>}
        </div>
    );
}

function PhoneInput({ value, onChange, placeholder, locked = false }) {
    return (
        <input
            type="tel" value={value} onChange={e => !locked && onChange(e.target.value)}
            placeholder={placeholder} readOnly={locked}
            style={{
                width: '100%', padding: '14px 16px', borderRadius: 12, fontSize: 15, fontFamily: 'Nunito, sans-serif',
                border: locked ? `1.5px solid ${C.green}` : '1.5px solid var(--border)',
                background: locked ? 'rgba(52,173,84,0.07)' : 'var(--bg-2)', color: 'var(--text)',
                outline: 'none', transition: 'border-color 0.2s',
                cursor: locked ? 'default' : 'text',
            }}
            onFocus={e => { if (!locked) e.target.style.borderColor = C.primary; }}
            onBlur={e => { if (!locked) e.target.style.borderColor = 'var(--border)'; }}
        />
    );
}

// A section only appears once its prerequisites are met, and collapses to a
// compact summary once filled — see FlowSection for the collapse behaviour.


export default function Airtime() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    const [originalPath] = useState(location.state?.from || '/');
    const fromBeneficiary  = location.state?.forSomeoneElse;
    const beneficiaryPhone = location.state?.recipientPhone || '';
    const quickPhone       = location.state?.phone || '';
    const quickPayMethod   = location.state?.paymentMethod || '';
    const quickCurrency    = location.state?.currency || '';
    const quickAmount      = location.state?.amount || '';
    const skipPrefill      = location.state?.skipToPayment || false;

    const [selfTopup, setSelfTopup] = useState(!fromBeneficiary);
    const [myPhone, setMyPhone] = useState(user?.phone || quickPhone);
    const [recipientPhone, setRecipientPhone] = useState(beneficiaryPhone || (!fromBeneficiary ? '' : quickPhone));

    const [products, setProducts] = useState([]);
    const [minCents, setMinCents] = useState(50);
    const [maxCents, setMaxCents] = useState(20000);
    const [amountCents, setAmountCents] = useState(null);
    const [customAmt, setCustomAmt] = useState('');
    const [network, setNetwork] = useState(null);
    const [networkLoading, setNetworkLoading] = useState(false);
    const [isProductActive, setIsProductActive] = useState(true);
    const [networkLogo, setNetworkLogo] = useState(null);

    const [currencies, setCurrencies] = useState([]);
    const [selectedCurrency, setSelectedCurrency] = useState(quickCurrency || '');

    const [paymentMethod, setPaymentMethod] = useState(quickPayMethod || '');
    const [paymentIdentifier, setPaymentIdentifier] = useState('');
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [walletPin, setWalletPin] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [confirmOpen, setConfirmOpen] = useState(false);

    // Load products (for min/max per network) and payment methods once.
    useEffect(() => {
        productsApi.getAll().then(r => {
            const airtime = (r.data.data || r.data).filter(p => p.category === 'AIRTIME');
            setProducts(airtime);
            const econet = airtime.find(p => p.code === 'AIRTIME_ECONET');
            if (econet) {
                setMinCents(econet.minAmountCents || 50);
                setMaxCents(econet.maxAmountCents || 20000);
            }
        }).catch(() => {});

        productsApi.getPaymentMethods().then(r => {
            const methods = visibleMethods(r.data.data || r.data || [])
                .filter(pm => pm.isActive === true)
                .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
            setPaymentMethods(methods);
            if (methods.length > 0 && !quickPayMethod) setPaymentMethod(methods[0].code);
        }).catch(() => {});
    }, []);

    useEffect(() => { if (user?.phone) setMyPhone(user.phone); }, [user]);

    // Quick-buy prefill from the home screen's quick-amount widget.
    useEffect(() => {
        if (quickAmount && skipPrefill) {
            const presetAmounts = ['1', '2', '5'];
            if (presetAmounts.includes(quickAmount)) setAmountCents(parseInt(quickAmount) * 100);
            else setCustomAmt(quickAmount);
        }
    }, [quickAmount, skipPrefill]);

    // Debounced network detection — fires ~400ms after the person stops typing,
    // instead of on every keystroke, so it doesn't hammer the API or flicker.
    const detectTimer = useRef(null);
    const detectNetwork = useCallback((p) => {
        clearTimeout(detectTimer.current);
        const normalized = normalizePhone(p);
        if (normalized.length < 12) { setNetwork(null); return; }
        detectTimer.current = setTimeout(async () => {
            setNetworkLoading(true);
            try {
                const r = await productsApi.detectNetwork(normalized);
                setNetwork(r.data.data || r.data);
            } catch { setNetwork(null); }
            finally { setNetworkLoading(false); }
        }, 400);
    }, []);

    // Kick off detection for whichever number is actually being topped up.
    useEffect(() => {
        const target = selfTopup ? myPhone : recipientPhone;
        detectNetwork(target);
    }, [selfTopup, myPhone, recipientPhone, detectNetwork]);

    // Resolve currencies / limits / active-state for the detected network.
    useEffect(() => {
        if (!network?.networkCode) return;
        const prod = products.find(p => p.code === `AIRTIME_${network.networkCode}`);
        if (prod) {
            setIsProductActive(prod.isActive === true);
            setNetworkLogo(prod.logoUrl || NETWORK_LOGOS[network.networkCode]);
            const activeCurrencies = (prod.enabledCurrencies || []).filter(c => c.isActive !== false);
            setCurrencies(activeCurrencies);
            setMinCents(prod.minAmountCents || 50);
            setMaxCents(prod.maxAmountCents || 20000);
            if (selectedCurrency && !activeCurrencies.find(c => c.currency === selectedCurrency) && !(skipPrefill && quickCurrency)) {
                setSelectedCurrency('');
            }
        } else {
            setIsProductActive(false);
            setNetworkLogo(null);
            setCurrencies([]);
            if (!skipPrefill) setSelectedCurrency('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [network, products]);

    useEffect(() => {
        if (currencies.length === 1 && !selectedCurrency) setSelectedCurrency(currencies[0].currency);
    }, [currencies, selectedCurrency]);

    const getPaymentFieldLabel = () => MOBILE_MONEY.includes(paymentMethod) ? 'Payment wallet number' : 'Cardholder mobile number';
    const getPaymentFieldPlaceholder = () => MOBILE_MONEY.includes(paymentMethod) ? 'Wallet number for USSD prompt' : 'Mobile number for verification';

    const targetPhone = selfTopup ? myPhone : recipientPhone;
    const finalRecipient = normalizePhone(targetPhone);
    const getFinalAmount = () => amountCents || (customAmt ? Math.round(parseFloat(customAmt) * 100) : null);
    const productCode = network?.networkCode ? `AIRTIME_${network.networkCode}` : 'AIRTIME_ECONET';

    // Gate for each progressively-revealed section.
    const phoneReady = normalizePhone(targetPhone).length >= 12 && (selfTopup || normalizePhone(myPhone).length >= 12);
    const networkReady = phoneReady && network && isProductActive && !networkLoading;
    const currencyReady = networkReady && !!selectedCurrency;
    const amountReady = currencyReady && !!getFinalAmount() && getFinalAmount() >= minCents && getFinalAmount() <= maxCents;
    const canPay = amountReady && !!paymentMethod && normalizePhone(paymentIdentifier).length >= 12 && (paymentMethod !== 'WALLET' || walletPin.length >= 4);

    const handleSubmit = async () => {
        setError(''); setLoading(true);
        const amt = getFinalAmount();
        const ref = generateReference('WEB');
        const payPhone = normalizePhone(paymentIdentifier);
        try {
            await startPayment({
                reference: ref,
                productTypeCode: productCode,
                recipientIdentifier: finalRecipient,
                amountCents: amt,
                currency: selectedCurrency || 'USD',
                customerPhone: payPhone,
                channel: 'WEB',
            }, {
                paymentMethodCode: paymentMethod,
                customerPhone: payPhone,
                pin: walletPin,
            });
            navigate(`/processing/${ref}`);
        } catch (e) {
            setConfirmOpen(false);
            const pe = paymentError(e, 'Transaction failed. Please try again.');
            setError(pe.providerUnavailable ? `${pe.message} You can choose another payment method below.` : pe.message);
            setLoading(false);
        }
    };

    const pm = paymentMethods.find(m => m.code === paymentMethod);
    const displayAmt = getFinalAmount() || 0;

    return (
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 20px 40px' }}>
            <button onClick={() => navigate(originalPath)} style={{
                background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', marginBottom: 18, padding: 0,
            }}>← Back</button>

            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Buy Airtime</h1>
            <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 28 }}>Fill in the details below — you'll pay once everything's set.</p>

            <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: '28px 26px', boxShadow: 'var(--shadow)', border: '1px solid var(--border)' }}>
                {error && (
                    <div style={{ background: 'rgba(229,62,62,0.1)', border: '1px solid rgba(229,62,62,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#e53e3e', fontSize: 14 }}>
                        ⚠️ {error}
                    </div>
                )}

                {/* 1. Who & number */}
                <FlowSection title="Who are you topping up?" accent={C.primary} done={networkReady} summary={network ? `${finalRecipient} · ${network.networkName}` : ''}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                        {[['For myself', true], ['For someone else', false]].map(([label, val]) => (
                            <button key={String(val)} onClick={() => setSelfTopup(val)} style={{
                                padding: '14px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                                border: selfTopup === val ? `2px solid ${C.primary}` : '2px solid var(--border)',
                                background: selfTopup === val ? 'rgba(6,163,218,0.1)' : 'var(--bg-2)',
                                color: selfTopup === val ? C.primary : 'var(--text-2)',
                            }}>{label}</button>
                        ))}
                    </div>

                    <Field label="Your number" hint={user ? `✓ Registered as ${user.fullName} — cannot be changed` : 'Your number for payment and confirmation'}>
                        <PhoneInput value={myPhone} onChange={setMyPhone} placeholder="07X XXX XXXX or +263..." />
                    </Field>

                    {!selfTopup && (
                        <Field label="Recipient number" hint="The number that will receive the airtime">
                            <PhoneInput value={recipientPhone} onChange={setRecipientPhone} placeholder="07X XXX XXXX or +263..." />
                        </Field>
                    )}

                    {networkLoading && <p style={{ fontSize: 13, color: C.primary }}>Detecting network...</p>}
                    {network && !networkLoading && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 100, background: 'rgba(52,173,84,0.12)', border: '1px solid rgba(52,173,84,0.3)' }}>
                            {networkLogo ? <img src={networkLogo} alt={network.networkName} style={{ width: 16, height: 16 }} /> : <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.green }} />}
                            <span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>{network.networkName} detected</span>
                        </div>
                    )}
                    {network && !networkLoading && !isProductActive && (
                        <div style={{ marginTop: 12, background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#b91c1c', fontSize: 14, textAlign: 'center' }}>
                            ⚠️ {network.networkName} airtime is currently unavailable.
                        </div>
                    )}
                </FlowSection>

                {/* 2. Currency (only if the network offers more than one) */}
                <FlowSection title="Currency" accent={C.primary} show={networkReady && currencies.length > 1} done={currencyReady} summary={selectedCurrency}>
                    <div style={{ display: 'flex', gap: 10 }}>
                        {currencies.map(ccy => (
                            <button key={ccy.currency} onClick={() => setSelectedCurrency(ccy.currency)} style={{
                                flex: 1, padding: '12px', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s',
                                border: `2px solid ${selectedCurrency === ccy.currency ? C.primary : 'var(--border)'}`,
                                background: selectedCurrency === ccy.currency ? 'rgba(6,163,218,0.1)' : 'var(--bg-2)',
                                color: selectedCurrency === ccy.currency ? C.primary : 'var(--text)',
                            }}>{ccy.label || ccy.currency}</button>
                        ))}
                    </div>
                </FlowSection>

                {/* 3. Amount */}
                <FlowSection title="Amount" accent={C.primary} show={currencyReady} done={amountReady} summary={amountReady ? formatAmount(getFinalAmount(), selectedCurrency) : ''}>
                    <Field label={`Amount (${selectedCurrency})`}>
                        <input
                            value={customAmt} onChange={e => { setCustomAmt(e.target.value); setAmountCents(null); }}
                            placeholder={`Min ${formatAmount(minCents, selectedCurrency)} · Max ${formatAmount(maxCents, selectedCurrency)}`}
                            style={{ width: '100%', padding: '14px 16px', borderRadius: 12, fontSize: 15, border: '1.5px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', outline: 'none' }}
                        />
                    </Field>
                </FlowSection>

                {/* 4. Payment method */}
                <FlowSection title="Pay with" accent={C.primary} show={amountReady}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
                        {paymentMethods.map(m => (
                            <button key={m.code} onClick={() => setPaymentMethod(m.code)} style={{
                                padding: '12px 8px', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 56,
                                border: paymentMethod === m.code ? `2px solid ${C.primary}` : '2px solid var(--border)',
                                background: paymentMethod === m.code ? 'rgba(6,163,218,0.08)' : 'var(--bg-2)', color: 'var(--text)',
                            }}>
                                <span style={{ fontWeight: 700, fontSize: 12.5, lineHeight: 1.25 }}>{m.name}</span>
                                {paymentMethod === m.code && <span style={{ color: C.primary, fontSize: 12 }}>✓</span>}
                            </button>
                        ))}
                    </div>
                    <Field label={getPaymentFieldLabel()}>
                        <PhoneInput
                            value={paymentIdentifier}
                            onChange={v => setPaymentIdentifier(v)}
                            placeholder={getPaymentFieldPlaceholder()}
                        />
                    </Field>
                    {paymentMethod === 'WALLET' && <WalletPin value={walletPin} onChange={setWalletPin} />}
                </FlowSection>

                {/* In-flow Confirm and Pay button — not a floating footer */}
                <button onClick={() => setConfirmOpen(true)} disabled={!canPay || loading} style={{
                    width: '100%', padding: '16px 28px', borderRadius: 12, fontSize: 15.5, fontWeight: 700, marginTop: 6,
                    background: (canPay && !loading) ? `linear-gradient(135deg, ${C.green}, #2a9444)` : '#ccc',
                    color: 'white', border: 'none', cursor: (canPay && !loading) ? 'pointer' : 'not-allowed',
                    boxShadow: (canPay && !loading) ? '0 4px 16px rgba(52,173,84,0.35)' : 'none',
                }}>
                    {loading ? '⏳ Processing...' : 'Confirm and Pay'}
                </button>
            </div>

            <ConfirmModal
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleSubmit}
                loading={loading}
                total={formatAmount(displayAmt, selectedCurrency || 'USD')}
                rows={[
                    ['Service', network?.networkName ? `${network.networkName} Airtime` : 'Airtime'],
                    ['Recipient', finalRecipient],
                    ['Payment via', pm?.name || paymentMethod],
                    [getPaymentFieldLabel(), normalizePhone(paymentIdentifier)],
                ]}
            />
        </div>
    );
}

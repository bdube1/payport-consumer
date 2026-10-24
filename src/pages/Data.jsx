import { useAuth } from '../lib/AuthContext';
import { BackBar } from '../components/shell/AppShell';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsApi, startPayment, paymentError, normalizePhone, generateReference, formatAmount, BASE, visibleMethods } from '../lib/api';
import WalletPin from '../components/flow/WalletPin';
import FlowSection from '../components/flow/FlowSection';
import ConfirmModal from '../components/flow/ConfirmModal';
import { useCharge, methodLabel } from '../lib/charges';

const PAYMENT_METHODS = [
    { code: 'ECOCASH', name: 'EcoCash' },
    { code: 'ONEMONEY', name: 'OneMoney' },
    { code: 'ZIMSWITCH', name: 'ZimSwitch' },
    { code: 'VISA', name: 'Visa' },
    { code: 'MASTERCARD', name: 'Mastercard' },
];

const NETWORK_COLORS = { ECONET: '#1d4ed8', NETONE: '#f59e0b', TELECEL: '#dc2626' };
const getNetworkIcon = (code) => ({ ECONET: '📱', NETONE: '📡', TELECEL: '📞' }[code] || '📡');
const MOBILE_MONEY = ['ECOCASH', 'ONEMONEY', 'TELECASH', 'OMARI'];

// Local Section wrapper removed — using shared FlowSection (collapsible) instead.


export default function Data() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [network, setNetwork] = useState('ECONET');
    const [networks, setNetworks] = useState([]);
    const [networkLogo, setNetworkLogo] = useState(null);
    const [bundles, setBundles] = useState([]);
    const [filteredBundles, setFilteredBundles] = useState([]);
    const [bundle, setBundle] = useState(null);
    const [recipientPhone, setRecipientPhone] = useState('');
    const [detectedNetwork, setDetectedNetwork] = useState(null);
    const [networkLoading, setNetworkLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('ECOCASH');
    const [paymentIdentifier, setPaymentIdentifier] = useState('');
    const [paymentIdentifierTouched, setPaymentIdentifierTouched] = useState(false);
    const [loading, setLoading] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [bundlesLoading, setBundlesLoading] = useState(false);
    const [error, setError] = useState('');
    const [currencies, setCurrencies] = useState([]);
    const [selectedCurrency, setSelectedCurrency] = useState('');
    const [productsData, setProductsData] = useState([]);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [walletPin, setWalletPin] = useState('');
    const [isValidRecipient, setIsValidRecipient] = useState(false);
    const [logoError, setLogoError] = useState({});
    const [cacheBuster] = useState(Date.now());
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await productsApi.getAll();
                const products = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
                setProductsData(products);

                const activeNetworks = products
                    .filter(p => p.category === 'DATA' && p.isActive === true)
                    .map(p => {
                        const code = p.code.replace('DATA_', '');
                        return {
                            code, name: p.name, color: NETWORK_COLORS[code] || '#06A3DA',
                            logoUrl: p.logoUrl,
                            fullLogoUrl: p.logoUrl ? `${BASE}${p.logoUrl}?t=${cacheBuster}` : null,
                            enabledCurrencies: p.enabledCurrencies || [],
                        };
                    });
                const order = ['ECONET', 'NETONE', 'TELECEL'];
                activeNetworks.sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code));
                setNetworks(activeNetworks);
                if (activeNetworks.length > 0) updateCurrenciesForNetwork(network, products);
            } catch (err) { console.error('Failed to load products:', err); }
        };
        fetchProducts();

        productsApi.getPaymentMethods().then(r => {
            const methods = visibleMethods(r.data.data || r.data || []).filter(pm => pm.isActive === true).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
            setPaymentMethods(methods.length > 0 ? methods : PAYMENT_METHODS);
            if (methods.length > 0) setPaymentMethod(methods[0].code);
        }).catch(() => setPaymentMethods(PAYMENT_METHODS));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (productsData.length > 0) {
            updateCurrenciesForNetwork(network, productsData);
            setRecipientPhone(''); setDetectedNetwork(null); setIsValidRecipient(false);
            setBundle(null); setSelectedCategory(''); setCategories([]);
        }
        const current = networks.find(n => n.code === network);
        setNetworkLogo(current?.logoUrl ? `${BASE}${current.logoUrl}?t=${cacheBuster}` : null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [network, productsData]);

    useEffect(() => {
        const t = setTimeout(async () => {
            const normalized = normalizePhone(recipientPhone);
            if (normalized.length < 12) { setDetectedNetwork(null); setIsValidRecipient(false); return; }
            setNetworkLoading(true);
            try {
                const r = await productsApi.detectNetwork(normalized);
                const detected = r.data.data || r.data;
                setDetectedNetwork(detected);
                if (detected?.networkCode === network) { setIsValidRecipient(true); setError(''); }
                else {
                    setIsValidRecipient(false);
                    if (detected) setError(`This number belongs to ${detected.networkName}. Select ${detected.networkName} above.`);
                }
            } catch { setDetectedNetwork(null); setIsValidRecipient(false); }
            finally { setNetworkLoading(false); }
        }, 450);
        return () => clearTimeout(t);
    }, [recipientPhone, network]);

    const updateCurrenciesForNetwork = (selectedNetwork, products) => {
        const product = products.find(p => p.code === `DATA_${selectedNetwork}`);
        const enabled = product?.enabledCurrencies || [];
        setCurrencies(enabled);
        setSelectedCurrency(enabled.length === 1 ? enabled[0].currency : '');
    };

    // Bundle fetch — now routed through the shared, authenticated api client
    // (this used to hit a hardcoded IP over plain HTTP directly with axios).
    useEffect(() => {
        const fetchBundles = async () => {
            if (!network || !selectedCurrency || !isValidRecipient) { setBundles([]); return; }
            setBundlesLoading(true);
            try {
                const response = await productsApi.getBundles(network, selectedCurrency);
                const bundleData = response.data || [];
                const formatted = (Array.isArray(bundleData) ? bundleData : []).map(b => ({
                    name: b.bundleName || b.name,
                    amountCents: Math.round((b.priceValue || b.amountCents || 0) * 100),
                    bundleCode: b.bundleCode || b.code,
                    category: b.category || 'Data Bundles',
                }));
                setBundles(formatted);
                const uniqueCategories = [...new Set(formatted.map(b => b.category))].filter(Boolean);
                setCategories(uniqueCategories);
                if (uniqueCategories.length > 0 && !selectedCategory) setSelectedCategory(uniqueCategories[0]);
                setError(formatted.length === 0 ? `No bundles available for ${network}` : '');
            } catch (err) {
                setBundles([]);
                setError(err.response?.status === 404 ? `No bundles available for ${network}` : 'Failed to load bundles. Please try again.');
            } finally { setBundlesLoading(false); }
        };
        fetchBundles();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [network, selectedCurrency, isValidRecipient]);

    useEffect(() => {
        if (bundles.length === 0) { setFilteredBundles([]); return; }
        if (selectedCategory && selectedCategory !== 'All Bundles') {
            const filtered = bundles.filter(b => b.category === selectedCategory);
            setFilteredBundles(filtered);
            if (bundle && !filtered.find(b => b.bundleCode === bundle.bundleCode)) setBundle(null);
        } else setFilteredBundles(bundles);
    }, [bundles, selectedCategory, bundle]);

    useEffect(() => {
        if (paymentIdentifierTouched) return;
        if (MOBILE_MONEY.includes(paymentMethod) && recipientPhone && isValidRecipient) {
            setPaymentIdentifier(recipientPhone);
        }
    }, [paymentMethod, recipientPhone, isValidRecipient, paymentIdentifierTouched]);

    const getPaymentFieldLabel = () => MOBILE_MONEY.includes(paymentMethod) ? 'Payment wallet number' : 'Cardholder mobile number';
    const getPaymentFieldPlaceholder = () => MOBILE_MONEY.includes(paymentMethod) ? 'Wallet number for USSD prompt' : 'Mobile number for verification';

    const canPay = isValidRecipient && !!bundle && !!paymentMethod && normalizePhone(paymentIdentifier).length >= 12 && (paymentMethod !== 'WALLET' || walletPin.length >= 4);

    const handlePay = async () => {
        if (!canPay) return;
        setLoading(true); setError('');
        const ref = generateReference('WEB');
        const recipient = normalizePhone(recipientPhone);
        const payIdentifier = normalizePhone(paymentIdentifier);
        try {
            await startPayment({
                reference: ref, productTypeCode: `DATA_${network}`, recipientIdentifier: recipient,
                amountCents: bundle.amountCents, currency: selectedCurrency, customerPhone: payIdentifier, channel: 'WEB',
            }, { paymentMethodCode: paymentMethod, customerPhone: payIdentifier, pin: walletPin });
            navigate(`/processing/${ref}`);
        } catch (e) {
            setConfirmOpen(false);
            const pe = paymentError(e, 'Transaction failed');
            setError(pe.providerUnavailable ? `${pe.message} You can choose another payment method below.` : pe.message); setLoading(false);
        }
    };

    const pm = paymentMethods.find(m => m.code === paymentMethod);

    const quote = useCharge(network ? `DATA_${network}` : null, selectedCurrency || 'USD', bundle?.amountCents || 0);
    return (
        <div style={user ? { maxWidth: 820 } : { maxWidth: 560, margin: '0 auto', padding: '24px 20px 40px' }}>
            {user ? <BackBar title="Data" /> : <>
            <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 18, padding: 0 }}>← Back</button>

            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Buy Data</h1>
            <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 28 }}>Fill in the details below — you'll pay once everything's set.</p>
            </>}

            <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: '28px 26px', boxShadow: '0 4px 24px rgba(9,30,62,0.06)', border: '1px solid rgba(6,163,218,0.12)' }}>
                {error && (
                    <div style={{ background: 'var(--danger-bg)', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#dc2626', fontSize: 14 }}>⚠️ {error}</div>
                )}

                {/* 1. Network + currency */}
                <FlowSection title="Network" accent="#06A3DA" done={!!selectedCurrency} summary={networks.find(n => n.code === network)?.name + (selectedCurrency ? ` · ${selectedCurrency}` : '')}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: currencies.length > 1 ? 18 : 0 }}>
                        {networks.map(n => {
                            const showLogo = n.fullLogoUrl && !logoError[n.code];
                            return (
                                <div key={n.code} onClick={() => setNetwork(n.code)} style={{
                                    padding: '18px 10px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', minHeight: 96,
                                    border: `2px solid ${network === n.code ? n.color : 'rgba(6,163,218,0.15)'}`, borderRadius: 14,
                                    background: network === n.code ? `${n.color}12` : 'var(--bg-card)',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {showLogo ? (
                                        <img src={n.fullLogoUrl} alt={n.name} style={{ width: 44, height: 44, objectFit: 'contain', marginBottom: 6 }} onError={() => setLogoError(p => ({ ...p, [n.code]: true }))} />
                                    ) : (
                                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${n.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 6 }}>{getNetworkIcon(n.code)}</div>
                                    )}
                                    <span style={{ fontSize: 12, fontWeight: 700, color: network === n.code ? n.color : 'var(--text)' }}>{n.name}</span>
                                </div>
                            );
                        })}
                    </div>

                    {currencies.length > 1 && (
                        <div style={{ display: 'flex', gap: 10 }}>
                            {currencies.map(ccy => (
                                <button key={ccy.currency} onClick={() => setSelectedCurrency(ccy.currency)} style={{
                                    flex: 1, padding: '12px', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer',
                                    border: `2px solid ${selectedCurrency === ccy.currency ? '#06A3DA' : 'rgba(6,163,218,0.2)'}`,
                                    background: selectedCurrency === ccy.currency ? 'rgba(6,163,218,0.1)' : 'var(--bg-card)',
                                    color: selectedCurrency === ccy.currency ? '#06A3DA' : 'var(--text-2)',
                                }}>{ccy.label || ccy.currency}</button>
                            ))}
                        </div>
                    )}
                </FlowSection>

                {/* 2. Recipient */}
                <FlowSection title="Recipient number" accent="#06A3DA" show={!!selectedCurrency} done={isValidRecipient} summary={isValidRecipient ? normalizePhone(recipientPhone) : ''}>
                    <div style={{ display: 'flex', border: `2px solid ${isValidRecipient ? 'rgba(52,173,84,0.5)' : detectedNetwork && !isValidRecipient ? '#dc2626' : 'rgba(6,163,218,0.2)'}`, borderRadius: 12, overflow: 'hidden', background: 'var(--light)' }}>
                        <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg, #06A3DA, #0487b8)', color: 'white', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>🇿🇼 +263</div>
                        <input value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} placeholder="077 123 4567" style={{ flex: 1, padding: '14px 16px', border: 'none', background: 'transparent', fontSize: 15, outline: 'none' }} />
                        {networkLoading && <div style={{ padding: '14px 16px' }}><div style={{ width: 20, height: 20, border: '2px solid rgba(6,163,218,0.2)', borderTop: '2px solid #06A3DA', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /></div>}
                        {!networkLoading && detectedNetwork && isValidRecipient && <div style={{ padding: '14px 16px', color: '#34AD54' }}>✓</div>}
                        {!networkLoading && detectedNetwork && !isValidRecipient && <div style={{ padding: '14px 16px', color: '#dc2626' }}>✗</div>}
                    </div>
                </FlowSection>

                {/* 3. Bundle */}
                <FlowSection title="Choose a bundle" accent="#06A3DA" show={isValidRecipient} done={!!bundle} summary={bundle ? `${bundle.name} · ${formatAmount(bundle.amountCents, selectedCurrency)}` : ''}>
                    {categories.length > 1 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                            {categories.map(cat => (
                                <button key={cat} onClick={() => { setSelectedCategory(cat); setBundle(null); }} style={{
                                    padding: '7px 14px', borderRadius: 20, fontSize: 12.5, cursor: 'pointer',
                                    border: `1px solid ${selectedCategory === cat ? '#06A3DA' : 'rgba(6,163,218,0.2)'}`,
                                    background: selectedCategory === cat ? 'rgba(6,163,218,0.1)' : 'var(--bg-card)',
                                    color: selectedCategory === cat ? '#06A3DA' : 'var(--text-2)', fontWeight: selectedCategory === cat ? 700 : 500,
                                }}>{cat}</button>
                            ))}
                        </div>
                    )}
                    {bundlesLoading ? (
                        <div style={{ textAlign: 'center', padding: 20 }}>
                            <div style={{ width: 26, height: 26, border: '2px solid rgba(6,163,218,0.2)', borderTop: '2px solid #06A3DA', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 8px' }} />
                            <p style={{ color: 'var(--text-2)', fontSize: 13 }}>Loading bundles...</p>
                        </div>
                    ) : filteredBundles.length === 0 ? (
                        <div style={{ padding: 18, background: '#fff3cd', color: '#856404', borderRadius: 8, textAlign: 'center', fontSize: 13.5 }}>No bundles available</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                            {filteredBundles.map((b, i) => (
                                <div key={b.bundleCode || i} onClick={() => setBundle(b)} style={{
                                    padding: '13px 16px', borderRadius: 10, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    border: `2px solid ${bundle?.bundleCode === b.bundleCode ? '#06A3DA' : 'rgba(6,163,218,0.12)'}`,
                                    background: bundle?.bundleCode === b.bundleCode ? 'rgba(6,163,218,0.06)' : 'var(--bg-card)',
                                }}>
                                    <span style={{ fontWeight: bundle?.bundleCode === b.bundleCode ? 700 : 500, color: bundle?.bundleCode === b.bundleCode ? '#06A3DA' : 'var(--text)', fontSize: 14 }}>{b.name}</span>
                                    <span style={{ fontWeight: 700, color: bundle?.bundleCode === b.bundleCode ? '#06A3DA' : 'var(--text)', fontSize: 14 }}>{formatAmount(b.amountCents, selectedCurrency)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </FlowSection>

                {/* 4. Payment */}
                <FlowSection title="Pay with" accent="#06A3DA" show={isValidRecipient && !!bundle}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
                        {paymentMethods.map(m => (
                            <button key={m.code} onClick={() => setPaymentMethod(m.code)} style={{
                                padding: '12px 8px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 56,
                                border: `2px solid ${paymentMethod === m.code ? '#06A3DA' : 'rgba(6,163,218,0.15)'}`,
                                background: paymentMethod === m.code ? 'rgba(6,163,218,0.08)' : 'var(--bg-card)', color: 'var(--text)',
                            }}>
                                <span style={{ fontWeight: 700, fontSize: 12.5, lineHeight: 1.25 }}>{methodLabel(m)}</span>
                                {paymentMethod === m.code && <span style={{ color: '#06A3DA', fontSize: 12 }}>✓</span>}
                            </button>
                        ))}
                    </div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{getPaymentFieldLabel()}</label>
                    <div style={{ display: 'flex', border: '2px solid rgba(6,163,218,0.2)', borderRadius: 12, overflow: 'hidden', background: 'var(--light)' }}>
                        <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg, #06A3DA, #0487b8)', color: 'white', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>🇿🇼 +263</div>
                        <input value={paymentIdentifier} onChange={e => { setPaymentIdentifierTouched(true); setPaymentIdentifier(e.target.value); }} placeholder={getPaymentFieldPlaceholder()} style={{ flex: 1, padding: '14px 16px', border: 'none', background: 'transparent', fontSize: 15, outline: 'none' }} />
                    </div>
                    {paymentMethod === 'WALLET' && <WalletPin value={walletPin} onChange={setWalletPin} />}
                </FlowSection>

                {/* In-flow Confirm and Pay button — not a floating footer */}
                <button onClick={() => setConfirmOpen(true)} disabled={!canPay || loading} style={{
                    width: '100%', padding: '16px 28px', borderRadius: 12, fontSize: 15.5, fontWeight: 700, marginTop: 6,
                    background: (canPay && !loading) ? 'linear-gradient(135deg, #34AD54, #2a9444)' : '#ccc', color: 'white', border: 'none',
                    cursor: (canPay && !loading) ? 'pointer' : 'not-allowed', boxShadow: (canPay && !loading) ? '0 4px 16px rgba(52,173,84,0.35)' : 'none',
                }}>
                    {loading ? '⏳ Processing...' : 'Confirm and Pay'}
                </button>
            </div>

            <ConfirmModal
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handlePay}
                loading={loading}
                total={quote ? formatAmount(quote.totalCents, selectedCurrency || 'USD') : formatAmount(bundle?.amountCents || 0, selectedCurrency || 'USD')}
                rows={[
                    ['Bundle', bundle?.name],
                    ['Network', network],
                    ['Recipient', normalizePhone(recipientPhone)],
                    ['Payment via', methodLabel(pm) || paymentMethod],
                    [getPaymentFieldLabel(), normalizePhone(paymentIdentifier)],
                ]}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

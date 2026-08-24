import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsApi, normalizePhone } from '../lib/api';

export default function Home() {
    const navigate = useNavigate();
    const [quickPhone, setQuickPhone] = useState('');
    const [quickAmount, setQuickAmount] = useState('');
    const [quickNetwork, setQuickNetwork] = useState(null);
    const [quickNetLoading, setQuickNetLoading] = useState(false);
    const [availableCurrencies, setAvailableCurrencies] = useState([]);
    const [selectedCurrency, setSelectedCurrency] = useState('');
    const [showCurrencySelector, setShowCurrencySelector] = useState(false);
    const debounceRef = useRef(null);

    // Auto-detect network as user types
    useEffect(() => {
        clearTimeout(debounceRef.current);
        setQuickNetwork(null);
        setAvailableCurrencies([]);
        setSelectedCurrency('');
        setShowCurrencySelector(false);

        const normalized = normalizePhone(quickPhone);
        if (normalized.length < 12) return;

        debounceRef.current = setTimeout(async () => {
            setQuickNetLoading(true);
            try {
                const r = await productsApi.detectNetwork(normalized);
                const networkData = r.data.data || r.data;
                setQuickNetwork(networkData);

                // Fetch product currencies for this network
                if (networkData?.networkCode) {
                    const productsRes = await productsApi.getAll();
                    const products = productsRes.data.data || productsRes.data || [];
                    const airtimeProduct = products.find(p => p.code === `AIRTIME_${networkData.networkCode}`);

                    if (airtimeProduct?.enabledCurrencies) {
                        const activeCurrencies = airtimeProduct.enabledCurrencies.filter(c => c.isActive !== false);
                        setAvailableCurrencies(activeCurrencies);

                        // Scenario 1: Single currency - auto-select
                        if (activeCurrencies.length === 1) {
                            setSelectedCurrency(activeCurrencies[0].currency);
                            setShowCurrencySelector(false);
                        }
                        // Scenario 2: Multiple currencies - show selector
                        else if (activeCurrencies.length > 1) {
                            setShowCurrencySelector(true);
                        }
                    }
                }
            } catch {
                setQuickNetwork(null);
            } finally {
                setQuickNetLoading(false);
            }
        }, 450);
    }, [quickPhone]);

    const handleQuickContinue = () => {
        const normalized = normalizePhone(quickPhone);

        // Validate
        if (!quickNetwork) {
            alert('Please enter a valid Zimbabwe phone number');
            return;
        }

        // Validate amount is entered
        if (!quickAmount || quickAmount.trim() === '') {
            alert('Please enter an amount');
            return;
        }

        // For multiple currencies, ensure one is selected
        if (availableCurrencies.length > 1 && !selectedCurrency) {
            alert('Please select a currency');
            return;
        }

        // Determine the currency to use
        let currencyToUse = 'USD'; // Default fallback

        if (selectedCurrency) {
            // User explicitly selected a currency
            currencyToUse = selectedCurrency;
        } else if (availableCurrencies.length === 1) {
            // Auto-selected single currency
            currencyToUse = availableCurrencies[0].currency;
        }

        console.log('Quick Airtime - Selected currency:', currencyToUse); // For debugging

        navigate('/airtime', {
            state: {
                phone: normalized,
                amount: quickAmount,
                currency: currencyToUse, // Pass the correctly selected currency
                network: quickNetwork,
                skipToPayment: true,
            }
        });
    };

    // Helper to get currency symbol for display
    const getCurrencySymbol = (currency) => {
        if (currency === 'USD') return '$';
        if (currency === 'ZWG' || currency === 'ZWL') return 'ZiG';
        return currency;
    };

    return (
        <div>
            {/* ===== HERO ===== */}
            <section style={{
                minHeight: '100vh',
                background: 'linear-gradient(160deg, #0B1024, #0E1430)',
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
                position: 'relative', overflow: 'hidden',
            }}>
                {/* Background orbs */}
                <div style={{
                    position: 'absolute', top: '10%', right: '-10%',
                    width: 600, height: 600, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(6,163,218,0.15) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', bottom: '-5%', left: '-10%',
                    width: 500, height: 500, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(52,173,84,0.08) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />

                {/* Grid pattern */}
                <div style={{
                    position: 'absolute', inset: 0, opacity: 0.03,
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '48px 48px',
                    pointerEvents: 'none',
                }} />

                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '120px 24px 80px', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
                        {/* Left */}
                        <div style={{ animation: 'slide-up 0.6s ease both' }}>
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                background: 'rgba(6,163,218,0.12)', border: '1px solid rgba(6,163,218,0.25)',
                                padding: '6px 16px', borderRadius: 100, marginBottom: 28,
                            }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34AD54', display: 'inline-block', boxShadow: '0 0 6px #34AD54', animation: 'pulse-glow 2s infinite' }} />
                                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 500 }}>Live · All systems operational</span>
                            </div>

                            <h1 style={{
                                fontSize: 'clamp(40px, 5vw, 64px)',
                                fontWeight: 800,
                                color: 'white',
                                lineHeight: 1.1,
                                letterSpacing: '-0.03em',
                                marginBottom: 24,
                            }}>
                                Top up{' '}
                                <span style={{
                                    background: 'linear-gradient(135deg, #06A3DA, #38bae8)',
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                }}>anyone</span>,{' '}
                                <br />anywhere,{' '}
                                <span style={{
                                    background: 'linear-gradient(135deg, #34AD54, #4fcf6f)',
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                }}>anytime</span>.
                            </h1>

                            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 18, lineHeight: 1.7, marginBottom: 36, maxWidth: 480 }}>
                                Zimbabwe's fastest way to recharge airtime, buy data bundles and pay your bills. No account required — just enter a number and go.
                            </p>

                            <div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Pay with</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 22 }}>
                                    <img src="/images/logos/ecocash.png" alt="EcoCash" style={{ height: 34, width: 'auto' }} />
                                    <img src="/images/logos/onemoney.png" alt="OneMoney" style={{ height: 34, width: 'auto' }} />
                                    <img src="/images/logos/omari.png" alt="Omari" style={{ height: 34, width: 'auto' }} />
                                    <img src="/images/logos/innbucks.png" alt="InnBucks" style={{ height: 34, width: 'auto' }} />
                                    <img src="/images/logos/zimswitch.png" alt="ZimSwitch" style={{ height: 30, width: 'auto' }} />
                                    <img src="/images/logos/visa-mastercard.png" alt="Visa and Mastercard" style={{ height: 30, width: 'auto' }} />
                                    <img src="/images/logos/unionpay.png" alt="UnionPay" style={{ height: 30, width: 'auto' }} />
                                </div>
                            </div>
                        </div>

                        {/* Right — Quick action card */}
                        <div style={{ animation: 'slide-up 0.7s ease 0.1s both' }}>
                            <div style={{
                                background: 'rgba(255,255,255,0.04)',
                                border: '1.5px solid rgba(6,163,218,0.2)',
                                borderRadius: 24,
                                padding: 32,
                                backdropFilter: 'blur(20px)',
                            }}>
                                <h3 style={{ color: 'white', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Quick Airtime</h3>
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 24 }}>Enter a number to buy airtime instantly</p>

                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Mobile Number</label>
                                    <div style={{
                                        display: 'flex',
                                        border: `1.5px solid ${quickNetwork ? 'rgba(52,173,84,0.5)' : 'rgba(6,163,218,0.25)'}`,
                                        borderRadius: 12, overflow: 'hidden',
                                        background: 'rgba(255,255,255,0.04)',
                                        transition: 'border-color 0.3s',
                                    }}>
                                        <div style={{ padding: '14px 14px', background: 'rgba(6,163,218,0.2)', color: '#38bae8', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center' }}>
                                            🇿🇼 +263
                                        </div>
                                        <input
                                            value={quickPhone}
                                            onChange={e => setQuickPhone(e.target.value)}
                                            placeholder="077 123 4567"
                                            style={{ flex: 1, padding: '14px 14px', background: 'transparent', border: 'none', color: 'white', fontSize: 15, outline: 'none' }}
                                        />
                                        {/* Spinner or network tick inside the input */}
                                        {quickNetLoading && (
                                            <div style={{ padding: '14px 12px', display: 'flex', alignItems: 'center' }}>
                                                <div style={{ width: 16, height: 16, border: '2px solid rgba(6,163,218,0.2)', borderTop: '2px solid #06A3DA', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                                            </div>
                                        )}
                                        {quickNetwork && !quickNetLoading && (
                                            <div style={{ padding: '14px 12px', display: 'flex', alignItems: 'center' }}>
                                                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#34AD54', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'white', fontWeight: 800 }}>✓</div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Network detected label */}
                                    {quickNetwork && !quickNetLoading && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34AD54', display: 'inline-block' }} />
                                            <span style={{ color: '#4fcf6f', fontSize: 13, fontWeight: 600 }}>{quickNetwork.networkName} detected</span>
                                        </div>
                                    )}

                                    {/* Currency selector - only shown for multiple currencies */}
                                    {showCurrencySelector && availableCurrencies.length > 1 && (
                                        <div style={{ marginTop: 16 }}>
                                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                                                Select currency <span style={{ color: '#dc2626' }}>*</span>
                                            </label>
                                            <div style={{ display: 'flex', gap: 10 }}>
                                                {availableCurrencies.map(ccy => {
                                                    const displaySymbol = getCurrencySymbol(ccy.currency);
                                                    return (
                                                        <button
                                                            key={ccy.currency}
                                                            onClick={() => setSelectedCurrency(ccy.currency)}
                                                            style={{
                                                                flex: 1,
                                                                padding: '10px',
                                                                borderRadius: 8,
                                                                border: `1.5px solid ${selectedCurrency === ccy.currency ? '#06A3DA' : 'rgba(6,163,218,0.2)'}`,
                                                                background: selectedCurrency === ccy.currency ? 'rgba(6,163,218,0.15)' : 'transparent',
                                                                color: selectedCurrency === ccy.currency ? '#38bae8' : 'rgba(255,255,255,0.6)',
                                                                fontWeight: 600,
                                                                fontSize: 13,
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                            }}
                                                        >
                                                            {displaySymbol} {ccy.currency}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                            {!selectedCurrency && (
                                                <p style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>
                                                    Please select a currency
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Amount selection - show only when currency is selected (for multi) or auto-selected (for single) */}
                                {((availableCurrencies.length === 1 && (selectedCurrency || availableCurrencies[0])) ||
                                    (availableCurrencies.length > 1 && selectedCurrency) ||
                                    (availableCurrencies.length === 0 && quickNetwork)) && (
                                    <div style={{ marginBottom: 24 }}>
                                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                                            Amount
                                        </label>
                                        <input
                                            value={quickAmount}
                                            onChange={e => setQuickAmount(e.target.value)}
                                            placeholder="Enter amount"
                                            style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(6,163,218,0.2)', borderRadius: 10, color: 'white', fontSize: 14, outline: 'none' }}
                                        />
                                    </div>
                                )}

                                <button
                                    onClick={handleQuickContinue}
                                    disabled={!quickNetwork || !quickAmount || (availableCurrencies.length > 1 && !selectedCurrency)}
                                    style={{
                                        width: '100%', padding: '16px',
                                        background: (!quickNetwork || !quickAmount || (availableCurrencies.length > 1 && !selectedCurrency)) ? '#4a5568' : 'linear-gradient(135deg, #06A3DA, #0487b8)',
                                        color: 'white', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700,
                                        cursor: (!quickNetwork || !quickAmount || (availableCurrencies.length > 1 && !selectedCurrency)) ? 'not-allowed' : 'pointer',
                                        boxShadow: (!quickNetwork || !quickAmount || (availableCurrencies.length > 1 && !selectedCurrency)) ? 'none' : '0 4px 20px rgba(6,163,218,0.3)',
                                        transition: 'all 0.2s',
                                        opacity: (!quickNetwork || !quickAmount || (availableCurrencies.length > 1 && !selectedCurrency)) ? 0.5 : 1,
                                    }}
                                    onMouseEnter={e => {
                                        if (!(!quickNetwork || !quickAmount || (availableCurrencies.length > 1 && !selectedCurrency))) {
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.transform = 'none';
                                    }}
                                >
                                    Continue →
                                </button>
                                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 12 }}>
                                    No account required · Guest checkout available
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <style>{`
        @keyframes slide-up { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 0 0 rgba(52,173,84,0.5); } 50% { box-shadow: 0 0 0 6px rgba(52,173,84,0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
        </div>
    );
}
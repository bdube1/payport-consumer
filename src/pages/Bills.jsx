import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { productsApi, billersApi, startPayment, paymentError, normalizePhone, generateReference, formatAmount, BASE } from '../lib/api';
import { getFallbackIcon, getBillerColor, getFieldName, getMerchantCode } from '../lib/billers';
import FlowSection from '../components/flow/FlowSection';
import ConfirmModal from '../components/flow/ConfirmModal';

const PAYMENT_METHODS = [
    { code: 'ECOCASH', name: 'EcoCash' }, { code: 'ONEMONEY', name: 'OneMoney' },
    { code: 'ZIMSWITCH', name: 'ZimSwitch' }, { code: 'VISA', name: 'Visa' }, { code: 'MASTERCARD', name: 'Mastercard' },
];
const MOBILE_MONEY = ['ECOCASH', 'ONEMONEY', 'TELECASH', 'OMARI'];

// Local Section wrapper removed — using shared FlowSection (collapsible) instead.


export default function Bills() {
    const navigate = useNavigate();
    const location = useLocation();
    const [billers, setBillers] = useState([]);
    const [biller, setBiller] = useState(null);
    const [account, setAccount] = useState('');
    const [accountName, setAccountName] = useState('');
    const [amount, setAmount] = useState('');
    const [phone, setPhone] = useState('');
    const [phoneTouched, setPhoneTouched] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('ECOCASH');
    const [loading, setLoading] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [error, setError] = useState('');
    const [logoError, setLogoError] = useState({});

    const [availableCurrencies, setAvailableCurrencies] = useState(['USD']);
    const [selectedCurrency, setSelectedCurrency] = useState('USD');
    const [paymentMethods, setPaymentMethods] = useState([]);

    const [products, setProducts] = useState([]);
    const [minAmount, setMinAmount] = useState(1);
    const [maxAmount, setMaxAmount] = useState(5000);
    const [amountError, setAmountError] = useState('');

    const [validatingAccount, setValidatingAccount] = useState(false);
    const [nyaradzoInfo, setNyaradzoInfo] = useState(null);
    const [selectedMonths, setSelectedMonths] = useState(1);
    const [zesaInfo, setZesaInfo] = useState(null);
    const [cacheBuster] = useState(Date.now());
    const [catalogue, setCatalogue] = useState({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const productsRes = await productsApi.getAll();
                const allProducts = productsRes.data.data || productsRes.data || [];
                setProducts(allProducts);

                const activeBillers = allProducts
                    .filter(p => p.category === 'BILLS' && p.isActive === true)
                    .map(p => {
                        const merchantCode = getMerchantCode(p.code);
                        return {
                            code: merchantCode, name: p.name, color: getBillerColor(merchantCode),
                            fullLogoUrl: p.logoUrl ? `${BASE}${p.logoUrl}?t=${cacheBuster}` : null,
                            field: getFieldName(merchantCode), productCode: p.code,
                            enabledCurrencies: p.enabledCurrencies || [],
                            minAmountCents: p.minAmountCents || 100, maxAmountCents: p.maxAmountCents || 500000,
                        };
                    });
                setBillers(activeBillers);

                // Hand-off from a saved beneficiary — prefill biller + account once the real list has loaded.
                if (location.state?.billerCode) {
                    const match = activeBillers.find(b => b.code === location.state.billerCode);
                    if (match) {
                        setBiller(match);
                        if (location.state.accountRef) setAccount(location.state.accountRef);
                    }
                }

                try {
                    const cat = await billersApi.catalogue();
                    const byCode = {};
                    (cat.data?.data || []).forEach(p => { byCode[p.code] = p; });
                    setCatalogue(byCode);
                } catch { /* lookup still works without the catalogue */ }

                const methodsRes = await productsApi.getPaymentMethods();
                const methods = (methodsRes.data.data || methodsRes.data || []).filter(pm => pm.isActive === true).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
                setPaymentMethods(methods.length > 0 ? methods : PAYMENT_METHODS);
                if (methods.length > 0) setPaymentMethod(methods[0].code);
            } catch (err) { console.error('Failed to load billers:', err); }
        };
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cacheBuster]);

    const calculateNyaradzoAmount = () => {
        if (!nyaradzoInfo) return 0;
        const balance = nyaradzoInfo.balanceCents / 100;
        const monthlyPremium = nyaradzoInfo.monthlyPremiumCents / 100;
        return balance + (selectedMonths * monthlyPremium);
    };

    const validateAmountValue = (amountValue, currency) => {
        const amt = parseFloat(amountValue);
        if (isNaN(amt) || amt <= 0) return { valid: false, message: `Please enter a valid amount in ${currency}` };
        if (amt < minAmount) return { valid: false, message: `Minimum amount is ${currency === 'USD' ? '$' : 'ZWG'}${minAmount.toFixed(2)} ${currency}` };
        if (amt > maxAmount) return { valid: false, message: `Maximum amount is ${currency === 'USD' ? '$' : 'ZWG'}${maxAmount.toFixed(2)} ${currency}` };
        return { valid: true, message: '' };
    };

    // Reset per-biller state when the biller changes.
    useEffect(() => {
        if (!biller) return;
        setAccountName(''); setNyaradzoInfo(null); setZesaInfo(null);
        setAccount(''); setError(''); setAmount(''); setAmountError('');

        if (biller.code === 'NYARADZO') { setAvailableCurrencies([]); setSelectedCurrency(''); return; }
        const product = products.find(p => p.code === biller.productCode);
        const active = product?.enabledCurrencies?.filter(c => c.isActive !== false).map(c => c.currency) || [];
        setAvailableCurrencies(active.length > 0 ? active : ['USD', 'ZWG']);
        setSelectedCurrency(active[0] || 'USD');
    }, [biller, products]);

    useEffect(() => {
        if (biller) {
            const product = products.find(p => p.code === biller.productCode);
            if (product) { setMinAmount((product.minAmountCents || 100) / 100); setMaxAmount((product.maxAmountCents || 500000) / 100); }
        }
    }, [biller, products, selectedCurrency]);

    useEffect(() => {
        if (amount && selectedCurrency && biller?.code !== 'NYARADZO') {
            setAmountError(validateAmountValue(amount, selectedCurrency).valid ? '' : validateAmountValue(amount, selectedCurrency).message);
        } else setAmountError('');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [amount, selectedCurrency, minAmount, maxAmount]);

    // Account verification: the biller catalogue's format check first (no network call for an
    // obviously wrong number), then the biller lookup. The server applies the same rules again
    // at /initiate, before the customer pays.
    const resetAccount = () => { setAccountName(''); setNyaradzoInfo(null); setZesaInfo(null); };

    const validateAccount = async (currencyToUse) => {
        if (!biller || !account || account.length < 5) {
            resetAccount(); setError(''); return;
        }
        const profile = catalogue[biller.code];
        const acct = account.trim().replace(/\s+/g, '');
        if (profile?.accountPattern) {
            let ok = true;
            try { ok = new RegExp(profile.accountPattern).test(acct); } catch { ok = true; }
            if (!ok) {
                resetAccount();
                setError(profile.accountHint || `Please check the ${profile.accountLabel || 'account number'}.`);
                return;
            }
        }
        setValidatingAccount(true); setError('');
        try {
            const r = await billersApi.lookup(biller.code, acct, currencyToUse || undefined, undefined);
            const a = r.data?.data || {};
            if (!a.payable) {
                resetAccount();
                setError(a.notPayableReason || 'This account cannot be paid right now.');
                return;
            }
            const d = a.details || {};
            const accepted = (a.acceptedCurrencies && a.acceptedCurrencies.length) ? a.acceptedCurrencies : [a.currency || 'USD'];
            if (biller.code === 'NYARADZO') {
                const ccy = a.currency || accepted[0];
                const status = d.policyStatus || '';
                setNyaradzoInfo({
                    holderName: a.holderName, currency: ccy, policyStatus: status,
                    isPolicyActive: !/laps|inactive|cancel/i.test(status),
                    balanceCents: Number(d.balanceMinor || 0), monthlyPremiumCents: Number(d.monthlyPremiumMinor || 0),
                });
                setZesaInfo(null);
                setAccountName(a.holderName || '');
                setSelectedCurrency(ccy); setAvailableCurrencies([ccy]);
            } else {
                setNyaradzoInfo(null);
                setZesaInfo(biller.code === 'ZESA' ? { meterNumber: a.accountNumber || acct, customerName: a.holderName, ...d } : null);
                setAccountName(a.holderName || '');
                setAvailableCurrencies(accepted);
                if (!accepted.includes(selectedCurrency)) setSelectedCurrency(accepted[0]);
            }
            if (!a.holderName) setError('Account found, but no name was returned. Check the number before paying.');
        } catch (err) {
            resetAccount();
            setError(err.response?.data?.message || 'Unable to validate account');
        } finally { setValidatingAccount(false); }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (account && account.length > 5 && biller && selectedCurrency) validateAccount(selectedCurrency);
            else if (account && account.length > 5 && biller?.code === 'NYARADZO') validateAccount('USD');
            else { setAccountName(''); setNyaradzoInfo(null); setZesaInfo(null); setError(''); }
        }, 700);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [account, biller]);

    useEffect(() => {
        if (biller && account && account.length > 5 && selectedCurrency && biller.code === 'ZESA') validateAccount(selectedCurrency);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCurrency]);

    useEffect(() => {
        if (biller?.code === 'NYARADZO' && nyaradzoInfo) setAmount(calculateNyaradzoAmount().toFixed(2));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMonths, nyaradzoInfo]);

    // Default the payment number to the account holder's own verified number where it makes sense.
    useEffect(() => {
        if (phoneTouched) return;
        if (MOBILE_MONEY.includes(paymentMethod) && account && accountName && /^(0|\+?263)/.test(account)) {
            setPhone(account);
        }
    }, [paymentMethod, account, accountName, phoneTouched]);

    const getPaymentFieldLabel = () => MOBILE_MONEY.includes(paymentMethod) ? 'Payment wallet number' : 'Cardholder mobile number';
    const getPaymentFieldPlaceholder = () => MOBILE_MONEY.includes(paymentMethod) ? 'Wallet number for USSD prompt' : 'Mobile number for verification';

    const isNyaradzo = biller?.code === 'NYARADZO';
    const accountVerified = !!accountName && !validatingAccount && !error;
    const amountReady = isNyaradzo ? !!nyaradzoInfo : (!!amount && !amountError && parseFloat(amount) > 0);
    const canPay = accountVerified && amountReady && !!paymentMethod && normalizePhone(phone).length >= 12;
    const totalAmount = isNyaradzo ? calculateNyaradzoAmount() : (parseFloat(amount) || 0);
    const totalCurrency = isNyaradzo ? (nyaradzoInfo?.currency || 'USD') : (selectedCurrency || 'USD');

    const handlePay = async () => {
        if (!canPay) return;
        setLoading(true); setError('');
        const ref = generateReference('WEB');
        const payPhone = normalizePhone(phone);
        const amtCents = Math.round(totalAmount * 100);
        try {
            await startPayment({
                reference: ref, productTypeCode: biller.productCode, recipientIdentifier: account,
                amountCents: amtCents, currency: totalCurrency, customerPhone: payPhone, channel: 'WEB',
                ...(isNyaradzo && nyaradzoInfo && {
                    productConfig: {
                        noOfMonths: selectedMonths, monthlyPremiumCents: nyaradzoInfo.monthlyPremiumCents,
                        balanceCents: nyaradzoInfo.balanceCents, holderName: nyaradzoInfo.holderName,
                        currency: nyaradzoInfo.currency || totalCurrency, sourcePhone: payPhone,
                    },
                }),
            }, { paymentMethodCode: paymentMethod, customerPhone: payPhone });
            navigate(`/processing/${ref}`);
        } catch (e) {
            setConfirmOpen(false);
            const pe = paymentError(e, 'Payment failed');
            setError(pe.providerUnavailable ? `${pe.message} You can choose another payment method below.` : pe.message);
            setLoading(false);
        }
    };

    const pm = paymentMethods.find(m => m.code === paymentMethod);

    return (
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 20px 40px' }}>
            <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#5a7a8a', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 18, padding: 0 }}>← Back</button>

            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#091E3E', marginBottom: 4 }}>Pay a Bill</h1>
            <p style={{ fontSize: 14, color: '#5a7a8a', marginBottom: 28 }}>Fill in the details below — you'll pay once everything's set.</p>

            <div style={{ background: 'white', borderRadius: 20, padding: '28px 26px', boxShadow: '0 4px 24px rgba(9,30,62,0.06)', border: '1px solid rgba(6,163,218,0.12)' }}>
                {error && !validatingAccount && (
                    <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#dc2626', fontSize: 14 }}>⚠️ {error}</div>
                )}

                {/* 1. Biller */}
                <FlowSection title="Select biller" accent="#06A3DA" done={!!biller} summary={biller?.name}>
                    {billers.length === 0 ? (
                        <div style={{ padding: 30, textAlign: 'center', color: '#5a7a8a', background: '#f8fafc', borderRadius: 12 }}>No billers available at the moment</div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                            {billers.map(b => {
                                const showLogo = b.fullLogoUrl && !logoError[b.code];
                                return (
                                    <div key={b.code} onClick={() => setBiller(b)} style={{
                                        padding: '16px 8px', textAlign: 'center', cursor: 'pointer', minHeight: 96,
                                        border: `2px solid ${biller?.code === b.code ? b.color : 'rgba(6,163,218,0.15)'}`, borderRadius: 14,
                                        background: biller?.code === b.code ? `${b.color}12` : 'white',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        {showLogo ? (
                                            <img src={b.fullLogoUrl} alt={b.name} style={{ width: 40, height: 40, objectFit: 'contain', marginBottom: 6, borderRadius: 6 }} onError={() => setLogoError(p => ({ ...p, [b.code]: true }))} />
                                        ) : (
                                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${b.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 6 }}>{getFallbackIcon(b.code)}</div>
                                        )}
                                        <span style={{ fontWeight: 700, fontSize: 11.5, color: biller?.code === b.code ? b.color : '#091E3E' }}>{b.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </FlowSection>

                {/* 2. Currency (skipped for Nyaradzo — its currency comes from the policy itself) */}
                <FlowSection title="Currency" accent="#06A3DA" show={!!biller && !isNyaradzo && availableCurrencies.length > 1} done={!!selectedCurrency} summary={selectedCurrency}>
                    <div style={{ display: 'flex', gap: 10 }}>
                        {availableCurrencies.map(currency => (
                            <button key={currency} onClick={() => setSelectedCurrency(currency)} style={{
                                flex: 1, padding: '12px', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer',
                                border: `2px solid ${selectedCurrency === currency ? '#06A3DA' : 'rgba(6,163,218,0.2)'}`,
                                background: selectedCurrency === currency ? 'rgba(6,163,218,0.08)' : 'white',
                                color: selectedCurrency === currency ? '#06A3DA' : '#5a7a8a',
                            }}>{currency === 'USD' ? '💵' : '🪙'} {currency}</button>
                        ))}
                    </div>
                    {zesaInfo?.meterCurrency && zesaInfo.meterCurrency !== selectedCurrency && (
                        <p style={{ fontSize: 12, color: '#06A3DA', marginTop: 8 }}>ℹ️ Your meter is in {zesaInfo.meterCurrency}. {selectedCurrency} is accepted.</p>
                    )}
                </FlowSection>

                {/* 3. Account number + inline verification */}
                <FlowSection
                    title={biller?.field || 'Account number'}
                    subtitle={`Enter your ${biller?.field?.toLowerCase() || 'account number'} to verify it before paying`}
                    show={!!biller}
                    accent="#06A3DA"
                    done={accountVerified && (!isNyaradzo || amountReady)}
                    summary={accountVerified ? `${account} · ${accountName}` : ''}
                >
                    <input
                        value={account} onChange={e => setAccount(e.target.value)} placeholder={catalogue[biller?.code]?.accountHint || `Enter ${biller?.field}`}
                        style={{ width: '100%', padding: '14px 18px', border: '2px solid rgba(6,163,218,0.2)', borderRadius: 12, fontSize: 15, outline: 'none', background: '#EEF9FF', marginBottom: 8 }}
                    />
                    {validatingAccount && <p style={{ fontSize: 12.5, color: '#5a7a8a' }}>Verifying account...</p>}
                    {accountName && !validatingAccount && !error && (
                        <div style={{ padding: '9px 13px', background: 'rgba(52,173,84,0.1)', border: '1px solid rgba(52,173,84,0.3)', borderRadius: 8, fontSize: 13, color: '#34AD54', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>✓</span><span style={{ fontWeight: 600 }}>{accountName}</span>
                        </div>
                    )}

                    {biller?.code === 'ZESA' && zesaInfo && (
                        <div style={{ background: '#f8f9fa', borderRadius: 12, padding: 18, marginTop: 16, border: '1px solid rgba(6,163,218,0.2)' }}>
                            <div style={{ display: 'grid', gap: 10, fontSize: 13.5 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#5a7a8a' }}>Meter Number:</span><span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{zesaInfo.meterNumber}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#5a7a8a' }}>Customer Name:</span><span style={{ fontWeight: 600 }}>{zesaInfo.customerName || 'Not available'}</span></div>
                            </div>
                        </div>
                    )}

                    {isNyaradzo && nyaradzoInfo && (
                        <div style={{ background: '#EEF9FF', borderRadius: 16, padding: 18, marginTop: 16, border: `2px solid ${nyaradzoInfo.isPolicyActive ? 'rgba(52,173,84,0.3)' : 'rgba(220,38,38,0.3)'}` }}>
                            <div style={{ display: 'grid', gap: 8, marginBottom: 16, fontSize: 13.5 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#5a7a8a' }}>Policy Holder:</span><span style={{ fontWeight: 600 }}>{nyaradzoInfo.holderName}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#5a7a8a' }}>Status:</span>
                                    <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: nyaradzoInfo.isPolicyActive ? '#e6f7e6' : '#fee2e2', color: nyaradzoInfo.isPolicyActive ? '#2e7d32' : '#c62828' }}>
                                        {nyaradzoInfo.policyStatus || (nyaradzoInfo.isPolicyActive ? 'Active' : 'Lapsed')}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#5a7a8a' }}>Monthly Premium:</span><span style={{ fontWeight: 600 }}>{nyaradzoInfo.currency} {(nyaradzoInfo.monthlyPremiumCents / 100).toFixed(2)}</span></div>
                                {nyaradzoInfo.balanceCents > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#5a7a8a' }}>Outstanding Balance:</span><span style={{ fontWeight: 600, color: '#f59e0b' }}>{nyaradzoInfo.currency} {(nyaradzoInfo.balanceCents / 100).toFixed(2)}</span></div>
                                )}
                            </div>
                            <label style={{ fontWeight: 700, display: 'block', marginBottom: 10, fontSize: 13.5, color: '#091E3E' }}>How many months would you like to pay?</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {[0, 1, 2, 3].map(m => (
                                    <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13.5 }}>
                                        <input type="radio" name="months" checked={selectedMonths === m} onChange={() => setSelectedMonths(m)} />
                                        <span>{m === 0 ? 'Balance only' : `Balance + ${m} month${m > 1 ? 's' : ''}`} ({nyaradzoInfo.currency} {((nyaradzoInfo.balanceCents / 100) + m * (nyaradzoInfo.monthlyPremiumCents / 100)).toFixed(2)})</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </FlowSection>

                {/* 4. Amount (standard billers only — Nyaradzo's total is computed from the month selector above) */}
                <FlowSection title={`Amount (${selectedCurrency || 'USD'})`} subtitle={`Min ${selectedCurrency === 'USD' ? '$' : 'ZWG'}${minAmount.toFixed(2)} · Max ${selectedCurrency === 'USD' ? '$' : 'ZWG'}${maxAmount.toFixed(2)}`} show={accountVerified && !isNyaradzo} accent="#06A3DA" done={amountReady} summary={amountReady ? `${selectedCurrency}${parseFloat(amount).toFixed(2)}` : ''}>
                    <input
                        value={amount} onChange={e => setAmount(e.target.value)} type="number" step="0.01" placeholder="0.00"
                        style={{ width: '100%', padding: '14px 18px', border: `2px solid ${amountError ? '#dc2626' : 'rgba(6,163,218,0.2)'}`, borderRadius: 12, fontSize: 16, outline: 'none', background: '#EEF9FF' }}
                    />
                    {amountError && <p style={{ fontSize: 11.5, color: '#dc2626', marginTop: 6 }}>⚠️ {amountError}</p>}
                </FlowSection>

                {/* 5. Payment method */}
                <FlowSection title="Pay with" accent="#06A3DA" show={accountVerified && amountReady}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
                        {paymentMethods.map(m => (
                            <button key={m.code} onClick={() => setPaymentMethod(m.code)} style={{
                                padding: '12px 8px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 56,
                                border: `2px solid ${paymentMethod === m.code ? '#06A3DA' : 'rgba(6,163,218,0.15)'}`,
                                background: paymentMethod === m.code ? 'rgba(6,163,218,0.08)' : 'white', color: '#091E3E',
                            }}>
                                <span style={{ fontWeight: 700, fontSize: 12.5, lineHeight: 1.25 }}>{m.name}</span>
                                {paymentMethod === m.code && <span style={{ color: '#06A3DA', fontSize: 12 }}>✓</span>}
                            </button>
                        ))}
                    </div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#5a7a8a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{getPaymentFieldLabel()}</label>
                    <div style={{ display: 'flex', border: '2px solid rgba(6,163,218,0.2)', borderRadius: 12, overflow: 'hidden', background: '#EEF9FF' }}>
                        <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg, #06A3DA, #0487b8)', color: 'white', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>🇿🇼 +263</div>
                        <input value={phone} onChange={e => { setPhoneTouched(true); setPhone(e.target.value); }} placeholder={getPaymentFieldPlaceholder()} style={{ flex: 1, padding: '14px 16px', border: 'none', background: 'transparent', fontSize: 15, outline: 'none' }} />
                    </div>
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
                total={formatAmount(Math.round(totalAmount * 100), totalCurrency)}
                rows={[
                    ['Biller', biller?.name],
                    [biller?.field, account],
                    accountName ? ['Account name', accountName] : null,
                    isNyaradzo ? ['Months', selectedMonths === 0 ? 'Balance only' : `Balance + ${selectedMonths}`] : null,
                    ['Payment via', pm?.name || paymentMethod],
                    [getPaymentFieldLabel(), normalizePhone(phone)],
                ]}
            />
        </div>
    );
}

import { useAuth } from '../lib/AuthContext';
import { BackBar } from '../components/shell/AppShell';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { transactionsApi, formatAmount } from '../lib/api';

const STATUS_CONFIG = {
    INITIATED: { color: 'var(--text-2)', bg: 'var(--light)', label: 'Initiated', icon: '📋' },
    PAYMENT_PENDING: { color: '#d97706', bg: '#fffbeb', label: 'Awaiting Payment', icon: '⏳' },
    PAYMENT_CONFIRMED: { color: '#06A3DA', bg: 'var(--light)', label: 'Payment Confirmed', icon: '✅' },
    FULFILMENT_PENDING: { color: '#7c3aed', bg: '#faf5ff', label: 'Processing', icon: '⚙️' },
    COMPLETED: { color: '#34AD54', bg: '#f0fdf4', label: 'Completed', icon: '🎉' },
    PAYMENT_FAILED: { color: '#ef4444', bg: '#fef2f2', label: 'Payment Failed', icon: '❌' },
    FULFILMENT_FAILED: { color: '#ef4444', bg: '#fef2f2', label: 'Fulfilment Failed', icon: '⚠️' },
    REFUNDED: { color: '#06b6d4', bg: '#ecfeff', label: 'Refunded', icon: '↩️' },
    PAYMENT_TIMEOUT: { color: '#9ca3af', bg: '#f9fafb', label: 'Timed Out', icon: '⌛' },
    FULFILMENT_RETRY: { color: '#7c3aed', bg: '#faf5ff', label: 'Processing', icon: '⚙️' },
    MANUAL_FULFILMENT: { color: '#d97706', bg: '#fffbeb', label: 'Being Checked', icon: '🔎' },
    REFUND_PENDING: { color: '#06b6d4', bg: '#ecfeff', label: 'Refund Pending', icon: '↩️' },
    CANCELLED: { color: '#9ca3af', bg: '#f9fafb', label: 'Cancelled', icon: '✕' },
};

// Helper to format payment method code to display name
const getPaymentMethodDisplay = (code) => {
    if (!code) return '—';
    const methods = {
        'ECOCASH': 'EcoCash',
        'ONEMONEY': 'OneMoney',
        'ZIMSWITCH': 'ZimSwitch',
        'VISA': 'Visa',
        'MASTERCARD': 'Mastercard',
        'TELECASH': 'Telecash'
    };
    return methods[code] || code;
};

// Helper to get product display name
const getProductDisplay = (transaction) => {
    if (transaction.productName) return transaction.productName;
    if (transaction.productTypeCode) {
        const code = transaction.productTypeCode.replace('AIRTIME_', '').replace('DATA_', '').replace('BILLS_', '');
        return transaction.productTypeCode.includes('AIRTIME') ? `${code} Airtime` :
            transaction.productTypeCode.includes('DATA') ? `${code} Data` :
                transaction.productTypeCode.includes('BILLS') ? `${code} Bill` :
                    transaction.productTypeCode;
    }
    return '—';
};

// Helper to format date as "04 Mar 2026, 23:05"
const formatDate = (dateValue) => {
    if (!dateValue) return '—';

    try {
        let date;

        // Handle array format [2026, 3, 14, 23, 5, 13, 110113000]
        if (Array.isArray(dateValue) && dateValue.length >= 6) {
            const [year, month, day, hour, minute, second] = dateValue;
            // Create date object (month is 0-indexed in JS, but array has 1-indexed month)
            date = new Date(year, month - 1, day, hour, minute, second);
        }
        // Handle string format
        else if (typeof dateValue === 'string') {
            date = new Date(dateValue);
        }
        else {
            return '—';
        }

        // Check if date is valid
        if (isNaN(date.getTime())) return '—';

        // Format: 04 Mar 2026, 23:05
        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleString('en-US', { month: 'short' });
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');

        return `${day} ${month} ${year}, ${hours}:${minutes}`;

    } catch (e) {
        console.log('Date parsing error:', e);
        return '—';
    }
};

// Helper to mask phone number (show only last 4 digits)
const maskPhone = (phone) => {
    if (!phone) return '—';
    // If it's a full number with +263, show +263****1234
    if (phone.startsWith('+263')) {
        return phone.substring(0, 4) + '****' + phone.slice(-4);
    }
    // Otherwise just mask the middle
    if (phone.length > 6) {
        return phone.substring(0, 3) + '****' + phone.slice(-4);
    }
    return phone;
};

export default function Status() {
    const { user } = useAuth();
    const { ref: urlRef } = useParams();
    const navigate = useNavigate();
    const [query, setQuery] = useState(urlRef || '');
    const [transaction, setTransaction] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const lookup = async (r) => {
        const reference = (r || query).trim();
        if (!reference) return;
        setLoading(true); setError(''); setTransaction(null); setTimeline([]);
        try {
            const [txRes, tlRes] = await Promise.all([
                transactionsApi.getStatus(reference),
                transactionsApi.getTimeline(reference),
            ]);
            // Handle different response structures
            const txData = txRes.data?.data || txRes.data;
            const tlData = tlRes.data?.data || tlRes.data || [];

            console.log('Transaction data:', txData); // For debugging
            setTransaction(txData);
            setTimeline(tlData);
        } catch (e) {
            setError(e.response?.status === 404 ? 'Transaction not found. Please check the reference.' : 'Failed to load transaction.');
        } finally { setLoading(false); }
    };

    useEffect(() => { if (urlRef) lookup(urlRef); }, [urlRef]);

    const cfg = transaction ? (STATUS_CONFIG[transaction.status] || STATUS_CONFIG.INITIATED) : null;

    return (
        <div style={user ? {} : { minHeight: '100vh', background: 'var(--light)', paddingTop: 100 }}>
            <div style={user ? { maxWidth: 820 } : { maxWidth: 680, margin: '0 auto', padding: '0 24px 80px' }}>
                {user && <BackBar title="Track order" />}
                <div style={{ textAlign: 'center', marginBottom: 40, display: user ? 'none' : 'block' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
                    <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: 8 }}>Track Order</h1>
                    <p style={{ color: 'var(--text-2)', fontSize: 15 }}>Enter your reference number to check status</p>
                </div>

                {/* Search */}
                <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 28, border: '1.5px solid rgba(6,163,218,0.12)', marginBottom: 24, boxShadow: '0 4px 24px rgba(6,163,218,0.08)' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <input
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && lookup()}
                           
                            style={{ flex: 1, padding: '14px 18px', border: '2px solid rgba(6,163,218,0.2)', borderRadius: 12, fontSize: 15, outline: 'none', background: 'var(--light)', fontFamily: 'monospace' }}
                        />
                        <button onClick={() => lookup()} disabled={loading} style={{
                            padding: '14px 24px', background: 'linear-gradient(135deg, #06A3DA, #0487b8)',
                            color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
                        }}>
                            {loading ? <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> : '🔍'} Track
                        </button>
                    </div>
                </div>

                {error && (
                    <div style={{ background: 'var(--danger-bg)', color: '#b91c1c', padding: '16px 20px', borderRadius: 14, marginBottom: 24, fontSize: 14, borderLeft: '3px solid #ef4444', display: 'flex', gap: 10 }}>
                        ⚠️ {error}
                    </div>
                )}

                {transaction && cfg && (
                    <div>
                        {/* Status card */}
                        <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 28, border: '1.5px solid rgba(6,163,218,0.12)', marginBottom: 20, boxShadow: '0 4px 24px rgba(6,163,218,0.08)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
                                <div style={{ width: 64, height: 64, borderRadius: 16, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>{cfg.icon}</div>
                                <div>
                                    <div style={{ display: 'inline-block', padding: '4px 14px', background: cfg.bg, color: cfg.color, borderRadius: 100, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{cfg.label}</div>
                                    <div style={{ fontSize: 13, color: 'var(--text-2)', fontFamily: 'monospace' }}>{transaction.reference}</div>
                                    {transaction.outcomeMessage && (
                                        <div style={{ fontSize: 13, color: cfg.color, marginTop: 4 }}>{transaction.outcomeMessage}</div>
                                    )}
                                </div>
                                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                    <div style={{ fontWeight: 800, fontSize: 24, color: '#06A3DA' }}>{formatAmount(transaction.amountCents || 0, transaction.currency)}</div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                {[
                                    { label: 'Product', value: getProductDisplay(transaction) },
                                    { label: 'Recipient', value: transaction.recipientIdentifier || '—' },
                                    { label: 'Payment Method', value: getPaymentMethodDisplay(transaction.paymentMethodCode) },
                                    { label: 'Payer Number', value: maskPhone(transaction.customerPhone) || '—' },
                                    { label: 'Provider Ref', value: transaction.providerReference || '—' },
                                    { label: 'Created', value: formatDate(transaction.initiatedAt || transaction.createdAt) },
                                ].map(row => (
                                    <div key={row.label} style={{ background: 'var(--light)', padding: '12px 16px', borderRadius: 10 }}>
                                        <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{row.label}</div>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', wordBreak: 'break-all' }}>{row.value}</div>
                                    </div>
                                ))}
                            </div>

                            {transaction.failureReason && (
                                <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--danger-bg)', borderRadius: 10, borderLeft: '3px solid #ef4444', fontSize: 13, color: '#b91c1c' }}>
                                    <strong>Reason:</strong> {transaction.failureReason}
                                </div>
                            )}
                        </div>

                        {/* Timeline */}
                        {timeline.length > 0 && (
                            <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 28, border: '1.5px solid rgba(6,163,218,0.12)', boxShadow: '0 4px 24px rgba(6,163,218,0.08)' }}>
                                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 24 }}>Transaction Timeline</h3>
                                {timeline.map((event, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 16, paddingBottom: i < timeline.length - 1 ? 20 : 0, position: 'relative' }}>
                                        {i < timeline.length - 1 && (
                                            <div style={{ position: 'absolute', left: 17, top: 36, bottom: 0, width: 2, background: 'rgba(6,163,218,0.15)' }} />
                                        )}
                                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(6,163,218,0.1)', border: '2px solid rgba(6,163,218,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, position: 'relative', zIndex: 1 }}>
                                            {i === 0 ? '🎯' : '•'}
                                        </div>
                                        <div style={{ flex: 1, paddingBottom: 4 }}>
                                            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>
                                                {event.fromStatus && <span style={{ color: 'var(--text-3)' }}>{event.fromStatus} → </span>}
                                                <span>{event.toStatus}</span>
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{event.actor} · {formatDate(event.createdAt)}</div>
                                            {event.note && <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>{event.note}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {!transaction && !loading && !error && (
                    <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 48, textAlign: 'center', border: '1.5px solid rgba(6,163,218,0.12)' }}>
                        <div style={{ fontSize: 56, marginBottom: 16 }}>🔎</div>
                        <p style={{ color: 'var(--text-2)', fontSize: 15 }}>Enter a reference like <strong>PP-WEB-20260309-000001</strong> above</p>
                    </div>
                )}
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
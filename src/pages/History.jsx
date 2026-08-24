import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { transactionsApi, formatAmount } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

const STATUS_COLORS = {
    COMPLETED: { bg: 'rgba(52,173,84,0.15)', color: '#34AD54', label: 'Completed' },
    PAYMENT_PENDING: { bg: 'rgba(6,163,218,0.15)', color: '#06A3DA', label: 'Pending' },
    PAYMENT_FAILED: { bg: 'rgba(229,62,62,0.15)', color: '#e53e3e', label: 'Failed' },
    FULFILMENT_FAILED: { bg: 'rgba(229,62,62,0.15)', color: '#e53e3e', label: 'Fulfilment Failed' },
    FULFILMENT_PENDING: { bg: 'rgba(6,163,218,0.15)', color: '#06A3DA', label: 'Processing' },
    INITIATED: { bg: 'rgba(107,114,128,0.15)', color: '#6b7280', label: 'Initiated' },
};

function fmtDate(val) {
    if (!val) return '—';
    try {
        if (Array.isArray(val)) {
            const [y, mo, d, h = 0, m = 0] = val;
            return new Date(y, mo - 1, d, h, m).toLocaleString('en-ZW', { dateStyle: 'medium', timeStyle: 'short' });
        }
        return new Date(val).toLocaleString('en-ZW', { dateStyle: 'medium', timeStyle: 'short' });
    } catch { return '—'; }
}

// Helper function to extract product name from product type code
const getProductName = (productTypeCode) => {
    if (!productTypeCode) return 'Transaction';

    const parts = productTypeCode.split('_');
    if (parts.length < 2) return productTypeCode;

    const category = parts[0];
    const provider = parts[1];

    if (category === 'AIRTIME') {
        return `${provider} Airtime`;
    } else if (category === 'DATA') {
        return `${provider} Data Bundle`;
    } else if (category === 'BILLS') {
        return `${provider} Bill Payment`;
    }

    return productTypeCode;
};

export default function History() {
    const { user } = useAuth();
    const [txs, setTxs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const load = async (p = 0) => {
        setLoading(true);
        setError('');
        try {
            console.log('Fetching history for page:', p);
            const r = await transactionsApi.getMyHistory(p, 15);
            console.log('History response:', r);

            // Handle different response structures
            let transactions = [];
            let totalElements = 0;
            let totalPagesCount = 1;

            if (r.data) {
                if (r.data.data) {
                    // Nested data structure
                    transactions = r.data.data.content || r.data.data || [];
                    totalElements = r.data.data.totalElements || transactions.length;
                    totalPagesCount = r.data.data.totalPages || 1;
                } else if (r.data.content) {
                    // Paginated structure
                    transactions = r.data.content || [];
                    totalElements = r.data.totalElements || transactions.length;
                    totalPagesCount = r.data.totalPages || 1;
                } else if (Array.isArray(r.data)) {
                    // Direct array
                    transactions = r.data;
                    totalElements = transactions.length;
                    totalPagesCount = 1;
                }
            }

            console.log('Processed transactions:', transactions);
            setTxs(transactions);
            setTotalPages(totalPagesCount);
            setTotal(totalElements);
        } catch (e) {
            console.error('History load error:', e);
            setError(e.response?.data?.message || 'Failed to load history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            load(page);
        }
    }, [page, user]);

    if (!user) {
        return (
            <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 64, marginBottom: 20 }}>🔒</div>
                <h3 style={{ fontWeight: 700, fontSize: 20, marginBottom: 12, color: 'var(--text)' }}>Please log in</h3>
                <p style={{ color: 'var(--text-2)', marginBottom: 28 }}>You need to be logged in to view your transaction history.</p>
                <Link to="/login" style={{
                    display: 'inline-block', padding: '14px 32px', borderRadius: 12,
                    background: 'linear-gradient(135deg, #06A3DA, #0487b8)',
                    color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: 15,
                }}>Log In</Link>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 20px' }}>
            {/* Header */}
            <div style={{ marginBottom: 36 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #06A3DA, #34AD54)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 800, fontSize: 20,
                    }}>
                        {user?.fullName?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>My Transactions</h1>
                        <p style={{ fontSize: 14, color: 'var(--text-2)' }}>
                            {user?.fullName} · {total} total transaction{total !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
            </div>

            {error && (
                <div style={{
                    background: 'rgba(229,62,62,0.1)',
                    border: '1px solid rgba(229,62,62,0.3)',
                    borderRadius: 12,
                    padding: '16px 20px',
                    marginBottom: 24,
                    color: '#e53e3e'
                }}>
                    ⚠️ {error}
                </div>
            )}

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
                    <div className="spinner" style={{ width: 40, height: 40, border: '3px solid rgba(6,163,218,0.2)', borderTop: '3px solid #06A3DA', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </div>
            ) : txs.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '80px 40px',
                    background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)',
                }}>
                    <div style={{ fontSize: 64, marginBottom: 20 }}>📋</div>
                    <h3 style={{ fontWeight: 700, fontSize: 20, marginBottom: 12, color: 'var(--text)' }}>No transactions yet</h3>
                    <p style={{ color: 'var(--text-2)', marginBottom: 28 }}>Your transaction history will appear here after your first top-up.</p>
                    <Link to="/airtime" style={{
                        display: 'inline-block', padding: '14px 32px', borderRadius: 12,
                        background: 'linear-gradient(135deg, #06A3DA, #0487b8)',
                        color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: 15,
                    }}>Buy Airtime Now</Link>
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {txs.map(tx => {
                            const sc = STATUS_COLORS[tx.status] || { bg: 'rgba(107,114,128,0.15)', color: '#6b7280', label: tx.status };

                            // Get recipient identifier (phone number or account number)
                            const recipient = tx.recipientIdentifier || tx.recipientPhone || '—';

                            // Get product name
                            const productName = tx.productName || getProductName(tx.productTypeCode);

                            return (
                                <Link key={tx.reference} to={`/status/${tx.reference}`} style={{ textDecoration: 'none' }}>
                                    <div style={{
                                        background: 'var(--bg-card)', borderRadius: 14, padding: '18px 22px',
                                        border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s',
                                        display: 'flex', alignItems: 'center', gap: 16,
                                    }}
                                         onMouseEnter={e => e.currentTarget.style.borderColor = '#06A3DA'}
                                         onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                    >
                                        {/* Icon */}
                                        <div style={{
                                            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                                            background: tx.status === 'COMPLETED' ? 'rgba(52,173,84,0.1)' : 'rgba(6,163,218,0.1)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                                        }}>
                                            {tx.status === 'COMPLETED' ? '✅' : tx.status?.includes('FAIL') ? '❌' : '⏳'}
                                        </div>

                                        {/* Details */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
                          {productName}
                        </span>
                                                <span style={{ fontWeight: 800, fontSize: 16, color: '#06A3DA' }}>
                          {formatAmount(tx.amountCents, tx.currency)}
                        </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>To: {recipient}</span>
                                                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{fmtDate(tx.createdAt || tx.initiatedAt)}</span>
                                                <span style={{
                                                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100,
                                                    background: sc.bg, color: sc.color,
                                                }}>{sc.label}</span>
                                            </div>
                                        </div>

                                        <span style={{ color: 'var(--text-2)', fontSize: 18 }}>›</span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 32 }}>
                            <button
                                onClick={() => setPage(p => Math.max(0, p-1))}
                                disabled={page === 0}
                                style={{
                                    padding: '10px 20px', borderRadius: 10, border: '1.5px solid var(--border)',
                                    background: 'var(--bg-2)', cursor: page === 0 ? 'not-allowed' : 'pointer',
                                    color: page === 0 ? 'var(--text-2)' : 'var(--text)', fontWeight: 600,
                                }}
                            >← Previous</button>
                            <span style={{ padding: '10px 20px', fontSize: 14, color: 'var(--text-2)' }}>
                Page {page + 1} of {totalPages}
              </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages-1, p+1))}
                                disabled={page >= totalPages-1}
                                style={{
                                    padding: '10px 20px', borderRadius: 10, border: '1.5px solid var(--border)',
                                    background: 'var(--bg-2)', cursor: page >= totalPages-1 ? 'not-allowed' : 'pointer',
                                    color: page >= totalPages-1 ? 'var(--text-2)' : 'var(--text)', fontWeight: 600,
                                }}
                            >Next →</button>
                        </div>
                    )}
                </>
            )}

            <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
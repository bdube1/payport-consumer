/**
 * The final "are you sure" moment before money actually moves — a lightweight
 * overlay rather than a separate page, so it doesn't add scrolling or navigation,
 * but it still gives a clear last look before the charge goes through.
 */
export default function ConfirmModal({ open, onClose, onConfirm, loading, rows, total, totalLabel = 'Total' }) {
    if (!open) return null;
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(9,30,62,0.55)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            backdropFilter: 'blur(2px)',
        }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{
                width: '100%', maxWidth: 480, background: 'var(--bg-card, white)', borderRadius: '20px 20px 0 0',
                padding: '28px 24px 24px', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
                animation: 'confirm-up 0.22s ease',
            }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border, #e2e8f0)', margin: '0 auto 20px' }} />
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text, #091E3E)', marginBottom: 4 }}>Confirm payment</h3>
                <p style={{ fontSize: 13, color: 'var(--text-2, #5a7a8a)', marginBottom: 20 }}>Check the details below before you pay.</p>

                <div style={{ background: 'var(--bg-2, #EEF9FF)', borderRadius: 14, padding: '16px 18px', marginBottom: 22 }}>
                    {rows.filter(Boolean).map((row, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < rows.filter(Boolean).length - 1 ? '1px solid rgba(6,163,218,0.1)' : 'none' }}>
                            <span style={{ fontSize: 13, color: 'var(--text-2, #5a7a8a)' }}>{row[0]}</span>
                            <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text, #091E3E)', textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>{row[1]}</span>
                        </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, marginTop: 4, borderTop: '2px solid rgba(6,163,218,0.15)' }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text, #091E3E)' }}>{totalLabel}</span>
                        <span style={{ fontWeight: 800, fontSize: 18, color: '#06A3DA' }}>{total}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={onClose} disabled={loading} style={{
                        flex: 1, padding: '15px', borderRadius: 12, fontSize: 14.5, fontWeight: 600,
                        background: 'var(--bg-2, #f1f5f9)', color: 'var(--text-2, #5a7a8a)', border: '1.5px solid var(--border, #e2e8f0)',
                        cursor: loading ? 'not-allowed' : 'pointer',
                    }}>Cancel</button>
                    <button onClick={onConfirm} disabled={loading} style={{
                        flex: 2, padding: '15px', borderRadius: 12, fontSize: 15, fontWeight: 700,
                        background: loading ? '#94b8ca' : 'linear-gradient(135deg, #34AD54, #2a9444)',
                        color: 'white', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                        boxShadow: loading ? 'none' : '0 4px 16px rgba(52,173,84,0.35)',
                    }}>
                        {loading ? '⏳ Processing...' : `Pay ${total}`}
                    </button>
                </div>
            </div>
            <style>{`@keyframes confirm-up { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
        </div>
    );
}

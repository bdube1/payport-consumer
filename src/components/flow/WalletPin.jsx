/**
 * Shown when "PayPort Wallet" is the payment method: the holder confirms with their PIN, which goes
 * only to the wallet endpoint (never to the generic pay call) and is not stored.
 */
export default function WalletPin({ value, onChange }) {
    return (
        <div style={{ marginTop: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Wallet PIN
            </label>
            <input
                type="password" inputMode="numeric" autoComplete="current-password" maxLength={6}
                value={value} onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
                placeholder="Your PayPort PIN"
                style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 12, border: '2px solid rgba(6,163,218,0.2)', background: 'var(--light)', fontSize: 15, outline: 'none', letterSpacing: '0.3em' }}
            />
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 6 }}>The amount is taken from your PayPort wallet once you confirm.</div>
        </div>
    );
}

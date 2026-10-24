import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { walletApi, formatAmount } from '../lib/api';

const P = (d) => <path d={d} />;
const ICONS = {
    topup: [P('M12 5v14'), P('M5 12h14')],
    send: [P('M22 2 11 13'), P('M22 2 15 22l-4-9-9-4 20-7z')],
    cashout: [<rect key="r" x="2" y="6" width="20" height="12" rx="2" />, <circle key="c" cx="12" cy="12" r="2.5" />, P('M6 12h.01M18 12h.01')],
    convert: [P('M7 4 3 8l4 4'), P('M3 8h14'), P('m17 20 4-4-4-4'), P('M21 16H7')],
    merchant: [P('M3 9 4.5 4h15L21 9'), P('M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z'), P('M5 13v7h14v-7')],
    airtime: [<rect key="r" x="6" y="2" width="12" height="20" rx="2" />, P('M11 18h2')],
    data: [P('M5 12.5a10 10 0 0 1 14 0'), P('M8.5 16a5 5 0 0 1 7 0'), P('M2 9a15 15 0 0 1 20 0'), P('M12 19.5h.01')],
    bills: [P('M6 2h12v20l-3-2-3 2-3-2-3 2z'), P('M9 7h6M9 11h6M9 15h4')],
    cards: [<rect key="r" x="2" y="5" width="20" height="14" rx="2" />, P('M2 10h20'), P('M6 15h4')],
    help: [<circle key="c" cx="12" cy="12" r="10" />, P('M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3'), P('M12 17h.01')],
};

function Icon({ name, size = 26, color = 'currentColor' }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{ICONS[name]}</svg>;
}

const SERVICES = [
    ['topup', 'Top up', '/wallet?a=topup'],
    ['send', 'Send money', '/wallet?a=send'],
    ['cashout', 'Cash out', '/wallet?a=cashout'],
    ['convert', 'Convert', '/wallet?a=convert'],
    ['merchant', 'Pay merchant', '/wallet?a=merchant'],
    ['airtime', 'Airtime', '/airtime'],
    ['data', 'Data', '/data'],
    ['bills', 'Bills', '/bills'],
    ['cards', 'Cards', '/wallet?a=cards'],
];

/** Home for a registered customer: wallets, every service, help. */
export default function Dashboard() {
    const { user } = useAuth();
    const [state, setState] = useState({ loading: true, enabled: false, wallets: [] });
    const [hide, setHide] = useState(false);
    const load = useCallback(() => walletApi.list()
        .then(r => { const d = r.data?.data || {}; setState({ loading: false, enabled: !!d.enabled, wallets: d.wallets || [] }); })
        .catch(() => setState({ loading: false, enabled: false, wallets: [] })), []);
    useEffect(() => { load(); }, [load]);
    const first = (user?.fullName || '').trim().split(/\s+/)[0] || 'there';
    const order = { USD: 0, ZWG: 1 };
    const wallets = [...state.wallets].sort((a, b) => (order[a.currency] ?? 9) - (order[b.currency] ?? 9));

    return (
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px 48px' }}>
            <div style={{ borderRadius: 24, padding: '24px 22px 22px', color: 'white', background: 'linear-gradient(135deg, #06A3DA 0%, #0487b8 55%, #34AD54 120%)', boxShadow: '0 12px 30px rgba(6,163,218,0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: 14, opacity: 0.9 }}>Welcome back</div>
                        <div style={{ fontSize: 24, fontWeight: 800 }}>{first}</div>
                    </div>
                    <button onClick={() => setHide(h => !h)} style={{ background: 'rgba(255,255,255,0.18)', border: 'none', color: 'white', borderRadius: 20, padding: '6px 12px', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
                        {hide ? 'Show balances' : 'Hide balances'}
                    </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 18 }}>
                    {state.loading && <WalletCard loading />}
                    {!state.loading && wallets.map(w => <WalletCard key={w.walletRef} w={w} hide={hide} />)}
                    {!state.loading && wallets.length === 0 && <Link to="/wallet?a=topup" style={{ ...glass, textDecoration: 'none', color: 'white' }}>
                        <div style={{ fontSize: 13, opacity: 0.9 }}>PayPort Wallet</div>
                        <div style={{ fontSize: 18, fontWeight: 800, marginTop: 6 }}>{state.enabled ? 'Open your wallet' : 'Coming soon'}</div>
                    </Link>}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 22 }}>
                {SERVICES.map(([k, t, to]) => (
                    <Link key={k} to={to} style={{ textDecoration: 'none', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: '18px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, boxShadow: '0 4px 14px rgba(9,30,62,0.05)' }}>
                        <span style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(6,163,218,0.1)', color: '#06A3DA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name={k} />
                        </span>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', textAlign: 'center' }}>{t}</span>
                    </Link>
                ))}
            </div>

            <Link to="/help" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14, marginTop: 22, padding: 18, borderRadius: 18, background: 'var(--light)', border: '1px solid rgba(6,163,218,0.15)' }}>
                <span style={{ width: 46, height: 46, borderRadius: 14, background: '#34AD54', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="help" size={24} /></span>
                <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontWeight: 800, color: 'var(--dark)' }}>Need help?</span>
                    <span style={{ display: 'block', fontSize: 13, color: '#5a7a91' }}>Chat with us or track an order</span>
                </span>
                <span style={{ color: '#06A3DA', fontSize: 22 }}>›</span>
            </Link>
        </div>
    );
}

const glass = { background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 18, padding: 16, backdropFilter: 'blur(6px)' };

function WalletCard({ w, hide, loading }) {
    if (loading) return <div style={glass}><div style={{ fontSize: 13, opacity: 0.9 }}>Loading…</div><div style={{ height: 30 }} /></div>;
    return (
        <Link to="/history?tab=wallet" style={{ ...glass, textDecoration: 'none', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, opacity: 0.95 }}>
                <span style={{ fontWeight: 800 }}>{w.currency} Wallet</span>
                {w.status !== 'ACTIVE' && <span>{w.status}</span>}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, margin: '8px 0 4px' }}>{hide ? '••••••' : formatAmount(w.balanceMinor, w.currency)}</div>
            <div style={{ fontSize: 12, opacity: 0.85, fontFamily: 'monospace' }}>{w.walletRef}</div>
        </Link>
    );
}

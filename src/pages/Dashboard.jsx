import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { walletApi, transactionsApi, formatAmount } from '../lib/api';
import Icon from '../components/shell/Icons';

const SERVICES = [
    ['topup', 'Top up', 'Fund your wallet', '/wallet?a=topup'],
    ['send', 'Send money', 'Transfer to anyone', '/wallet?a=send'],
    ['cashout', 'Cash out', 'Withdraw to your bank', '/wallet?a=cashout'],
    ['convert', 'Convert', 'Exchange currencies', '/wallet?a=convert'],
    ['merchant', 'Pay merchant', 'Pay for goods and services', '/wallet?a=merchant'],
    ['airtime', 'Airtime', 'Buy airtime bundles', '/airtime'],
    ['data', 'Data', 'Buy data bundles', '/data'],
    ['bills', 'Bills', 'Pay utility and other bills', '/bills'],
    ['cards', 'Cards', 'Manage your cards', '/cards'],
];
const ORDER = { USD: 0, ZWG: 1 };
const STAT_COLOURS = ['#2DB36A', '#1E78D6', '#8A5CF6', '#F59E0B'];
const amount = (minor) => (Number(minor || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Home for a registered customer (mockup 2026-10-24). */
export default function Dashboard() {
    const { user } = useAuth();
    const [state, setState] = useState({ loading: true, enabled: false, wallets: [] });
    const [hide, setHide] = useState(() => { try { return localStorage.getItem('pp_hide_balances') === '1'; } catch { return false; } });
    const load = useCallback(() => walletApi.list()
        .then(r => { const d = r.data?.data || {}; setState({ loading: false, enabled: !!d.enabled, wallets: d.wallets || [] }); })
        .catch(() => setState({ loading: false, enabled: false, wallets: [] })), []);
    useEffect(() => { load(); }, [load]);
    const toggle = () => setHide(h => { try { localStorage.setItem('pp_hide_balances', h ? '0' : '1'); } catch { /* none */ } return !h; });
    const first = (user?.fullName || '').trim().split(/\s+/)[0] || 'there';
    const wallets = [...state.wallets].sort((a, b) => (ORDER[a.currency] ?? 9) - (ORDER[b.currency] ?? 9));
    const show = (w) => (hide ? '••••' : amount(w.balanceMinor));

    return (
        <div className="pp-dash">
            <div>
                <section className="pp-banner">
                    <div className="pp-hello">Welcome back,</div>
                    <div className="pp-name">{first}</div>
                    <button className="pp-hide" onClick={toggle}><Icon name={hide ? 'eye' : 'eyeOff'} size={16} />{hide ? 'Show balances' : 'Hide balances'}</button>
                    <div className="pp-wallets">
                        {state.loading && <div className="pp-wcard">Loading…</div>}
                        {wallets.map(w => (
                            <Link key={w.walletRef} to="/history?tab=wallet" className="pp-wcard">
                                <div className="pp-wtop">
                                    <span className="pp-wicon"><Icon name="wallet" size={30} /></span>
                                    <span style={{ minWidth: 0 }}>
                                        <div className="pp-wname">{w.currency} Wallet</div>
                                        <div className="pp-wref">{w.walletRef}</div>
                                    </span>
                                </div>
                                <div className="pp-wbal">{show(w)}</div>
                                <div className="pp-wccy">{w.currency}</div>
                            </Link>
                        ))}
                        {!state.loading && wallets.length === 0 && (
                            <Link to="/wallet?a=topup" className="pp-wcard">
                                <div className="pp-wtop"><span className="pp-wicon"><Icon name="wallet" size={30} /></span><div className="pp-wname">Payport Wallet</div></div>
                                <div className="pp-wbal" style={{ fontSize: 24 }}>{state.enabled ? 'Open your wallet' : 'Coming soon'}</div>
                            </Link>
                        )}
                    </div>
                </section>

                <div className="pp-services">
                    {SERVICES.map(([k, t, sub, to]) => (
                        <Link key={k} to={to} className="pp-svc">
                            <span className="pp-svci"><Icon name={k} size={30} /></span>
                            <span style={{ minWidth: 0 }}><b>{t}</b><small>{sub}</small></span>
                            <Icon name="chevronRight" size={20} style={{ marginLeft: 'auto', color: 'var(--text-2)' }} />
                        </Link>
                    ))}
                </div>

                <RecentTransactions />
            </div>

            <aside className="pp-aside">
                <div className="pp-side-card pp-promo">
                    <h3>Fast. Safe.<br />Convenient.</h3>
                    <p>All your payments in one place.</p>
                    <img src="/images/dashboard/promo.png" alt="" />
                </div>
                <div className="pp-side-card pp-stats">
                    <h4><Icon name="stats" size={22} color="#1E78D6" />Quick stats</h4>
                    {wallets.map((w, i) => (
                        <Link key={w.walletRef} to="/history?tab=wallet" className="pp-stat">
                            <span className="pp-stati" style={{ background: STAT_COLOURS[i % STAT_COLOURS.length] }}><Icon name="wallet" size={24} /></span>
                            <span><small>{w.currency} Wallet</small><b>{w.currency} {show(w)}</b></span>
                            <Icon name="chevronRight" size={20} style={{ marginLeft: 'auto', color: 'var(--text-2)' }} />
                        </Link>
                    ))}
                    {!state.loading && wallets.length === 0 && <p style={{ color: 'var(--text-2)', fontSize: 14 }}>No wallet yet.</p>}
                </div>
            </aside>
        </div>
    );
}

const KIND = { TOPUP: 'Wallet top-up', PAYMENT: 'Payment', P2P_OUT: 'Money sent', P2P_IN: 'Money received', CASH_IN: 'Cash in', CASH_OUT: 'Cash out', FX_OUT: 'Converted', FX_IN: 'Converted', REFUND: 'Refund' };
const STATUS = { COMPLETED: 'Completed', PAYMENT_PENDING: 'Pending', FULFILMENT_PENDING: 'Processing', PAYMENT_CONFIRMED: 'Processing', PAYMENT_FAILED: 'Failed',
    FULFILMENT_FAILED: 'Failed', PAYMENT_TIMEOUT: 'Timed out', REFUNDED: 'Refunded', REFUND_PENDING: 'Refund pending', CANCELLED: 'Cancelled', INITIATED: 'Started', MANUAL_FULFILMENT: 'Being checked' };
const time = (v) => { const t = Array.isArray(v) ? new Date(v[0], v[1] - 1, v[2], v[3] || 0, v[4] || 0) : new Date(String(v).replace(' ', 'T')); return Number.isNaN(t.getTime()) ? 0 : t.getTime(); };
const when = (ms) => ms ? new Date(ms).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

/** The five most recent transactions (payments and wallet activity), newest first. */
function RecentTransactions() {
    const [rows, setRows] = useState(null);
    useEffect(() => {
        (async () => {
            const out = [];
            try {
                const r = await transactionsApi.getMyHistory(0, 5);
                const d = r.data?.data || r.data || {};
                for (const t of (d.content || (Array.isArray(d) ? d : []))) {
                    if ((t.productTypeCode || '').startsWith('WALLET')) continue;
                    out.push({ key: 'p' + t.reference, at: time(t.createdAt || t.initiatedAt), title: t.productName || 'Payment', sub: t.toName || t.recipientIdentifier,
                        amount: formatAmount(t.totalCents ?? t.amountCents, t.currency), out: true, status: STATUS[t.status] || t.status, to: `/history` });
                }
            } catch { /* none */ }
            try {
                const w = await walletApi.list();
                const ws = w.data?.data?.wallets || [];
                const all = await Promise.all(ws.map(x => walletApi.statement(x.walletRef, 5).then(s => s.data?.data || []).catch(() => [])));
                for (const o of all.flat()) {
                    out.push({ key: 'w' + o.op_ref + o.kind, at: time(o.created_at), title: KIND[o.kind] || o.kind, sub: o.to_name || o.counterparty,
                        amount: `${o.direction === 'CR' ? '+' : '−'}${formatAmount(o.amount_minor, o.currency)}`, out: o.direction !== 'CR', to: '/history?tab=wallet' });
                }
            } catch { /* none */ }
            out.sort((a, b) => b.at - a.at);
            setRows(out.slice(0, 5));
        })();
    }, []);
    return (
        <div className="pp-recent">
            <div className="pp-recent-head"><b>Recent transactions</b><Link to="/history">View all <Icon name="chevronRight" size={14} /></Link></div>
            {rows === null && <p className="pp-recent-empty">Loading…</p>}
            {rows && rows.length === 0 && <p className="pp-recent-empty">No transactions yet.</p>}
            {(rows || []).map(r => (
                <Link key={r.key} to={r.to} className="pp-recent-row">
                    <span className={`pp-recent-ic ${r.out ? 'out' : 'in'}`}><Icon name={r.out ? 'send' : 'topup'} size={18} /></span>
                    <span className="pp-recent-main"><b>{r.title}</b><small>{[r.sub, when(r.at)].filter(Boolean).join(' · ')}</small></span>
                    <span className="pp-recent-amt"><b className={r.out ? '' : 'in'}>{r.amount}</b>{r.status && <small>{r.status}</small>}</span>
                </Link>
            ))}
        </div>
    );
}

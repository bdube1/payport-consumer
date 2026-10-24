import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { walletApi } from '../lib/api';
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
                                <div className="pp-wtop"><span className="pp-wicon"><Icon name="wallet" size={30} /></span><div className="pp-wname">PayPort Wallet</div></div>
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

                <div className="pp-helpbar">
                    <span className="pp-infoi"><Icon name="info" size={26} /></span>
                    <span>
                        <b>Need help?</b>
                        <p>We're here for you. <Link to="/help">Visit</Link> our support centre for FAQs, policies and more.</p>
                    </span>
                    <Link to="/help" className="pp-getsupport">Get support <Icon name="chevronRight" size={16} /></Link>
                </div>
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

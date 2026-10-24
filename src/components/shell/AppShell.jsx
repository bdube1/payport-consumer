import { useEffect, useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { authApi, transactionsApi } from '../../lib/api';
import Icon from './Icons';
import '../../styles/shell.css';

const SEEN = 'pp_seen_activity';
const stamp = (v) => { const t = Array.isArray(v) ? new Date(v[0], v[1] - 1, v[2], v[3] || 0, v[4] || 0).getTime() : new Date(v).getTime(); return Number.isNaN(t) ? 0 : t; };

/** Signed-in customer layout: sidebar, top bar with notifications and account menu. */
export default function AppShell({ children }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [menu, setMenu] = useState(false);
    const [unread, setUnread] = useState(false);
    const name = (user?.fullName || '').trim();
    const first = name.split(/\s+/)[0] || 'Account';

    useEffect(() => { setOpen(false); setMenu(false); }, [location.pathname, location.search]);
    useEffect(() => {
        transactionsApi.getMyHistory(0, 1).then(r => {
            const d = r.data?.data || r.data || {};
            const latest = (d.content || d || [])[0];
            let seen = 0;
            try { seen = Number(localStorage.getItem(SEEN) || 0); } catch { /* none */ }
            setUnread(!!latest && stamp(latest.createdAt || latest.initiatedAt) > seen);
        }).catch(() => {});
    }, [location.pathname]);

    const signOut = () => { authApi.logout(); logout(); navigate('/'); };
    const openActivity = () => { try { localStorage.setItem(SEEN, String(Date.now())); } catch { /* none */ } setUnread(false); navigate('/history'); };

    return (
        <div className="pp-shell">
            <aside className={`pp-side${open ? ' open' : ''}`}>
                <Link to="/" className="pp-brand"><img src="/images/brand/mark.png" alt="" /><span>Payport</span></Link>
                <nav className="pp-nav">
                    <NavLink to="/" end><Icon name="home" />Home</NavLink>
                    <NavLink to="/history"><Icon name="history" />History</NavLink>
                    <NavLink to="/beneficiaries"><Icon name="contacts" />Contacts</NavLink>
                    <NavLink to="/account"><Icon name="profile" />Profile</NavLink>
                    <a href="https://payport.africa" target="_blank" rel="noreferrer"><Icon name="globe" />Website</a>
                </nav>
                <hr />
                <Link to="/help" className="pp-sidehelp">
                    <Icon name="plusSquare" />
                    <span style={{ flex: 1 }}><b>Need help?</b><small>Support, FAQs & policies</small></span>
                    <Icon name="chevronRight" size={18} />
                </Link>
                <div className="pp-nav pp-logout"><button onClick={signOut}><Icon name="logout" />Logout</button></div>
            </aside>
            <div className="pp-main">
                <header className="pp-top">
                    <button className="pp-burger" onClick={() => setOpen(true)} aria-label="Menu"><Icon name="menu" size={26} /></button>
                    <button className="pp-bell" onClick={openActivity} aria-label="Notifications"><Icon name="bell" size={26} />{unread && <i />}</button>
                    <span className="pp-topsep" />
                    <div style={{ position: 'relative' }}>
                        <button className="pp-user" onClick={() => setMenu(m => !m)}>
                            <span className="pp-avatar">{first[0]?.toUpperCase()}</span>
                            <span className="pp-uname">{first}</span>
                            <Icon name="chevronDown" size={18} />
                        </button>
                        {menu && <div className="pp-menu">
                            <Link to="/account">Profile</Link>
                            <button onClick={signOut}>Logout</button>
                        </div>}
                    </div>
                </header>
                <main className="pp-content" onClick={() => open && setOpen(false)}>{children}</main>
            </div>
        </div>
    );
}

/** Title row with a back arrow, for pages inside the customer area. */
export function BackBar({ title, to = '/' }) {
    return <div className="pp-backbar"><Link to={to} aria-label="Back"><Icon name="back" size={24} /></Link><h1>{title}</h1></div>;
}

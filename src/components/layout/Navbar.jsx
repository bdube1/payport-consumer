import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { authApi } from '../../lib/api';
import Logo from './Logo';
import { useTheme } from '../../lib/theme.jsx';

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);

    const handleLogout = () => {
        authApi.logout();
        logout();
        navigate('/');
        setMenuOpen(false);
    };

    const navLinks = [
        { to: '/', label: 'Home' },
        { to: '/airtime', label: 'Airtime' },
        { to: '/data', label: 'Data' },
        { to: '/bills', label: 'Bills' },
        { to: '/status', label: 'Track Order' },
        ...(user ? [{ to: '/wallet', label: 'Wallet' }, { to: '/history', label: 'My History' }, { to: '/beneficiaries', label: 'Beneficiaries' }, { to: '/account', label: 'Account' }] : []),
        { to: '/help', label: 'Help' },
    ];

    const isActive = (path) => location.pathname === path;
    const { dark, toggle } = useTheme();
    const themeButton = (
        <button onClick={toggle} title={dark ? 'Light mode' : 'Dark mode'} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} style={{
            width: 40, height: 40, borderRadius: 10, border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0,
        }}>{dark ? '☀' : '☾'}</button>
    );

    return (
        <nav style={{
            position: 'sticky', top: 0, zIndex: 1000,
            background: 'var(--nav-bg-glass)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(6,163,218,0.12)',
            boxShadow: '0 2px 20px rgba(6,163,218,0.08)',
        }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', height: 80 }}>
                {/* Logo — only thing on the left */}
                <div onClick={() => navigate('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <Logo size={62} />
                </div>

                {/* Everything else lives in this right-aligned group */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginLeft: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="hide-mobile">
                        {navLinks.map(link => (
                            <Link key={link.to} to={link.to} style={{
                                padding: '8px 14px', borderRadius: 8, fontWeight: 600, fontSize: 14,
                                textDecoration: 'none', transition: 'all 0.2s', position: 'relative',
                                color: isActive(link.to) ? '#06A3DA' : 'var(--text-2)',
                                background: isActive(link.to) ? 'rgba(6,163,218,0.1)' : 'transparent',
                            }}>
                                {link.label}
                            </Link>
                        ))}
                        <a href="https://www.payport.africa" style={{
                            padding: '8px 14px', borderRadius: 8, fontWeight: 600, fontSize: 14,
                            textDecoration: 'none', color: 'var(--text-2)',
                        }}>Website</a>
                    </div>

                    {/* Auth buttons */}
                    {!user ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} className="hide-mobile">
                            <Link to="/login" style={{
                                padding: '9px 18px', borderRadius: 10, fontWeight: 600, fontSize: 14,
                                textDecoration: 'none', border: '1.5px solid #06A3DA', color: '#06A3DA',
                                transition: 'all 0.2s',
                            }}>Sign In</Link>
                            <Link to="/register" style={{
                                padding: '9px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14,
                                textDecoration: 'none', background: 'linear-gradient(135deg, #06A3DA, #0487b8)', color: 'white',
                            }}>Register</Link>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} className="hide-mobile">
                            <div style={{
                                width: 36, height: 36, borderRadius: '50%',
                                background: 'linear-gradient(135deg, #06A3DA, #34AD54)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontWeight: 700, fontSize: 15,
                            }}>
                                {user.fullName?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                                {user.fullName?.split(' ')[0]}
                            </span>
                            <button onClick={handleLogout} style={{
                                padding: '7px 16px', borderRadius: 8, border: '1.5px solid rgba(229,62,62,0.4)',
                                background: 'transparent', color: '#e53e3e', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                            }}>Logout</button>
                        </div>
                    )}

                    {themeButton}

                    {/* Mobile hamburger */}
                    <button onClick={() => setMenuOpen(!menuOpen)} className="show-mobile" style={{
                        width: 40, height: 40, borderRadius: 8, border: '1px solid var(--border)',
                        background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 5,
                    }}>
                        <span style={{ width: 20, height: 2, background: 'var(--text)', borderRadius: 2 }} />
                        <span style={{ width: 20, height: 2, background: 'var(--text)', borderRadius: 2 }} />
                        <span style={{ width: 20, height: 2, background: 'var(--text)', borderRadius: 2 }} />
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {menuOpen && (
                <div className="show-mobile" style={{
                    background: 'var(--bg-card)', borderTop: '1px solid var(--border)',
                    padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                    {navLinks.map(link => (
                        <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)} style={{
                            padding: '12px 16px', borderRadius: 10, fontWeight: 600, fontSize: 15,
                            textDecoration: 'none', color: isActive(link.to) ? '#06A3DA' : 'var(--text)',
                            background: isActive(link.to) ? 'rgba(6,163,218,0.1)' : 'transparent',
                        }}>
                            {link.label}
                        </Link>
                    ))}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4, display: 'flex', gap: 10 }}>
                        {!user ? (
                            <>
                                <Link to="/login" onClick={() => setMenuOpen(false)} style={{
                                    flex: 1, padding: '12px', borderRadius: 10, textAlign: 'center',
                                    textDecoration: 'none', border: '1.5px solid #06A3DA', color: '#06A3DA', fontWeight: 600,
                                }}>Sign In</Link>
                                <Link to="/register" onClick={() => setMenuOpen(false)} style={{
                                    flex: 1, padding: '12px', borderRadius: 10, textAlign: 'center',
                                    textDecoration: 'none', background: '#06A3DA', color: 'white', fontWeight: 700,
                                }}>Register</Link>
                            </>
                        ) : (
                            <button onClick={handleLogout} style={{
                                flex: 1, padding: '12px', borderRadius: 10, border: 'none',
                                background: 'rgba(229,62,62,0.1)', color: '#e53e3e', fontWeight: 600, cursor: 'pointer',
                            }}>Logout ({user.fullName?.split(' ')[0]})</button>
                        )}
                    </div>
                    <a href="https://www.payport.africa" onClick={() => setMenuOpen(false)} style={{
                        marginTop: 4, padding: '12px', borderRadius: 10, textAlign: 'center',
                        textDecoration: 'none', border: '1.5px solid var(--border)', color: 'var(--text-2)', fontWeight: 600,
                    }}>Website</a>
                </div>
            )}
        </nav>
    );
}

import Logo from './Logo';

export default function Footer() {
    const year = new Date().getFullYear();
    return (
        <footer style={{ background: '#091E3E', color: 'rgba(255,255,255,0.75)' }}>
            <div style={{
                maxWidth: 1160, margin: '0 auto', display: 'grid',
                gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 40, padding: '64px 24px 40px',
            }} className="pp-footer-top">
                {/* Brand */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <a href="https://www.payport.africa"><Logo size={60} /></a>
                    <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, maxWidth: 280 }}>
                        Technology &amp; financial solutions built for how people and businesses in Zimbabwe actually work.
                    </p>
                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                        <a href="https://x.com/Payportfin" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" style={socialStyle} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="#000000"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        </a>
                        <a href="https://web.facebook.com/PayportFin/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" style={socialStyle} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}>
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="#1877F2"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94z"/></svg>
                        </a>
                        <a href="https://www.linkedin.com/company/105393711/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" style={socialStyle} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.45 20.45h-3.56v-5.58c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56z"/></svg>
                        </a>
                        <a href="https://www.instagram.com/payportfin/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" style={socialStyle} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}>
                            <svg width="17" height="17" viewBox="0 0 24 24">
                                <defs>
                                    <linearGradient id="ig-grad-consumer" x1="0%" y1="100%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#F58529" />
                                        <stop offset="35%" stopColor="#DD2A7B" />
                                        <stop offset="70%" stopColor="#8134AF" />
                                        <stop offset="100%" stopColor="#515BD4" />
                                    </linearGradient>
                                </defs>
                                <path fill="url(#ig-grad-consumer)" d="M12 2c-2.72 0-3.06.01-4.13.06-1.07.05-1.8.22-2.43.47-.66.26-1.22.6-1.77 1.15-.55.55-.9 1.11-1.15 1.77-.25.64-.42 1.36-.47 2.43C2 8.94 2 9.28 2 12s.01 3.06.06 4.13c.05 1.07.22 1.8.47 2.43.26.66.6 1.22 1.15 1.77.55.55 1.11.9 1.77 1.15.64.25 1.36.42 2.43.47C8.94 22 9.28 22 12 22s3.06-.01 4.13-.06c1.07-.05 1.8-.22 2.43-.47.66-.26 1.22-.6 1.77-1.15.55-.55.9-1.11 1.15-1.77.25-.64.42-1.36.47-2.43.05-1.07.06-1.41.06-4.13s-.01-3.06-.06-4.13c-.05-1.07-.22-1.8-.47-2.43-.26-.66-.6-1.22-1.15-1.77-.55-.55-1.11-.9-1.77-1.15-.64-.25-1.36-.42-2.43-.47C15.06 2.01 14.72 2 12 2zm0 1.8c2.67 0 2.99.01 4.04.06.98.04 1.51.21 1.86.34.47.18.8.4 1.15.75.35.35.57.68.75 1.15.14.35.3.88.34 1.86.05 1.05.06 1.37.06 4.04s-.01 2.99-.06 4.04c-.04.98-.21 1.51-.34 1.86-.18.47-.4.8-.75 1.15-.35.35-.68.57-1.15.75-.35.14-.88.3-1.86.34-1.05.05-1.37.06-4.04.06s-2.99-.01-4.04-.06c-.98-.04-1.51-.21-1.86-.34-.47-.18-.8-.4-1.15-.75-.35-.35-.57-.68-.75-1.15-.14-.35-.3-.88-.34-1.86C3.8 14.99 3.8 14.67 3.8 12s.01-2.99.06-4.04c.04-.98.21-1.51.34-1.86.18-.47.4-.8.75-1.15.35-.35.68-.57 1.15-.75.35-.14.88-.3 1.86-.34C7.01 3.8 7.33 3.8 12 3.8zm0 3.05a5.15 5.15 0 1 0 0 10.3 5.15 5.15 0 0 0 0-10.3zm0 8.5a3.35 3.35 0 1 1 0-6.7 3.35 3.35 0 0 1 0 6.7zm6.56-8.7a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0z"/>
                            </svg>
                        </a>
                    </div>
                </div>

                {/* Products */}
                <div>
                    <h4 style={colTitle}>Products</h4>
                    <a href="https://www.payport.africa/products/pay" style={colLink}>Payport Pay</a>
                    <a href="https://www.payport.africa/products/gateway" style={colLink}>Payport Gateway</a>
                    <a href="https://www.payport.africa/products/school" style={colLink}>Payport School</a>
                    <a href="https://www.payport.africa/products/books" style={colLink}>Payport Books</a>
                    <a href="https://www.payport.africa/products/docs" style={colLink}>Payport Docs</a>
                </div>

                {/* Company */}
                <div>
                    <h4 style={colTitle}>Company</h4>
                    <a href="https://www.payport.africa/about" style={colLink}>About</a>
                    <a href="https://www.payport.africa/contact" style={colLink}>Contact</a>
                    <a href="https://www.payport.africa/privacy" style={colLink}>Privacy Policy</a>
                    <a href="https://www.payport.africa/terms" style={colLink}>Terms of Service</a>
                </div>

                {/* Get in touch */}
                <div>
                    <h4 style={colTitle}>Get in touch</h4>
                    <p style={contactLine}>232 Herbert Chitepo, Harare</p>
                    <p style={contactLine}>+263 71 918 3557</p>
                    <p style={contactLine}>info@payport.africa</p>
                </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                <div style={{
                    maxWidth: 1160, margin: '0 auto', padding: '20px 24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
                    fontSize: 13, color: 'rgba(255,255,255,0.5)',
                }}>
                    <span>© {year} Payport. All rights reserved.</span>
                    <a href="https://www.payport.africa" style={{ fontFamily: 'Rubik, sans-serif', fontWeight: 600, color: '#06A3DA', fontSize: 13, textDecoration: 'none' }}>
                        payport.africa →
                    </a>
                </div>
            </div>
        </footer>
    );
}

const colTitle = { color: 'white', fontSize: 14, marginBottom: 16, letterSpacing: '0.02em', fontFamily: 'Rubik, sans-serif', fontWeight: 700 };
const colLink = { display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 10, textDecoration: 'none' };
const contactLine = { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 10 };
const socialStyle = {
    width: 34, height: 34, borderRadius: '50%', background: '#ffffff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    textDecoration: 'none', transition: 'transform 0.15s',
    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
};

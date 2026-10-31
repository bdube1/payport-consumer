import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { normalizePhone } from '../lib/api';

export default function Login() {
  const navigate = useNavigate();
  const { login, loading } = useAuth();

  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState(() => (new URLSearchParams(window.location.search).get('timeout') ? 'Your session timed out. Please sign in again.' : ''));

  const handleSubmit = async () => {
    setError('');
    if (!phone) { setError('Please enter your mobile number'); return; }
    if (!/^\d{4}$/.test(pin)) { setError('Please enter your 4-digit PIN'); return; }

    const normalized = normalizePhone(phone);
    const result = await login(normalized, pin);
    if (result.success) {
      // Back to where sign-in was asked for (only a path on this site).
      const next = new URLSearchParams(window.location.search).get('next');
      navigate(next && next.startsWith('/') && !next.startsWith('//') ? next : '/', { replace: true });
    } else {
      setError(result.message);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0B1024, #0E1430)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '120px 24px 60px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background effects */}
      <div style={{ position: 'absolute', top: '15%', right: '-8%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,163,218,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '5%', left: '-8%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,173,84,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, opacity: 0.025, backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img src="/images/brand/lockup.png" alt="Payport" style={{ height: 84, width: 'auto', display: 'inline-block', marginBottom: 8 }} />
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 8 }}>Welcome back</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1.5px solid rgba(6,163,218,0.2)',
          borderRadius: 24,
          padding: 40,
          backdropFilter: 'blur(20px)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(6,163,218,0.1)',
        }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'white', marginBottom: 6, letterSpacing: '-0.02em' }}>Sign in to Payport</h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 28 }}>Use your registered mobile number and PIN</p>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 10, padding: '12px 16px', marginBottom: 20,
              color: '#f87171', fontSize: 13,
            }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Mobile Number</label>
            <div style={{ display: 'flex', border: '1.5px solid rgba(6,163,218,0.25)', borderRadius: 12, overflow: 'hidden', background: 'rgba(255,255,255,0.04)' }}>
              <div style={{ padding: '14px 14px', background: 'rgba(6,163,218,0.15)', color: '#38bae8', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, borderRight: '1px solid rgba(6,163,218,0.2)' }}>
                🇿🇼 +263
              </div>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
               
                onKeyDown={e => e.key === 'Enter' && document.getElementById('pin-input').focus()}
                style={{ flex: 1, padding: '14px 14px', background: 'transparent', border: 'none', color: 'white', fontSize: 15, outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={labelStyle}>4-Digit PIN</label>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                id="pin-input"
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                type={showPin ? 'text' : 'password'}
               
                maxLength={4}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                style={{
                  width: '100%', padding: '14px 50px 14px 16px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1.5px solid rgba(6,163,218,0.25)',
                  borderRadius: 12, color: 'white',
                  fontSize: 28, letterSpacing: '0.3em', outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#06A3DA'}
                onBlur={e => e.target.style.borderColor = 'rgba(6,163,218,0.25)'}
              />
              <button onClick={() => setShowPin(!showPin)} style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 16,
              }}>
                {showPin ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button onClick={handleSubmit} disabled={loading} style={{
            width: '100%', padding: '16px',
            background: 'linear-gradient(135deg, #06A3DA, #0487b8)',
            color: 'white', border: 'none', borderRadius: 12,
            fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 20px rgba(6,163,218,0.35)', opacity: loading ? 0.7 : 1,
            transition: 'all 0.2s',
          }}>
            {loading ? '⏳ Signing in...' : 'Sign In →'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ color: '#06A3DA', fontWeight: 600 }}>Create one</Link>
            </p>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 24, paddingTop: 20, textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginBottom: 12 }}>
              Registration is optional — transact as a guest
            </p>
            <Link to="/airtime" style={{
              display: 'inline-block', padding: '10px 24px',
              border: '1px solid rgba(6,163,218,0.25)', borderRadius: 10,
              color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500,
            }}>
              Continue as guest →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block', color: 'rgba(255,255,255,0.5)',
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', marginBottom: 8,
};

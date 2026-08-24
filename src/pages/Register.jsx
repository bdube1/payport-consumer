import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { normalizePhone } from '../lib/api';

export default function Register() {
  const navigate = useNavigate();
  const { register, loading } = useAuth();

  const [form, setForm] = useState({ fullName: '', phone: '', pin: '', confirmPin: '' });
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1=details, 2=pin
  const [showPin, setShowPin] = useState(false);

  const update = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const validateStep1 = () => {
    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      return 'Please enter your full name';
    }
    if (!form.phone) return 'Please enter your mobile number';
    const normalized = normalizePhone(form.phone);
    if (!/^\+263\d{9}$/.test(normalized)) {
      return 'Enter a valid Zimbabwe mobile number (e.g. 0771234567)';
    }
    return null;
  };

  const validateStep2 = () => {
    if (!/^\d{4}$/.test(form.pin)) return 'PIN must be exactly 4 digits';
    if (form.pin !== form.confirmPin) return 'PINs do not match';
    return null;
  };

  const handleStep1 = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError('');
    setStep(2);
  };

  const handleSubmit = async () => {
    const err = validateStep2();
    if (err) { setError(err); return; }
    setError('');

    const normalized = normalizePhone(form.phone);
    const result = await register(form.fullName.trim(), normalized, form.pin);
    if (result.success) {
      navigate('/', { replace: true });
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
      <div style={{ position: 'absolute', top: '20%', right: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,163,218,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', left: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,173,84,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, opacity: 0.025, backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 460, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img src="/images/brand/lockup.png" alt="Payport" style={{ height: 84, width: 'auto', display: 'inline-block', marginBottom: 8 }} />
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 8 }}>Your Zimbabwe payments gateway</p>
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
          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
            {[1, 2].map((s) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', flex: s === 1 ? 1 : 'none' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: step >= s ? 'linear-gradient(135deg, #06A3DA, #0487b8)' : 'rgba(255,255,255,0.08)',
                  border: `2px solid ${step >= s ? '#06A3DA' : 'rgba(255,255,255,0.15)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: step >= s ? 'white' : 'rgba(255,255,255,0.3)',
                  fontSize: 13, fontWeight: 700, flexShrink: 0,
                  boxShadow: step >= s ? '0 4px 16px rgba(6,163,218,0.4)' : 'none',
                  transition: 'all 0.3s',
                }}>
                  {step > s ? '✓' : s}
                </div>
                {s === 1 && (
                  <div style={{ flex: 1, height: 2, background: step > 1 ? '#06A3DA' : 'rgba(255,255,255,0.1)', margin: '0 12px', transition: 'all 0.3s' }} />
                )}
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'white', marginBottom: 6, letterSpacing: '-0.02em' }}>
            {step === 1 ? 'Create your account' : 'Set your PIN'}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 28 }}>
            {step === 1
              ? 'Join Payport — or continue as a guest below'
              : 'Choose a 4-digit PIN to secure your account'
            }
          </p>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 10, padding: '12px 16px', marginBottom: 20,
              color: '#f87171', fontSize: 13,
            }}>
              ⚠️ {error}
            </div>
          )}

          {step === 1 ? (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Full Name</label>
                <input
                  value={form.fullName}
                  onChange={e => update('fullName', e.target.value)}
                  placeholder="e.g. Tinashe Moyo"
                  onKeyDown={e => e.key === 'Enter' && document.getElementById('phone-input').focus()}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#06A3DA'}
                  onBlur={e => e.target.style.borderColor = 'rgba(6,163,218,0.25)'}
                />
              </div>

              <div style={{ marginBottom: 28 }}>
                <label style={labelStyle}>Mobile Number</label>
                <div style={{ display: 'flex', border: '1.5px solid rgba(6,163,218,0.25)', borderRadius: 12, overflow: 'hidden', background: 'rgba(255,255,255,0.04)', transition: 'border-color 0.2s' }}>
                  <div style={{ padding: '14px 14px', background: 'rgba(6,163,218,0.15)', color: '#38bae8', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, borderRight: '1px solid rgba(6,163,218,0.2)' }}>
                    🇿🇼 +263
                  </div>
                  <input
                    id="phone-input"
                    value={form.phone}
                    onChange={e => update('phone', e.target.value)}
                    placeholder="077 123 4567"
                    onKeyDown={e => e.key === 'Enter' && handleStep1()}
                    style={{ flex: 1, padding: '14px 14px', background: 'transparent', border: 'none', color: 'white', fontSize: 15, outline: 'none' }}
                  />
                </div>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 6 }}>
                  You'll use this number to log in
                </p>
              </div>

              <button onClick={handleStep1} disabled={loading} style={btnPrimaryStyle}>
                Continue →
              </button>

              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
                  Already have an account?{' '}
                  <Link to="/login" style={{ color: '#06A3DA', fontWeight: 600 }}>Sign in</Link>
                </p>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 24, paddingTop: 20, textAlign: 'center' }}>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginBottom: 12 }}>
                  Don't want an account?
                </p>
                <Link to="/airtime" style={{
                  display: 'inline-block', padding: '10px 24px',
                  border: '1px solid rgba(6,163,218,0.25)', borderRadius: 10,
                  color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500,
                }}>
                  Continue as guest →
                </Link>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Choose a 4-digit PIN</label>
                <div style={{ position: 'relative' }}>
                  <input
                    value={form.pin}
                    onChange={e => update('pin', e.target.value.replace(/\D/g, '').slice(0, 4))}
                    type={showPin ? 'text' : 'password'}
                    placeholder="• • • •"
                    maxLength={4}
                    onKeyDown={e => e.key === 'Enter' && document.getElementById('confirm-pin').focus()}
                    style={{ ...inputStyle, letterSpacing: '0.3em', fontSize: 24, paddingRight: 50 }}
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

              <div style={{ marginBottom: 28 }}>
                <label style={labelStyle}>Confirm PIN</label>
                <input
                  id="confirm-pin"
                  value={form.confirmPin}
                  onChange={e => update('confirmPin', e.target.value.replace(/\D/g, '').slice(0, 4))}
                  type={showPin ? 'text' : 'password'}
                  placeholder="• • • •"
                  maxLength={4}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  style={{ ...inputStyle, letterSpacing: '0.3em', fontSize: 24 }}
                  onFocus={e => e.target.style.borderColor = '#06A3DA'}
                  onBlur={e => e.target.style.borderColor = 'rgba(6,163,218,0.25)'}
                />
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 6 }}>
                  Never share your PIN with anyone
                </p>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => { setStep(1); setError(''); }} style={{
                  flex: '0 0 auto', padding: '16px 20px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1.5px solid rgba(255,255,255,0.12)',
                  borderRadius: 12, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 14,
                }}>
                  ← Back
                </button>
                <button onClick={handleSubmit} disabled={loading} style={{ ...btnPrimaryStyle, flex: 1 }}>
                  {loading ? '⏳ Creating account...' : '✓ Create Account'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

const labelStyle = {
  display: 'block', color: 'rgba(255,255,255,0.5)',
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', marginBottom: 8,
};

const inputStyle = {
  width: '100%', padding: '14px 16px',
  background: 'rgba(255,255,255,0.05)',
  border: '1.5px solid rgba(6,163,218,0.25)',
  borderRadius: 12, color: 'white', fontSize: 15,
  outline: 'none', transition: 'border-color 0.2s',
};

const btnPrimaryStyle = {
  width: '100%', padding: '16px',
  background: 'linear-gradient(135deg, #06A3DA, #0487b8)',
  color: 'white', border: 'none', borderRadius: 12,
  fontSize: 16, fontWeight: 700, cursor: 'pointer',
  boxShadow: '0 4px 20px rgba(6,163,218,0.35)',
  transition: 'all 0.2s',
};

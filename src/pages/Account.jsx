import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { authApi } from '../lib/api';

const C = { primary: '#06A3DA', green: '#34AD54', dark: '#091E3E', accent: '#091E3E', red: '#e53e3e' };

export default function Account() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [saving, setSaving] = useState(false);

    if (!user) { navigate('/login'); return null; }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        if (!/^\d{4}$/.test(currentPin)) { setError('Enter your current 4-digit PIN'); return; }
        if (!/^\d{4}$/.test(newPin)) { setError('New PIN must be exactly 4 digits'); return; }
        if (newPin !== confirmPin) { setError('New PINs do not match'); return; }
        if (newPin === currentPin) { setError('Choose a PIN different from your current one'); return; }

        setSaving(true);
        try {
            await authApi.changePin(currentPin, newPin);
            setSuccess('PIN changed successfully');
            setCurrentPin(''); setNewPin(''); setConfirmPin('');
        } catch (e) {
            setError(e.response?.data?.message || 'Could not change PIN. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const inputStyle = {
        width: '100%', padding: '14px 16px', fontSize: 20, letterSpacing: 8, textAlign: 'center',
        border: `1px solid ${C.dark}22`, borderRadius: 10, outline: 'none', boxSizing: 'border-box',
        fontWeight: 700, color: C.dark,
    };

    return (
        <div style={{ maxWidth: 460, margin: '0 auto', padding: '40px 20px' }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: C.dark, marginBottom: 4 }}>Account</h1>
            <p style={{ color: '#5b6b82', fontSize: 14, marginBottom: 28 }}>{user.fullName} · {user.phone}</p>

            <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 2px 20px rgba(6,163,218,0.08)', border: `1px solid ${C.primary}15` }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 20 }}>Change PIN</h2>

                {error && (
                    <div style={{ background: '#fee2e2', color: C.red, padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>{error}</div>
                )}
                {success && (
                    <div style={{ background: '#dcfce7', color: C.green, padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>{success}</div>
                )}

                <form onSubmit={handleSubmit}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 6 }}>Current PIN</label>
                    <input
                        type="password" inputMode="numeric" maxLength={4} value={currentPin}
                        onChange={e => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        style={{ ...inputStyle, marginBottom: 18 }} placeholder="••••"
                    />

                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 6 }}>New PIN</label>
                    <input
                        type="password" inputMode="numeric" maxLength={4} value={newPin}
                        onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        style={{ ...inputStyle, marginBottom: 18 }} placeholder="••••"
                    />

                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 6 }}>Confirm New PIN</label>
                    <input
                        type="password" inputMode="numeric" maxLength={4} value={confirmPin}
                        onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        style={{ ...inputStyle, marginBottom: 24 }} placeholder="••••"
                    />

                    <button type="submit" disabled={saving} style={{
                        width: '100%', padding: 14, border: 'none', borderRadius: 10,
                        background: C.primary, color: '#fff', fontWeight: 700, fontSize: 15,
                        cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1,
                    }}>
                        {saving ? 'Saving…' : 'Change PIN'}
                    </button>
                </form>
            </div>
        </div>
    );
}

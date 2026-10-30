import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';

// One-time PIN page for WhatsApp: the PIN never goes into the chat.
const TITLES = { LOGIN: 'Enter your PIN', REGISTER: 'Choose your PIN', CHANGE: 'Change your PIN' };
const FIELDS = {
    LOGIN: [['pin', 'PIN']],
    REGISTER: [['pin', 'PIN'], ['confirm', 'PIN again']],
    CHANGE: [['pin', 'Current PIN'], ['newPin', 'New PIN'], ['confirm', 'New PIN again']],
};

const card = { maxWidth: 380, margin: '8vh auto', padding: '32px 26px', background: 'var(--bg-card)', borderRadius: 20, boxShadow: 'var(--shadow)', textAlign: 'center' };
const input = { width: '100%', padding: '14px 16px', fontSize: 24, letterSpacing: 12, textAlign: 'center', borderRadius: 14, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font)', boxSizing: 'border-box' };
const btn = { width: '100%', padding: '14px', border: 'none', borderRadius: 30, background: 'var(--primary)', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-display)' };

export default function ChannelPin() {
    const { token } = useParams();
    const [info, setInfo] = useState(null);
    const [values, setValues] = useState({});
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(null);

    useEffect(() => {
        api.get(`/api/v1/channel-pin/${encodeURIComponent(token)}`)
            .then(r => setInfo(r.data?.data || {}))
            .catch(e => setError(e.response?.data?.message || 'This link is not valid.'));
    }, [token]);

    const fields = FIELDS[info?.purpose] || [];
    const ready = fields.every(([k]) => /^\d{4}$/.test(values[k] || ''));

    const submit = async (e) => {
        e.preventDefault();
        if (!ready || busy) return;
        setBusy(true); setError('');
        try {
            const r = await api.post(`/api/v1/channel-pin/${encodeURIComponent(token)}`, values);
            setDone(r.data?.data || { done: true });
        } catch (x) {
            setError(x.response?.data?.message || 'Please try again.');
            setValues(v => Object.fromEntries(Object.keys(v).map(k => [k, ''])));
        } finally { setBusy(false); }
    };

    const back = (done?.returnUrl || info?.returnUrl);
    return (
        <div style={{ minHeight: '100vh', background: 'var(--page-bg)', padding: '0 16px' }}>
            <div style={card}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--primary)', marginBottom: 18 }}>PayPort</div>
                {done ? (
                    <>
                        <div style={{ fontSize: 44, color: 'var(--secondary)' }}>✓</div>
                        <h1 style={{ fontSize: 20, margin: '8px 0 22px', color: 'var(--text)' }}>Done</h1>
                        {back && <a href={back} style={{ ...btn, display: 'block', textDecoration: 'none' }}>Back to WhatsApp</a>}
                    </>
                ) : !info ? (
                    error ? <p style={{ color: 'var(--danger)', fontSize: 15 }}>{error}</p> : <p style={{ color: 'var(--text)' }}>…</p>
                ) : (
                    <form onSubmit={submit}>
                        <h1 style={{ fontSize: 20, margin: '0 0 22px', color: 'var(--text)' }}>
                            {info.purpose === 'LOGIN' && info.firstName ? `${info.firstName}, enter your PIN` : TITLES[info.purpose]}
                        </h1>
                        {fields.map(([k, label], i) => (
                            <label key={k} style={{ display: 'block', textAlign: 'left', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>
                                {label}
                                <input type="password" inputMode="numeric" autoComplete="off" maxLength={4} autoFocus={i === 0}
                                       value={values[k] || ''} onChange={e => setValues(v => ({ ...v, [k]: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                                       style={{ ...input, marginTop: 6 }} />
                            </label>
                        ))}
                        {error && <p style={{ color: 'var(--danger)', fontSize: 14, margin: '0 0 12px' }}>{error}</p>}
                        <button type="submit" disabled={!ready || busy} style={{ ...btn, opacity: !ready || busy ? 0.5 : 1 }}>{busy ? '…' : 'Continue'}</button>
                    </form>
                )}
            </div>
        </div>
    );
}

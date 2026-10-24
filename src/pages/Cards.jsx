import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { walletApi } from '../lib/api';
import Icon from '../components/shell/Icons';
import { BackBar } from '../components/shell/AppShell';

const msg = (e, f) => e?.response?.data?.message || e?.response?.data?.error?.message || f;
const face = { position: 'relative', overflow: 'hidden', borderRadius: 16, color: '#fff' };
const blob = (s) => ({ position: 'absolute', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', ...s });
const input = { width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 15 };
const lbl = { display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '14px 0 6px' };

export function SchemeMark({ scheme }) {
    return scheme === 'ZIMSWITCH'
        ? <span style={{ fontWeight: 800, fontStyle: 'italic', fontSize: 16 }}>ZimSwitch</span>
        : <span style={{ fontWeight: 900, fontStyle: 'italic', fontSize: 24, letterSpacing: 1 }}>VISA</span>;
}

function useCards() {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const load = useCallback(() => walletApi.cards().then(r => { setData(r.data?.data || { cards: [] }); setError(''); })
        .catch(e => { setData({ cards: [] }); setError(msg(e, 'Could not load your cards.')); }), []);
    useEffect(() => { load(); }, [load]);
    return { data, error, load };
}

/** Cards: physical and virtual, per the app design. */
export default function Cards() {
    const navigate = useNavigate();
    const { data, error, load } = useCards();
    const [form, setForm] = useState('VIRTUAL');
    const [adding, setAdding] = useState(false);
    const shown = (data?.cards || []).filter(c => c.form === form && !['CANCELLED', 'REFUSED'].includes(c.status));
    return (
        <div style={{ maxWidth: 620, position: 'relative', minHeight: 'calc(100vh - 160px)' }}>
            <BackBar title="Cards" />
            <div style={{ display: 'flex', padding: 5, borderRadius: 14, border: '1px solid var(--border)', marginBottom: 18 }}>
                {[['PHYSICAL', 'Physical Cards'], ['VIRTUAL', 'Virtual Cards']].map(([k, t]) => (
                    <button key={k} onClick={() => setForm(k)} style={{ flex: 1, padding: '13px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600,
                        background: form === k ? '#0A5DB5' : 'transparent', color: form === k ? '#fff' : 'var(--text)', fontFamily: 'inherit' }}>{t}</button>
                ))}
            </div>
            {!data && <p style={{ color: 'var(--text-2)' }}>Loading…</p>}
            {error && <p style={{ color: '#e53e3e' }}>{error}</p>}
            {shown.map(c => (
                <button key={c.cardRef} onClick={() => navigate(`/cards/${c.cardRef}`)} style={{ ...face, display: 'block', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                    background: '#004A93', padding: 20, marginBottom: 14, fontFamily: 'inherit' }}>
                    <span style={blob({ width: 170, height: 170, top: -40, left: '40%', borderRadius: 50, transform: 'rotate(35deg)' })} />
                    <span style={blob({ width: 120, height: 120, bottom: -70, left: '62%' })} />
                    <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                        <span style={{ fontSize: 19, fontWeight: 600 }}>Payport</span><Icon name="chevronRight" size={24} />
                    </span>
                    <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 20, position: 'relative' }}>
                        <span><span style={{ display: 'block', fontSize: 11, opacity: 0.85, letterSpacing: 0.5 }}>NICKNAME</span>
                            <span style={{ display: 'block', fontSize: 16, fontWeight: 700, marginTop: 2 }}>{c.nickname || c.nameOnCard || '—'}</span></span>
                        <SchemeMark scheme={c.scheme} />
                    </span>
                </button>
            ))}
            <button onClick={() => setAdding(true)} aria-label="Add card" style={{ position: 'fixed', right: 36, bottom: 110, width: 64, height: 64, borderRadius: '50%', border: 'none',
                background: '#1565D8', color: '#fff', cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="plus" size={32} />
            </button>
            {adding && <AddCard form={form} options={data?.options} onClose={() => setAdding(false)} onDone={() => { setAdding(false); load(); }} />}
        </div>
    );
}

function AddCard({ form, options, onClose, onDone }) {
    const [wallets, setWallets] = useState([]);
    const [scheme, setScheme] = useState('VISA');
    const [nickname, setNickname] = useState('');
    const [address, setAddress] = useState('');
    const [pin, setPin] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => { walletApi.list().then(r => setWallets(r.data?.data?.wallets || [])).catch(() => {}); }, []);
    const schemes = (options?.schemes || [{ scheme: 'VISA' }, { scheme: 'ZIMSWITCH' }]).map(x => x.scheme);
    // VISA: the USD wallet. ZimSwitch (dual interface): the USD and ZWG wallets together.
    const linked = scheme === 'VISA' ? wallets.filter(w => w.currency === 'USD') : wallets.filter(w => w.currency === 'USD' || w.currency === 'ZWG');
    const linkedText = linked.length ? `Linked to your ${linked.map(w => w.currency).join(' and ')} wallet${linked.length > 1 ? 's' : ''}` : scheme === 'VISA' ? 'Open a USD wallet first' : 'Open a USD or ZWG wallet first';
    const ok = linked.length > 0 && nickname.trim() && pin.length >= 4 && (form === 'VIRTUAL' || address.trim().length >= 5) && !busy;
    const submit = async () => {
        setBusy(true); setError('');
        try { await walletApi.requestCard({ scheme, form, nickname: nickname.trim(), deliveryAddress: form === 'PHYSICAL' ? address.trim() : null, pin }); onDone(); }
        catch (e) { setError(msg(e, 'The card could not be requested.')); }
        finally { setBusy(false); }
    };
    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 18, padding: 22, width: '100%', maxWidth: 440 }}>
                <h3 style={{ margin: 0, color: 'var(--text)' }}>New {form === 'VIRTUAL' ? 'virtual' : 'physical'} card</h3>
                {error && <p style={{ color: '#e53e3e', margin: '10px 0 0' }}>{error}</p>}

                <label style={lbl}>Card</label>
                <select style={input} value={scheme} onChange={e => setScheme(e.target.value)}>{schemes.map(s => <option key={s} value={s}>{s === 'ZIMSWITCH' ? 'ZimSwitch' : 'VISA'}</option>)}</select>
                <p style={{ margin: '8px 0 0', fontSize: 13, color: linked.length ? 'var(--text-2)' : '#e53e3e' }}>{linkedText}</p>
                <label style={lbl}>Nickname</label>
                <input style={input} value={nickname} maxLength={40} onChange={e => setNickname(e.target.value)} />
                {form === 'PHYSICAL' && <><label style={lbl}>Delivery address</label><input style={input} value={address} onChange={e => setAddress(e.target.value)} /></>}
                <label style={lbl}>PIN</label>
                <input style={input} type="password" inputMode="numeric" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} />
                <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                    <button onClick={onClose} style={{ flex: 1, padding: 13, borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                    <button disabled={!ok} onClick={submit} style={{ flex: 1, padding: 13, borderRadius: 12, border: 'none', background: ok ? '#06A3DA' : '#9bb', color: '#fff', fontWeight: 700, cursor: ok ? 'pointer' : 'not-allowed' }}>{busy ? '…' : 'Request card'}</button>
                </div>
            </div>
        </div>
    );
}

function PinPrompt({ title, onSubmit, onClose, busy }) {
    const [pin, setPin] = useState('');
    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 18, padding: 22, width: '100%', maxWidth: 340 }}>
                <h3 style={{ margin: '0 0 14px', color: 'var(--text)' }}>{title}</h3>
                <input autoFocus style={{ ...input, textAlign: 'center', fontSize: 22, letterSpacing: 6 }} type="password" inputMode="numeric" maxLength={6} placeholder="PIN"
                    value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} onKeyDown={e => e.key === 'Enter' && pin.length >= 4 && onSubmit(pin)} />
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                    <button disabled={pin.length < 4 || busy} onClick={() => onSubmit(pin)} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: '#06A3DA', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{busy ? '…' : 'Continue'}</button>
                </div>
            </div>
        </div>
    );
}

const group = (pan) => String(pan).replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();

/** One card: number, nickname, expiry, CVV (shown from the issuer with the PIN), block or unblock. */
export function CardDetail() {
    const { ref } = useParams();
    const { data, error, load } = useCards();
    const [secret, setSecret] = useState(null);
    const [show, setShow] = useState({ pan: false, cvv: false });
    const [ask, setAsk] = useState(null);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const c = (data?.cards || []).find(x => x.cardRef === ref);
    const toggle = (k) => {
        if (show[k]) return setShow(s => ({ ...s, [k]: false }));
        if (secret) return setShow(s => ({ ...s, [k]: true }));
        setAsk(k === 'pan' ? 'reveal-pan' : 'reveal-cvv');
    };
    const withPin = async (pin) => {
        setBusy(true); setErr('');
        try {
            if (ask === 'BLOCK' || ask === 'UNBLOCK') { await walletApi.cardAction(c.cardRef, ask, pin); await load(); }
            else { const r = await walletApi.revealCard(c.cardRef, pin); setSecret(r.data?.data || null); setShow(s => ({ ...s, [ask === 'reveal-pan' ? 'pan' : 'cvv']: true })); }
        } catch (e) { setErr(msg(e, 'That did not work.')); }
        finally { setBusy(false); setAsk(null); }
    };
    const last4 = c?.last4 || (c?.maskedPan ? String(c.maskedPan).replace(/\D/g, '').slice(-4) : '');
    const blocked = c?.status === 'FROZEN';
    return (
        <div style={{ maxWidth: 620 }}>
            <BackBar title={c?.form === 'PHYSICAL' ? 'Physical Card' : 'Virtual Card'} to="/cards" />
            {!c ? <p style={{ color: error ? '#e53e3e' : 'var(--text-2)' }}>{error || (data ? 'Card not found.' : 'Loading…')}</p> : <>
                <div style={{ ...face, background: '#1565D8', padding: 22 }}>
                    <span style={blob({ width: 180, height: 180, top: -50, left: '35%' })} />
                    <span style={blob({ width: 140, height: 140, bottom: -60, left: '58%' })} />
                    <div style={{ position: 'relative', fontSize: 19, fontWeight: 600 }}>Payport</div>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, marginTop: 20 }}>
                        <span style={{ fontSize: 21, letterSpacing: 2, fontWeight: 600 }}>{show.pan && secret?.pan ? group(secret.pan) : `xxxx xxxx xxxx ${last4 || 'xxxx'}`}</span>
                        <button onClick={() => toggle('pan')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }} aria-label="Show number"><Icon name={show.pan ? 'eyeOff' : 'eye'} size={24} /></button>
                    </div>
                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 24, gap: 12 }}>
                        <div><div style={{ fontSize: 11, opacity: 0.85 }}>NICKNAME</div><div style={{ fontWeight: 700, marginTop: 3 }}>{c.nickname || c.nameOnCard || '—'}</div></div>
                        <div><div style={{ fontSize: 11, opacity: 0.85 }}>EXPIRY DATE</div><div style={{ fontWeight: 700, marginTop: 3 }}>{(show.pan || show.cvv) && secret?.expiry ? secret.expiry : (c.expiry || '-- / --')}</div></div>
                        <div><div style={{ fontSize: 11, opacity: 0.85 }}>CVV</div>
                            <div style={{ fontWeight: 700, marginTop: 3, display: 'flex', alignItems: 'center', gap: 8 }}>{show.cvv && secret?.cvv ? secret.cvv : '***'}
                                <button onClick={() => toggle('cvv')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }} aria-label="Show CVV"><Icon name={show.cvv ? 'eyeOff' : 'eye'} size={18} /></button></div></div>
                        <SchemeMark scheme={c.scheme} />
                    </div>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '12px 0 0' }}>Linked to {(c.currencies || [c.currency]).join(' and ')} {(c.currencies || []).length > 1 ? 'wallets' : 'wallet'}</p>
                {err && <p style={{ color: '#e53e3e' }}>{err}</p>}
                {c.status === 'ACTIVE' || c.status === 'FROZEN' ? (
                    <button onClick={() => setAsk(blocked ? 'UNBLOCK' : 'BLOCK')} style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 26, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: 16, fontWeight: 700, fontFamily: 'inherit', padding: 0 }}>
                        <span style={{ width: 44, height: 44, borderRadius: '50%', background: '#F28C6B', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="ban" size={22} /></span>
                        {blocked ? 'Unblock Card' : 'Block Card'}
                    </button>
                ) : <p style={{ color: 'var(--text-2)', marginTop: 20 }}>{c.status === 'REQUESTED' ? (c.note || 'Requested') : c.status.charAt(0) + c.status.slice(1).toLowerCase()}</p>}
            </>}
            {ask && <PinPrompt busy={busy} title={ask === 'BLOCK' ? 'Block card' : ask === 'UNBLOCK' ? 'Unblock card' : 'Show card details'} onClose={() => setAsk(null)} onSubmit={withPin} />}
        </div>
    );
}

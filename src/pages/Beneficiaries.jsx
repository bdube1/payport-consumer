import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { beneficiariesApi, normalizePhone } from '../lib/api';
import { fetchActiveBillers } from '../lib/billers';

const C = { primary: '#06A3DA', green: '#34AD54', dark: '#091E3E', accent: '#091E3E', red: '#e53e3e' };

function detectNetwork(phone) {
    const norm = normalizePhone(phone);
    const local = norm.startsWith('+263') ? '0' + norm.substring(4) : norm;
    const prefix = local.substring(0, 3);
    if (prefix === '077' || prefix === '078') return { name: 'Econet', color: '#1d4ed8' };
    if (prefix === '071') return { name: 'NetOne', color: '#FF9800' };
    if (prefix === '073') return { name: 'Telecel', color: '#F44336' };
    return null;
}

export default function Beneficiaries() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [bens, setBens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [filter, setFilter] = useState('ALL');
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState('');

    const [type, setType] = useState('PHONE');
    const [billers, setBillers] = useState([]);
    const [form, setForm] = useState({ name: '', phone: '', billerCode: '', accountRef: '' });

    const load = useCallback(async () => {
        if (!user) { setLoading(false); return; }
        setLoading(true); setLoadError('');
        try {
            const r = await beneficiariesApi.list();
            setBens(r.data?.data || r.data || []);
        } catch {
            setLoadError('Could not load your beneficiaries.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        fetchActiveBillers().then(list => {
            setBillers(list);
            setForm(f => ({ ...f, billerCode: f.billerCode || list[0]?.code || '' }));
        }).catch(() => {});
    }, []);

    const resetForm = () => { setType('PHONE'); setForm({ name: '', phone: '', billerCode: billers[0]?.code || '', accountRef: '' }); setError(''); setEditId(null); };
    const openAdd = () => { resetForm(); setShowForm(true); };
    const openEdit = (b) => {
        setType(b.type || 'PHONE');
        setForm({ name: b.name, phone: b.phone || '', billerCode: b.billerCode || billers[0]?.code || '', accountRef: b.accountRef || '' });
        setEditId(b.id);
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) { setError('Enter a name'); return; }

        let payload = { name: form.name.trim(), type };
        if (type === 'PHONE') {
            const norm = normalizePhone(form.phone);
            if (norm.length < 12) { setError('Enter a valid Zimbabwe phone number'); return; }
            const net = detectNetwork(norm);
            payload = { ...payload, phone: norm, networkName: net?.name, networkColor: net?.color };
        } else {
            if (!form.accountRef.trim()) { setError('Enter the account/meter number'); return; }
            const biller = billers.find(b => b.code === form.billerCode);
            if (!biller) { setError('Select a biller'); return; }
            payload = { ...payload, billerCode: form.billerCode, billerName: biller.name, accountRef: form.accountRef.trim() };
        }

        setSaving(true); setError('');
        try {
            if (editId) {
                const r = await beneficiariesApi.update(editId, payload);
                const updated = r.data?.data || r.data;
                setBens(prev => prev.map(b => b.id === editId ? updated : b));
            } else {
                const r = await beneficiariesApi.create(payload);
                const created = r.data?.data || r.data;
                setBens(prev => [created, ...prev]);
            }
            setShowForm(false); resetForm();
            setSaved(editId ? 'Beneficiary updated' : 'Beneficiary saved');
            setTimeout(() => setSaved(''), 3000);
        } catch (e) {
            setError(e?.response?.data?.error?.message || 'Could not save — check your connection and try again');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        const prev = bens;
        setBens(b => b.filter(x => x.id !== id));
        try { await beneficiariesApi.remove(id); } catch { setBens(prev); alert('Could not remove — please try again.'); }
    };

    const useBeneficiary = (b) => {
        if (b.type === 'BILLS') {
            navigate('/bills', { state: { billerCode: b.billerCode, accountRef: b.accountRef } });
        } else {
            navigate('/airtime', { state: { recipientPhone: b.phone, forSomeoneElse: true } });
        }
    };

    const filtered = bens.filter(b => filter === 'ALL' ? true : (b.type || 'PHONE') === filter);

    return (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>My Beneficiaries</h1>
                    <p style={{ fontSize: 15, color: 'var(--text-2)' }}>Save numbers and bill accounts for quick access</p>
                </div>
                {user && (
                    <button onClick={openAdd} style={{
                        padding: '12px 22px', borderRadius: 12, fontWeight: 700, fontSize: 14,
                        background: `linear-gradient(135deg, ${C.primary}, #0487b8)`,
                        color: 'white', border: 'none', cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(6,163,218,0.35)',
                    }}>
                        + Add Beneficiary
                    </button>
                )}
            </div>

            {!user ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Sign in to manage beneficiaries</h3>
                    <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 24 }}>Your saved contacts follow your account across web and mobile.</p>
                    <button onClick={() => navigate('/login')} style={{ padding: '12px 24px', borderRadius: 12, background: `linear-gradient(135deg, ${C.primary}, #0487b8)`, color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                        Sign In
                    </button>
                </div>
            ) : loading ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-2)' }}>Loading…</div>
            ) : loadError ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)' }}>
                    <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 20 }}>{loadError}</p>
                    <button onClick={load} style={{ padding: '10px 20px', borderRadius: 10, background: C.primary, color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Retry</button>
                </div>
            ) : (
                <>
                    {saved && (
                        <div style={{ background: 'rgba(52,173,84,0.12)', border: '1px solid rgba(52,173,84,0.3)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, color: C.green, fontWeight: 600 }}>
                            {saved}
                        </div>
                    )}

                    {/* Filter row — mirrors the mobile app's Airtime/Data vs Bills split */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                        {['ALL', 'PHONE', 'BILLS'].map(f => (
                            <button key={f} onClick={() => setFilter(f)} style={{
                                padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                border: `1.5px solid ${filter === f ? C.primary : 'var(--border)'}`,
                                background: filter === f ? C.primary : 'var(--bg-card)',
                                color: filter === f ? 'white' : 'var(--text-2)',
                            }}>
                                {f === 'ALL' ? 'All' : f === 'PHONE' ? 'Airtime & Data' : 'Bills'}
                            </button>
                        ))}
                    </div>

                    {/* Add/Edit Form */}
                    {showForm && (
                        <div style={{ background: 'var(--bg-card)', border: `2px solid ${C.primary}`, borderRadius: 20, padding: '28px 28px', marginBottom: 28, boxShadow: '0 8px 32px rgba(6,163,218,0.12)' }}>
                            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>
                                {editId ? 'Edit Beneficiary' : 'New Beneficiary'}
                            </h3>
                            {error && (
                                <div style={{ background: 'rgba(229,62,62,0.1)', border: '1px solid rgba(229,62,62,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: C.red, fontSize: 14 }}>
                                    {error}
                                </div>
                            )}

                            {/* Type selector */}
                            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                                <button onClick={() => setType('PHONE')} style={{
                                    flex: 1, padding: '12px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                    border: `1.5px solid ${type === 'PHONE' ? C.primary : 'var(--border)'}`,
                                    background: type === 'PHONE' ? C.primary : 'var(--bg-2)', color: type === 'PHONE' ? 'white' : 'var(--text-2)',
                                }}>Airtime & Data</button>
                                <button onClick={() => setType('BILLS')} style={{
                                    flex: 1, padding: '12px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                    border: `1.5px solid ${type === 'BILLS' ? C.primary : 'var(--border)'}`,
                                    background: type === 'BILLS' ? C.primary : 'var(--bg-2)', color: type === 'BILLS' ? 'white' : 'var(--text-2)',
                                }}>Bills</button>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Full Name *</label>
                                <input
                                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g. Tendai Moyo"
                                    style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 14, fontFamily: 'Nunito, sans-serif', outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>

                            {type === 'PHONE' ? (
                                <div style={{ marginBottom: 20 }}>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Phone Number *</label>
                                    <input
                                        value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                        placeholder="07X XXX XXXX" type="tel"
                                        style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 14, fontFamily: 'Nunito, sans-serif', outline: 'none', boxSizing: 'border-box' }}
                                    />
                                    {form.phone && (() => {
                                        const net = detectNetwork(form.phone);
                                        return net ? (
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 100, background: 'rgba(52,173,84,0.1)', border: '1px solid rgba(52,173,84,0.25)', marginTop: 10 }}>
                                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.green }} />
                                                <span style={{ fontSize: 13, fontWeight: 600, color: C.green }}>{net.name} detected</span>
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                            ) : (
                                <>
                                    <div style={{ marginBottom: 16 }}>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Biller *</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                            {billers.map(b => (
                                                <button key={b.code} onClick={() => setForm(f => ({ ...f, billerCode: b.code }))} style={{
                                                    padding: '8px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                                                    border: `1.5px solid ${form.billerCode === b.code ? C.primary : 'var(--border)'}`,
                                                    background: form.billerCode === b.code ? C.primary : 'var(--bg-2)',
                                                    color: form.billerCode === b.code ? 'white' : 'var(--text)',
                                                }}>{b.name}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: 20 }}>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                            {billers.find(b => b.code === form.billerCode)?.field || 'Account Number'} *
                                        </label>
                                        <input
                                            value={form.accountRef} onChange={e => setForm(f => ({ ...f, accountRef: e.target.value }))}
                                            placeholder="Enter number"
                                            style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 14, fontFamily: 'Nunito, sans-serif', outline: 'none', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </>
                            )}

                            <div style={{ display: 'flex', gap: 12 }}>
                                <button onClick={() => { setShowForm(false); resetForm(); }} style={{ flex: 1, padding: '13px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text-2)', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                                    Cancel
                                </button>
                                <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '13px', borderRadius: 10, background: `linear-gradient(135deg, ${C.green}, #2a9444)`, color: 'white', border: 'none', fontWeight: 700, cursor: saving ? 'default' : 'pointer', fontSize: 14, opacity: saving ? 0.7 : 1 }}>
                                    {saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Beneficiary'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Empty state */}
                    {filtered.length === 0 && !showForm && (
                        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)' }}>
                            <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>No beneficiaries yet</h3>
                            <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 24 }}>
                                Save numbers and bill accounts you use often to speed up future transactions
                            </p>
                            <button onClick={openAdd} style={{ padding: '12px 24px', borderRadius: 12, background: `linear-gradient(135deg, ${C.primary}, #0487b8)`, color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                                + Add Your First Beneficiary
                            </button>
                        </div>
                    )}

                    {/* Beneficiary cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {filtered.map(b => {
                            const netColor = b.type === 'BILLS' ? C.accent : (b.networkColor || C.primary);
                            return (
                                <div key={b.id} style={{
                                    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 22px',
                                    display: 'flex', alignItems: 'center', gap: 16,
                                    boxShadow: 'var(--shadow)',
                                }}>
                                    <div style={{
                                        width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                                        background: `linear-gradient(135deg, ${netColor}22, ${netColor}44)`,
                                        border: `2px solid ${netColor}44`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 18, fontWeight: 800, color: netColor,
                                    }}>
                                        {b.name.charAt(0).toUpperCase()}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 3 }}>{b.name}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                            {b.type === 'BILLS' ? (
                                                <>
                                                    <span style={{ fontSize: 14, color: 'var(--text-2)', fontFamily: 'monospace' }}>{b.accountRef}</span>
                                                    <span style={{ fontSize: 12, fontWeight: 600, color: netColor }}>{b.billerName}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span style={{ fontSize: 14, color: 'var(--text-2)', fontFamily: 'monospace' }}>{b.phone}</span>
                                                    {b.networkName && <span style={{ fontSize: 12, fontWeight: 600, color: netColor }}>{b.networkName}</span>}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                        <button onClick={() => useBeneficiary(b)} style={{
                                            padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                            background: `linear-gradient(135deg, ${C.primary}, #0487b8)`, color: 'white', border: 'none',
                                            boxShadow: '0 2px 10px rgba(6,163,218,0.25)',
                                        }}>
                                            {b.type === 'BILLS' ? 'Pay Bill' : 'Top Up'}
                                        </button>
                                        <button onClick={() => openEdit(b)} style={{
                                            width: 36, height: 36, borderRadius: 9, cursor: 'pointer',
                                            background: 'var(--bg-2)', color: 'var(--text-2)', border: '1.5px solid var(--border)',
                                        }} title="Edit" aria-label="Edit">✎</button>
                                        <button onClick={() => { if (window.confirm(`Delete ${b.name}?`)) handleDelete(b.id); }} style={{
                                            width: 36, height: 36, borderRadius: 9, cursor: 'pointer',
                                            background: 'rgba(229,62,62,0.08)', color: C.red, border: '1.5px solid rgba(229,62,62,0.25)',
                                        }} title="Delete" aria-label="Delete">✕</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

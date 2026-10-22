import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { walletApi, productsApi, startPayment, paymentError, generateReference, formatAmount, normalizePhone } from '../lib/api';

const C = { primary: '#06A3DA', green: '#34AD54', dark: '#091E3E', muted: '#5a7a8a', red: '#e53e3e', soft: '#EEF9FF' };

const card = { background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 4px 20px rgba(9,30,62,0.06)', border: '1px solid rgba(6,163,218,0.12)' };
const input = { width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 10, border: '2px solid rgba(6,163,218,0.2)', background: C.soft, fontSize: 15, outline: 'none' };
const label = { display: 'block', fontSize: 12, fontWeight: 700, color: C.muted, margin: '12px 0 6px', textTransform: 'uppercase', letterSpacing: '0.04em' };
const btn = (enabled = true, color = C.green) => ({
    padding: '12px 20px', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 14, color: 'white', marginTop: 14,
    background: enabled ? color : '#ccc', cursor: enabled ? 'pointer' : 'not-allowed', width: '100%',
});

const toMinor = (s) => {
    const v = Number(String(s).replace(',', '.'));
    return Number.isFinite(v) && v > 0 ? Math.round(v * 100) : 0;
};
const when = (v) => {
    if (v == null) return '';
    const d = typeof v === 'number' ? new Date(v) : new Date(String(v).replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};
const msg = (e, fallback) => e?.response?.data?.message || fallback;

/** PayPort wallet: balances, top-up, send, convert, cash-out code, statement. */
export default function Wallet() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [state, setState] = useState({ loading: true, enabled: false, wallets: [] });
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [tab, setTab] = useState('topup');
    const [selected, setSelected] = useState('');
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            const r = await walletApi.list();
            const d = r.data?.data || {};
            setState({ loading: false, enabled: !!d.enabled, wallets: d.wallets || [] });
            setSelected(s => s || d.wallets?.[0]?.walletRef || '');
        } catch (e) {
            setState({ loading: false, enabled: false, wallets: [] });
            setError(msg(e, 'Could not load your wallet.'));
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const wallet = state.wallets.find(w => w.walletRef === selected) || state.wallets[0];
    const run = async (fn, ok) => {
        setBusy(true); setError(''); setNotice('');
        try { const r = await fn(); setNotice(ok(r?.data?.data || {})); await load(); }
        catch (e) { setError(msg(e, 'That did not work. Please try again.')); }
        finally { setBusy(false); }
    };

    if (state.loading) return <Page><div style={card}>Loading your wallet…</div></Page>;
    if (!state.enabled && state.wallets.length === 0) {
        return <Page><div style={card}>
            <h3 style={{ marginTop: 0, color: C.dark }}>PayPort Wallet</h3>
            <p style={{ color: C.muted }}>The PayPort wallet is not available yet. You can keep paying with mobile money and cards.</p>
            {error && <p style={{ color: C.red }}>{error}</p>}
        </div></Page>;
    }

    return (
        <Page>
            {error && <div style={{ ...card, borderColor: C.red, color: C.red, marginBottom: 12 }}>{error}</div>}
            {notice && <div style={{ ...card, borderColor: C.green, color: C.green, marginBottom: 12, whiteSpace: 'pre-line' }}>{notice}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
                {state.wallets.map(w => (
                    <button key={w.walletRef} onClick={() => setSelected(w.walletRef)} style={{
                        ...card, textAlign: 'left', cursor: 'pointer',
                        background: w.walletRef === wallet?.walletRef ? `linear-gradient(135deg, ${C.primary}, #0487b8)` : 'white',
                        color: w.walletRef === wallet?.walletRef ? 'white' : C.dark,
                    }}>
                        <div style={{ fontSize: 12, opacity: 0.85 }}>{w.currency} wallet · {w.walletRef}{w.status !== 'ACTIVE' ? ` · ${w.status}` : ''}</div>
                        <div style={{ fontSize: 28, fontWeight: 800, margin: '6px 0' }}>{formatAmount(w.balanceMinor, w.currency)}</div>
                        {w.dailyOutMinor != null && <div style={{ fontSize: 12, opacity: 0.85 }}>
                            Used today {formatAmount(w.usedTodayMinor || 0, w.currency)} of {formatAmount(w.dailyOutMinor, w.currency)}
                        </div>}
                    </button>
                ))}
                {state.enabled && <OpenWallet existing={state.wallets.map(w => w.currency)} busy={busy}
                    onOpen={(ccy) => run(() => walletApi.open(ccy), d => `Your ${d.currency} wallet ${d.walletRef} is ready.`)} />}
            </div>

            {wallet && <>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    {[['topup', 'Top up'], ['send', 'Send'], ['convert', 'Convert'], ['cashout', 'Cash out'], ['statement', 'Statement']].map(([k, t]) => (
                        <button key={k} onClick={() => { setTab(k); setError(''); setNotice(''); }} style={{
                            padding: '9px 16px', borderRadius: 20, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                            border: `2px solid ${tab === k ? C.primary : 'rgba(6,163,218,0.2)'}`,
                            background: tab === k ? 'rgba(6,163,218,0.08)' : 'white', color: C.dark,
                        }}>{t}</button>
                    ))}
                </div>
                <div style={card}>
                    {tab === 'topup' && <TopUp wallet={wallet} user={user} navigate={navigate} setError={setError} />}
                    {tab === 'send' && <Send wallet={wallet} busy={busy} run={run} />}
                    {tab === 'convert' && <Convert wallet={wallet} wallets={state.wallets} busy={busy} run={run} setError={setError} />}
                    {tab === 'cashout' && <CashOut wallet={wallet} busy={busy} run={run} />}
                    {tab === 'statement' && <Statement wallet={wallet} />}
                </div>
            </>}
        </Page>
    );
}

function Page({ children }) {
    return <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 16px 48px' }}>
        <h2 style={{ color: '#091E3E', margin: '0 0 16px' }}>My wallet</h2>
        {children}
    </div>;
}

function OpenWallet({ existing, busy, onOpen }) {
    const options = ['USD', 'ZWG', 'ZMW'].filter(c => !existing.includes(c));
    const [ccy, setCcy] = useState(options[0] || '');
    if (options.length === 0) return null;
    return <div style={{ ...card, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontWeight: 700, color: '#091E3E' }}>Open a wallet</div>
        <select value={ccy} onChange={e => setCcy(e.target.value)} style={{ ...input, marginTop: 8 }}>
            {options.map(o => <option key={o}>{o}</option>)}
        </select>
        <button disabled={busy || !ccy} onClick={() => onOpen(ccy)} style={btn(!busy && !!ccy, C.primary)}>Open {ccy} wallet</button>
    </div>;
}

function TopUp({ wallet, user, navigate, setError }) {
    const [methods, setMethods] = useState([]);
    const [method, setMethod] = useState('');
    const [amount, setAmount] = useState('');
    const [phone, setPhone] = useState(user?.phone || '');
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        productsApi.getPaymentMethods().then(r => {
            const m = (r.data?.data || r.data || []).filter(x => x.isActive && x.code !== 'WALLET');
            setMethods(m); setMethod(m[0]?.code || '');
        }).catch(() => {});
    }, []);
    const cents = toMinor(amount);
    const ok = cents > 0 && method && normalizePhone(phone).length >= 12 && !busy;
    const go = async () => {
        setBusy(true); setError('');
        const ref = generateReference('WEB');
        try {
            await startPayment({ reference: ref, productTypeCode: 'WALLET_TOPUP', recipientIdentifier: wallet.walletRef, amountCents: cents,
                currency: wallet.currency, customerPhone: normalizePhone(phone), channel: 'WEB' },
                { paymentMethodCode: method, customerPhone: normalizePhone(phone) });
            navigate(`/processing/${ref}`);
        } catch (e) {
            setError(paymentError(e, 'Top-up could not be started.').message);
            setBusy(false);
        }
    };
    return <>
        <h4 style={{ margin: 0, color: '#091E3E' }}>Top up {wallet.currency} wallet</h4>
        <span style={label}>Amount ({wallet.currency})</span>
        <input style={input} value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" />
        <span style={label}>Pay with</span>
        <select style={input} value={method} onChange={e => setMethod(e.target.value)}>
            {methods.map(m => <option key={m.code} value={m.code}>{m.name}</option>)}
        </select>
        <span style={label}>Paying phone number</span>
        <input style={input} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+263771234567" />
        <button disabled={!ok} onClick={go} style={btn(ok)}>{busy ? 'Starting…' : `Top up ${cents ? formatAmount(cents, wallet.currency) : ''}`}</button>
    </>;
}

function Send({ wallet, busy, run }) {
    const [to, setTo] = useState('');
    const [amount, setAmount] = useState('');
    const [pin, setPin] = useState('');
    const [clientRef] = useState(() => 'web-' + Date.now().toString(36));
    const cents = toMinor(amount);
    const ok = to.trim().length >= 9 && cents > 0 && pin.length >= 4 && !busy;
    return <>
        <h4 style={{ margin: 0, color: '#091E3E' }}>Send money</h4>
        <span style={label}>To (phone number or wallet number)</span>
        <input style={input} value={to} onChange={e => setTo(e.target.value)} placeholder="+263771234567 or W…" />
        <span style={label}>Amount ({wallet.currency})</span>
        <input style={input} value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" />
        <span style={label}>PIN</span>
        <input style={input} type="password" inputMode="numeric" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} />
        <button disabled={!ok} onClick={() => run(() => walletApi.transfer(to.trim().startsWith('W') ? to.trim() : normalizePhone(to), wallet.currency, cents, pin, clientRef),
            d => `Sent ${formatAmount(d.amountMinor, d.currency)} to ${d.to}. Reference ${d.transferRef}.`).then(() => setPin(''))} style={btn(ok)}>Send</button>
    </>;
}

function Convert({ wallet, wallets, busy, run, setError }) {
    const targets = wallets.filter(w => w.currency !== wallet.currency);
    const [to, setTo] = useState(targets[0]?.currency || '');
    const [amount, setAmount] = useState('');
    const [quote, setQuote] = useState(null);
    const [pin, setPin] = useState('');
    const cents = toMinor(amount);
    if (targets.length === 0) return <p style={{ color: '#5a7a8a' }}>Open a wallet in another currency to convert between your wallets.</p>;
    const getQuote = async () => {
        setError(''); setQuote(null);
        try { const r = await walletApi.quote(wallet.currency, to, cents); setQuote(r.data?.data); }
        catch (e) { setError(msg(e, 'No quote available right now.')); }
    };
    return <>
        <h4 style={{ margin: 0, color: '#091E3E' }}>Convert between your wallets</h4>
        <span style={label}>From {wallet.currency}, amount</span>
        <input style={input} value={amount} onChange={e => { setAmount(e.target.value); setQuote(null); }} inputMode="decimal" placeholder="0.00" />
        <span style={label}>To</span>
        <select style={input} value={to} onChange={e => { setTo(e.target.value); setQuote(null); }}>
            {targets.map(t => <option key={t.currency}>{t.currency}</option>)}
        </select>
        {!quote && <button disabled={!cents || busy} onClick={getQuote} style={btn(!!cents && !busy, '#06A3DA')}>Get quote</button>}
        {quote && <div style={{ marginTop: 14, padding: 14, borderRadius: 10, background: '#EEF9FF' }}>
            <div>You give <b>{formatAmount(quote.amountMinor, quote.from)}</b> and get <b>{formatAmount(quote.convertedMinor, quote.to)}</b></div>
            <div style={{ fontSize: 12, color: '#5a7a8a', marginTop: 4 }}>Rate {quote.rate} · valid until {when(quote.validUntil)}</div>
            <span style={label}>PIN</span>
            <input style={input} type="password" inputMode="numeric" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} />
            <button disabled={pin.length < 4 || busy} onClick={() => run(() => walletApi.convert(quote.quoteRef, pin),
                d => `Converted. ${formatAmount(d.debitedMinor, quote.from)} → ${formatAmount(d.creditedMinor, quote.to)}.`).then(() => { setQuote(null); setPin(''); })}
                style={btn(pin.length >= 4 && !busy)}>Convert now</button>
        </div>}
    </>;
}

function CashOut({ wallet, busy, run }) {
    const [amount, setAmount] = useState('');
    const [pin, setPin] = useState('');
    const [codes, setCodes] = useState([]);
    const refresh = () => walletApi.cashOutCodes().then(r => setCodes(r.data?.data || [])).catch(() => {});
    useEffect(() => { refresh(); }, []);
    const cents = toMinor(amount);
    const ok = cents > 0 && pin.length >= 4 && !busy;
    return <>
        <h4 style={{ margin: 0, color: '#091E3E' }}>Cash out at an agent</h4>
        <p style={{ fontSize: 13, color: '#5a7a8a' }}>Get a one-time code, then give the code and your phone number to a PayPort agent for cash.</p>
        <span style={label}>Amount ({wallet.currency})</span>
        <input style={input} value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" />
        <span style={label}>PIN</span>
        <input style={input} type="password" inputMode="numeric" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} />
        <button disabled={!ok} onClick={() => run(() => walletApi.cashOutCode(wallet.currency, cents, pin),
            d => `Your cash-out code: ${d.code}\nAmount ${formatAmount(d.amountMinor, d.currency)}, valid until ${when(d.expiresAt)}.\nIt works once.`)
            .then(() => { setPin(''); refresh(); })} style={btn(ok)}>Get code</button>
        {codes.length > 0 && <table style={{ width: '100%', marginTop: 16, fontSize: 13, borderCollapse: 'collapse' }}>
            <thead><tr style={{ color: '#5a7a8a', textAlign: 'left' }}><th>Created</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>{codes.map(c => <tr key={c.id} style={{ borderTop: '1px solid #eef' }}>
                <td>{when(c.created_at)}</td><td>{formatAmount(c.amount_minor, c.currency)}</td><td>{c.status}</td>
            </tr>)}</tbody>
        </table>}
    </>;
}

const KIND = { TOPUP: 'Top-up', PAYMENT: 'Payment', P2P_OUT: 'Sent', P2P_IN: 'Received', CASH_IN: 'Cash in', CASH_OUT: 'Cash out', FX_OUT: 'Converted out', FX_IN: 'Converted in', REFUND: 'Refund' };

function Statement({ wallet }) {
    const [rows, setRows] = useState(null);
    useEffect(() => { walletApi.statement(wallet.walletRef).then(r => setRows(r.data?.data || [])).catch(() => setRows([])); }, [wallet.walletRef]);
    if (rows === null) return <p>Loading…</p>;
    if (rows.length === 0) return <p style={{ color: '#5a7a8a' }}>No transactions yet.</p>;
    return <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
        <thead><tr style={{ color: '#5a7a8a', textAlign: 'left' }}><th>Date</th><th>What</th><th>With</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.op_ref + r.kind} style={{ borderTop: '1px solid #eef' }}>
            <td style={{ padding: '6px 0' }}>{when(r.created_at)}</td>
            <td>{KIND[r.kind] || r.kind}</td>
            <td style={{ color: '#5a7a8a' }}>{r.counterparty || ''}</td>
            <td style={{ textAlign: 'right', fontWeight: 700, color: r.direction === 'CR' ? '#34AD54' : '#091E3E' }}>
                {r.direction === 'CR' ? '+' : '−'}{formatAmount(r.amount_minor, r.currency)}
            </td>
        </tr>)}</tbody>
    </table>;
}

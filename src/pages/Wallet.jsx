import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BackBar } from '../components/shell/AppShell';
import QrScan from '../components/shell/QrScan';
import { useAuth } from '../lib/AuthContext';
import Icon from '../components/shell/Icons';
import { walletApi, productsApi, startPayment, paymentError, generateReference, formatAmount, normalizePhone, liveCurrencies } from '../lib/api';

const C = { primary: '#06A3DA', green: '#34AD54', dark: 'var(--text)', muted: 'var(--text-2)', red: '#e53e3e', soft: 'var(--light)' };

const card = { background: 'var(--bg-card)', borderRadius: 16, padding: 20, boxShadow: '0 4px 20px rgba(9,30,62,0.06)', border: '1px solid rgba(6,163,218,0.12)' };
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

const ACTIONS = [['topup', 'Top up'], ['send', 'Send money'], ['cashout', 'Cash out'], ['convert', 'Convert'], ['merchant', 'Pay merchant']];

/** Wallet actions for a registered customer: top up, send, cash out at an agent, convert, pay a merchant by code, cards. */
export default function Wallet() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const [state, setState] = useState({ loading: true, enabled: false, wallets: [] });
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const tab = ACTIONS.some(([k]) => k === params.get('a')) ? params.get('a') : 'topup';
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

            {state.enabled && state.wallets.length === 0 && <OpenWallet existing={[]} busy={busy}
                onOpen={(ccy) => run(() => walletApi.open(ccy), d => `Your ${d.currency} wallet ${d.walletRef} is ready.`)} />}

            {wallet && <>
                <div style={card}>
                    {state.wallets.length > 1 && <WalletPick wallets={state.wallets} value={wallet.walletRef} onChange={setSelected} />}
                    {tab === 'topup' && <TopUp wallet={wallet} user={user} navigate={navigate} setError={setError} />}
                    {tab === 'send' && <Send wallet={wallet} busy={busy} run={run} />}
                    {tab === 'convert' && <Convert wallet={wallet} wallets={state.wallets} busy={busy} run={run} setError={setError} />}
                    {tab === 'cashout' && <CashOut wallet={wallet} busy={busy} run={run} setError={setError} />}
                    {tab === 'merchant' && <PayMerchant wallet={wallet} busy={busy} run={run} setError={setError} />}
                </div>
            </>}
        </Page>
    );
}

function Page({ children }) {
    const [params] = useSearchParams();
    const title = (ACTIONS.find(([k]) => k === params.get('a')) || ACTIONS[0])[1];
    return <div style={{ maxWidth: 760 }}>
        <BackBar title={title} />
        {children}
    </div>;
}

function WalletPick({ wallets, value, onChange }) {
    return <>
        <span style={{ ...label, marginTop: 0 }}>Wallet</span>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${wallets.length}, minmax(0, 1fr))`, gap: 10, marginBottom: 14 }}>
            {wallets.map(w => (
                <button key={w.walletRef} onClick={() => onChange(w.walletRef)} style={{
                    textAlign: 'left', padding: '10px 14px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                    border: `2px solid ${w.walletRef === value ? C.primary : 'rgba(6,163,218,0.2)'}`,
                    background: w.walletRef === value ? 'rgba(6,163,218,0.08)' : 'var(--bg-card)', color: 'var(--text)',
                }}>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 700 }}>{w.currency}</div>
                    <div style={{ fontSize: 17, fontWeight: 800 }}>{formatAmount(w.balanceMinor, w.currency)}</div>
                </button>
            ))}
        </div>
    </>;
}

function OpenWallet({ existing, busy, onOpen }) {
    const [all, setAll] = useState([]);
    useEffect(() => { liveCurrencies().then(setAll); }, []);
    const options = all.filter(c => !existing.includes(c));
    const [ccy, setCcy] = useState('');
    useEffect(() => { if (!options.includes(ccy)) setCcy(options[0] || ''); }, [all.join(), existing.join()]); // eslint-disable-line react-hooks/exhaustive-deps
    if (options.length === 0) return null;
    return <div style={{ ...card, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontWeight: 700, color: 'var(--text)' }}>Open a wallet</div>
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
        <h4 style={{ margin: 0, color: 'var(--text)' }}>Top up {wallet.currency} wallet</h4>
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
    const charge = useCharge('P2P_TRANSFER', wallet, cents);
    const ok = to.trim().length >= 9 && cents > 0 && pin.length >= 4 && !busy;
    return <>
        <h4 style={{ margin: 0, color: 'var(--text)' }}>Send money</h4>
        <span style={label}>To (phone number or wallet number)</span>
        <input style={input} value={to} onChange={e => setTo(e.target.value)} placeholder="+263771234567 or W…" />
        <span style={label}>Amount ({wallet.currency})</span>
        <input style={input} value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" />
        <ChargeLine charge={charge} currency={wallet.currency} />
        <span style={label}>PIN</span>
        <input style={input} type="password" inputMode="numeric" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} />
        <button disabled={!ok} onClick={() => run(() => walletApi.transfer(to.trim().startsWith('W') ? to.trim() : normalizePhone(to), wallet.currency, cents, pin, clientRef),
            d => `Sent ${formatAmount(d.amountMinor, d.currency)} to ${d.toName || d.to}. Reference ${d.transferRef}.`).then(() => setPin(''))} style={btn(ok)}>Send</button>
    </>;
}

function Convert({ wallet, wallets, busy, run, setError }) {
    const targets = wallets.filter(w => w.currency !== wallet.currency);
    const [to, setTo] = useState(targets[0]?.currency || '');
    const [amount, setAmount] = useState('');
    const [quote, setQuote] = useState(null);
    const [pin, setPin] = useState('');
    const cents = toMinor(amount);
    if (targets.length === 0) return <p style={{ color: 'var(--text-2)' }}>Open a wallet in another currency to convert between your wallets.</p>;
    const getQuote = async () => {
        setError(''); setQuote(null);
        try { const r = await walletApi.quote(wallet.currency, to, cents); setQuote(r.data?.data); }
        catch (e) { setError(msg(e, 'No quote available right now.')); }
    };
    return <>
        <h4 style={{ margin: 0, color: 'var(--text)' }}>Convert between your wallets</h4>
        <span style={label}>From {wallet.currency}, amount</span>
        <input style={input} value={amount} onChange={e => { setAmount(e.target.value); setQuote(null); }} inputMode="decimal" placeholder="0.00" />
        <span style={label}>To</span>
        <select style={input} value={to} onChange={e => { setTo(e.target.value); setQuote(null); }}>
            {targets.map(t => <option key={t.currency}>{t.currency}</option>)}
        </select>
        {!quote && <button disabled={!cents || busy} onClick={getQuote} style={btn(!!cents && !busy, '#06A3DA')}>Get quote</button>}
        {quote && <div style={{ marginTop: 14, padding: 14, borderRadius: 10, background: 'var(--light)' }}>
            <div>You give <b>{formatAmount(quote.amountMinor, quote.from)}</b> and get <b>{formatAmount(quote.convertedMinor, quote.to)}</b></div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>Rate {quote.rate} · valid until {when(quote.validUntil)}</div>
            <span style={label}>PIN</span>
            <input style={input} type="password" inputMode="numeric" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} />
            <button disabled={pin.length < 4 || busy} onClick={() => run(() => walletApi.convert(quote.quoteRef, pin),
                d => `Converted. ${formatAmount(d.debitedMinor, quote.from)} → ${formatAmount(d.creditedMinor, quote.to)}.`).then(() => { setQuote(null); setPin(''); })}
                style={btn(pin.length >= 4 && !busy)}>Convert now</button>
        </div>}
    </>;
}

function useCharge(product, wallet, cents) {
    const [charge, setCharge] = useState(null);
    useEffect(() => {
        setCharge(null);
        if (!cents) return undefined;
        const t = setTimeout(() => walletApi.charges(product, wallet.currency, cents).then(r => setCharge(r.data?.data || null)).catch(() => {}), 400);
        return () => clearTimeout(t);
    }, [product, wallet.currency, cents]);
    return charge;
}

function ChargeLine({ charge, currency }) {
    if (!charge || !(charge.chargeMinor || charge.taxMinor)) return null;
    return <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 8 }}>
        Charge {formatAmount(charge.chargeMinor, currency)}{charge.taxMinor ? ` + tax ${formatAmount(charge.taxMinor, currency)}` : ''} · Total {formatAmount(charge.totalMinor, currency)}
    </div>;
}

const codeInput = { ...input, fontSize: 22, letterSpacing: 6, textAlign: 'center', fontFamily: 'monospace' };

function CashOut({ wallet, busy, run, setError }) {
    const [code, setCode] = useState('');
    const [agent, setAgent] = useState(null);
    const [amount, setAmount] = useState('');
    const [pin, setPin] = useState('');
    const [clientRef, setClientRef] = useState(() => 'web-co-' + Date.now().toString(36));
    const cents = toMinor(amount);
    const charge = useCharge('CASH_OUT', wallet, cents);
    const find = async () => {
        setError(''); setAgent(null);
        try { const r = await walletApi.agent(code); setAgent(r.data?.data); }
        catch (e) { setError(msg(e, 'No agent with that code.')); }
    };
    const reset = () => { setCode(''); setAgent(null); setAmount(''); setPin(''); setClientRef('web-co-' + Date.now().toString(36)); };
    if (!agent) return <>
        <h4 style={{ margin: 0, color: 'var(--text)' }}>Cash out at an agent</h4>
        <span style={label}>Agent code</span>
        <input style={codeInput} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="000000" />
        <button disabled={code.length !== 6} onClick={find} style={btn(code.length === 6, C.primary)}>Continue</button>
    </>;
    const ok = cents > 0 && pin.length >= 4 && !busy;
    return <>
        <h4 style={{ margin: 0, color: 'var(--text)' }}>Cash out at an agent</h4>
        <div style={{ marginTop: 12, padding: 14, borderRadius: 10, background: 'var(--light)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Agent {agent.code}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{agent.name}</div>
            {agent.location && <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{agent.location}</div>}
        </div>
        <button onClick={reset} style={{ background: 'none', border: 'none', color: C.primary, fontWeight: 700, cursor: 'pointer', padding: '8px 0' }}>Not this agent</button>
        <span style={label}>Amount ({wallet.currency})</span>
        <input style={input} value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" />
        <ChargeLine charge={charge} currency={wallet.currency} />
        <span style={label}>PIN</span>
        <input style={input} type="password" inputMode="numeric" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} />
        <button disabled={!ok} onClick={() => run(() => walletApi.cashOut(agent.code, wallet.currency, cents, pin, clientRef),
            d => `Collect ${formatAmount(d.amountMinor, d.currency)} cash from ${d.agentName}.\nReference ${d.opRef}.`).then(reset)} style={btn(ok)}>
            Cash out {cents ? formatAmount(cents, wallet.currency) : ''}
        </button>
    </>;
}

function PayMerchant({ wallet, busy, run, setError }) {
    const [code, setCode] = useState('');
    const [merchant, setMerchant] = useState(null);
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [pin, setPin] = useState('');
    const cents = toMinor(amount);
    const charge = useCharge('MERCHANT_PAYMENT', wallet, cents);
    const [mode, setMode] = useState('code');
    const find = async (c) => {
        setError(''); setMerchant(null);
        try { const r = await walletApi.merchant(c); setMerchant(r.data?.data); }
        catch (e) { setError(msg(e, 'No merchant with that code.')); }
    };
    const reset = () => { setCode(''); setMerchant(null); setAmount(''); setNote(''); setPin(''); };
    if (!merchant) return <>
        <h4 style={{ margin: 0, color: 'var(--text)' }}>Pay a merchant</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
            {[['scan', 'qr', 'Scan QR'], ['code', 'keypad', 'Enter code']].map(([k, ic, t]) => (
                <button key={k} onClick={() => setMode(k)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 0', borderRadius: 12, cursor: 'pointer',
                    fontWeight: 700, fontSize: 15, fontFamily: 'inherit', border: `2px solid ${mode === k ? C.primary : 'rgba(6,163,218,0.2)'}`,
                    background: mode === k ? C.primary : 'var(--bg-card)', color: mode === k ? '#fff' : 'var(--text)' }}>
                    <Icon name={ic} size={20} />{t}
                </button>
            ))}
        </div>
        {mode === 'scan' && <QrScan onCode={(c) => { setMode('code'); setCode(c); find(c); }} onError={(m) => setError(m)} />}
        {mode === 'code' && <>
            <span style={label}>Merchant code</span>
            <input style={codeInput} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="000000" />
            <button disabled={code.length !== 6} onClick={() => find(code)} style={btn(code.length === 6, C.primary)}>Continue</button>
        </>}
    </>;
    const takes = !merchant.currencies?.length || merchant.currencies.includes(wallet.currency);
    const ok = takes && cents > 0 && pin.length >= 4 && !busy;
    return <>
        <h4 style={{ margin: 0, color: 'var(--text)' }}>Pay a merchant</h4>
        <div style={{ marginTop: 12, padding: 14, borderRadius: 10, background: 'var(--light)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Merchant {merchant.code}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{merchant.name}</div>
            {merchant.address && <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{merchant.address}</div>}
        </div>
        <button onClick={reset} style={{ background: 'none', border: 'none', color: C.primary, fontWeight: 700, cursor: 'pointer', padding: '8px 0' }}>Not this merchant</button>
        {!takes && <p style={{ color: C.red, fontSize: 13 }}>{merchant.name} takes {merchant.currencies.join(', ')}. Choose that wallet above.</p>}
        <span style={label}>Amount ({wallet.currency})</span>
        <input style={input} value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" />
        <ChargeLine charge={charge} currency={wallet.currency} />
        <span style={label}>Note (optional)</span>
        <input style={input} value={note} onChange={e => setNote(e.target.value)} maxLength={80} />
        <span style={label}>PIN</span>
        <input style={input} type="password" inputMode="numeric" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} />
        <button disabled={!ok} onClick={() => run(() => walletApi.payMerchant(merchant.code, wallet.currency, cents, pin, note.trim() || null),
            d => `Paid ${formatAmount(cents, wallet.currency)} to ${d.merchantName || merchant.name}.`).then(reset)} style={btn(ok)}>
            Pay {cents ? formatAmount(cents, wallet.currency) : ''}
        </button>
    </>;
}


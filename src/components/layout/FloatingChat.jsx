import { useState, useRef, useEffect } from 'react';
import { assistantApi } from '../../lib/api';

// Same keyword-matched FAQ engine as the website's version — kept as a
// separate copy since these are two separate apps, but intentionally identical.
const FAQ = [
    { k: ['airtime', 'top up', 'topup', 'recharge'], a: "You can buy Econet, NetOne or Telecel airtime instantly right here — no account needed. Tap Airtime on the home screen." },
    { k: ['data', 'bundle', 'bundles'], a: "We've got daily, weekly and monthly data bundles for all three networks. Tap Data on the home screen." },
    { k: ['zesa', 'electricity', 'token'], a: "You can buy ZESA tokens right here — enter your meter number and we verify it before you pay." },
    { k: ['dstv', 'gotv', 'tv', 'subscription'], a: "DStv and GOtv renewals are under Bills — enter your smartcard number and we'll confirm the account before payment." },
    { k: ['bill', 'bills', 'telone'], a: "We handle ZESA, DStv, GOtv and TelOne bill payments, all with account verification before you pay. Tap Bills to get started." },
    { k: ['gateway', 'merchant', 'accept payment', 'integrate', 'api', 'checkout'], a: "Payport Gateway lets a business accept EcoCash, OneMoney, ZimSwitch, Visa and Mastercard through one integration. Head to payport.africa/contact to talk to the team." },
    { k: ['school', 'student', 'fees'], a: "Payport School manages students, fees, teachers and school operations. See payport.africa/products/school or /contact." },
    { k: ['book', 'accounting', 'invoice', 'inventory'], a: "Payport Books covers accounting, invoicing and inventory for growing businesses. See payport.africa/products/books." },
    { k: ['doc', 'document', 'file'], a: "Payport Docs keeps business documents organised and access-controlled. See payport.africa/products/docs." },
    { k: ['price', 'cost', 'fee', 'charge', 'how much'], a: "Pricing depends on the product and volume — send details through payport.africa/contact and the team will get you an answer." },
    { k: ['contact', 'phone', 'number', 'email', 'call', 'reach'], a: "You can reach the Payport team on +263 71 918 3557 (WhatsApp too), or info@payport.africa." },
    { k: ['address', 'location', 'office', 'where'], a: "Payport is based at 232 Herbert Chitepo Avenue, Harare, Zimbabwe." },
    { k: ['account', 'sign up', 'register', 'login'], a: "You don't need an account for a one-off payment — just enter a number and pay. Registering is optional and gives you saved beneficiaries and history." },
    { k: ['hi', 'hello', 'hey', 'good morning', 'good afternoon'], a: "Hey! 👋 Ask me about airtime, data, bills, or any of the Payport products." },
    { k: ['thank', 'thanks'], a: "You're welcome! Anything else I can help with?" },
];

function getBotReply(message) {
    const m = message.toLowerCase();
    for (const entry of FAQ) {
        if (entry.k.some(kw => m.includes(kw))) return entry.a;
    }
    return "I don't have a canned answer for that one — WhatsApp us on +263 71 918 3557 or use the contact form on payport.africa and the team will get back to you personally.";
}

export default function FloatingChat() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([
        { from: 'bot', text: "👋 Hi! I'm the Payport assistant. Ask me about airtime, data, bills, or any of our products — or leave a message and the team will follow up." },
    ]);
    const [input, setInput] = useState('');
    const [conversationId, setConversationId] = useState(null);
    const [thinking, setThinking] = useState(false);
    const bodyRef = useRef(null);

    useEffect(() => {
        if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }, [messages, open]);

    const send = async (e) => {
        e.preventDefault();
        if (!input.trim() || thinking) return;
        const question = input;
        setMessages(m => [...m, { from: 'user', text: question }]);
        setInput('');
        setThinking(true);
        let reply;
        try {
            const r = await assistantApi.chat(conversationId, question);
            const d = r.data?.data || r.data || {};
            if (d.conversationId) setConversationId(d.conversationId);
            reply = d.reply;
        } catch { /* answered locally below */ }
        setMessages(m => [...m, { from: 'bot', text: reply || getBotReply(question) }]);
        setThinking(false);
    };

    return (
        <>
            <div style={styles.stack}>
                <button onClick={() => setOpen(o => !o)} aria-label="Chat with Payport" style={{ ...styles.floatBtn, background: 'linear-gradient(135deg, #06A3DA, #6C5CE7)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                </button>
                <a href="https://wa.me/263719183557" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp us" style={{ ...styles.floatBtn, background: '#25D366', textDecoration: 'none' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.1-1.3A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20zm4.4-5.9c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.7.9-.3.2-.5.1a6.5 6.5 0 0 1-1.9-1.2 7.1 7.1 0 0 1-1.3-1.6c-.1-.2 0-.4.1-.5l.4-.4a1.6 1.6 0 0 0 .2-.4.4.4 0 0 0 0-.4c-.1-.1-.5-1.3-.7-1.7s-.4-.4-.5-.4h-.5a.9.9 0 0 0-.6.3 2.7 2.7 0 0 0-.9 2 4.6 4.6 0 0 0 1 2.5 10.6 10.6 0 0 0 4.1 3.6c.6.2 1 .4 1.4.5a3.3 3.3 0 0 0 1.5.1 2.5 2.5 0 0 0 1.6-1.1 2 2 0 0 0 .1-1.1c0-.1-.2-.2-.4-.3z" /></svg>
                </a>
            </div>

            {open && (
                <div style={styles.panel}>
                    <div style={styles.head}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={styles.dot} />
                            <div>
                                <div style={styles.title}>Payport Assistant</div>
                                <div style={styles.status}>Instant answers for common questions</div>
                            </div>
                        </div>
                        <button onClick={() => setOpen(false)} aria-label="Close chat" style={styles.closeBtn}>✕</button>
                    </div>
                    <div ref={bodyRef} style={styles.body}>
                        {messages.map((m, i) => (
                            <div key={i} style={m.from === 'user' ? styles.bubbleUser : styles.bubble}>{m.text}</div>
                        ))}
                    </div>
                    <form onSubmit={send} style={styles.inputRow}>
                        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message..." aria-label="Message" style={styles.input} />
                        <button type="submit" aria-label="Send" style={styles.sendBtn}>→</button>
                    </form>
                </div>
            )}
        </>
    );
}

const styles = {
    stack: { position: 'fixed', right: 22, bottom: 96, zIndex: 300, display: 'flex', flexDirection: 'column', gap: 12 },
    floatBtn: { width: 54, height: 54, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.22)', border: 'none', cursor: 'pointer' },
    panel: { position: 'fixed', right: 22, bottom: 164, zIndex: 300, width: 340, maxWidth: 'calc(100vw - 44px)', background: 'var(--bg-card)', borderRadius: 18, boxShadow: '0 24px 60px rgba(9,30,62,0.22)', border: '1px solid rgba(6,163,218,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    head: { background: '#091E3E', color: 'white', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    dot: { width: 9, height: 9, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 0 3px rgba(52,211,153,0.25)', display: 'inline-block' },
    title: { fontFamily: 'Rubik, sans-serif', fontWeight: 700, fontSize: 13.5 },
    status: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
    closeBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 14 },
    body: { padding: 14, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflowY: 'auto', background: 'var(--bg-2)' },
    bubble: { background: 'var(--bg-card)', border: '1px solid rgba(6,163,218,0.15)', borderRadius: '12px 12px 12px 3px', padding: '10px 13px', fontSize: 13, color: 'var(--text)', maxWidth: '88%', lineHeight: 1.5 },
    bubbleUser: { alignSelf: 'flex-end', background: '#06A3DA', color: 'white', borderRadius: '12px 12px 3px 12px', padding: '10px 13px', fontSize: 13, maxWidth: '88%', lineHeight: 1.5 },
    inputRow: { display: 'flex', gap: 8, padding: 12, borderTop: '1px solid rgba(6,163,218,0.12)' },
    input: { flex: 1, border: '1.5px solid rgba(6,163,218,0.2)', borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'Nunito, sans-serif' },
    sendBtn: { width: 36, height: 36, borderRadius: 10, border: 'none', background: '#06A3DA', color: 'white', fontWeight: 700, cursor: 'pointer' },
};

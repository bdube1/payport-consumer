import { useState } from 'react';

const FAQS = [
  { cat: 'Getting Started', q: 'Do I need to create an account?', a: 'No — you can transact as a guest. Registration is optional and gives you access to transaction history and saved numbers.' },
  { cat: 'Getting Started', q: 'What networks are supported?', a: 'We support Econet, NetOne and Telecel for airtime and data. EcoCash and OneMoney for payments.' },
  { cat: 'Payments', q: 'How do I pay?', a: 'Choose EcoCash or OneMoney, enter your wallet number, and you\'ll receive a USSD prompt to approve the payment on your phone.' },
  { cat: 'Payments', q: 'Is my payment secure?', a: 'Yes. All transactions use bank-grade TLS encryption. We never store your wallet PIN.' },
  { cat: 'Airtime & Data', q: 'How long does delivery take?', a: 'Most airtime and data deliveries complete within 30 seconds after payment confirmation.' },
  { cat: 'Airtime & Data', q: 'Can I top up someone else?', a: 'Yes — on the airtime page select "Someone else" and enter their number. Your payment wallet number will be asked separately.' },
  { cat: 'Tracking', q: 'How do I track my order?', a: 'Use the "Track Order" page and enter the reference shown on your receipt (format: PP-WEB-YYYYMMDD-XXXXXX).' },
  { cat: 'Tracking', q: 'What if my payment shows "Pending"?', a: 'This means we\'re waiting for you to approve the wallet prompt. If you cancelled or it expired, the transaction will auto-timeout and you can try again.' },
  { cat: 'Problems', q: 'I paid but didn\'t receive airtime — what do I do?', a: 'Check the status on the Track Order page. If it shows "Fulfilment Failed", it usually resolves automatically within a few minutes. Contact support at hello@payport.africa with your reference.' },
  { cat: 'Problems', q: 'How do I get a refund?', a: 'Refunds are processed for failed transactions where payment was collected. Email hello@payport.africa with your reference number.' },
];

const CATS = ['All', ...new Set(FAQS.map(f => f.cat))];

export default function Help() {
  const [activecat, setActiveCat] = useState('All');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(null);

  const filtered = FAQS.filter(f =>
    (activecat === 'All' || f.cat === activecat) &&
    (!search || f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--light)', paddingTop: 100 }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(160deg, #0B1024, #0E1430)', padding: '60px 24px', textAlign: 'center', marginBottom: 0 }}>
        <h1 style={{ fontSize: 40, fontWeight: 800, color: 'white', letterSpacing: '-0.03em', marginBottom: 12 }}>How can we help?</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, marginBottom: 32 }}>Search our FAQ or browse by category</p>
        <div style={{ maxWidth: 480, margin: '0 auto', position: 'relative' }}>
          <span style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', fontSize: 18 }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search questions..."
            style={{ width: '100%', padding: '16px 18px 16px 48px', border: 'none', borderRadius: 16, fontSize: 15, outline: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
          />
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>
        {/* Category filter */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 36 }}>
          {CATS.map(cat => (
            <button key={cat} onClick={() => setActiveCat(cat)} style={{
              padding: '8px 20px', border: `1.5px solid ${activecat === cat ? '#06A3DA' : 'rgba(6,163,218,0.2)'}`,
              borderRadius: 100, background: activecat === cat ? '#06A3DA' : 'var(--bg-card)',
              color: activecat === cat ? 'white' : 'var(--text-2)', fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s',
            }}>{cat}</button>
          ))}
        </div>

        {/* FAQ accordion */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((faq, i) => (
            <div key={i} onClick={() => setOpen(open === i ? null : i)} style={{
              background: 'var(--bg-card)', borderRadius: 16, border: `1.5px solid ${open === i ? '#06A3DA' : 'rgba(6,163,218,0.12)'}`,
              overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: open === i ? '0 4px 20px rgba(6,163,218,0.1)' : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px' }}>
                <div>
                  <span style={{ fontSize: 11, color: '#06A3DA', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block' }}>{faq.cat}</span>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{faq.q}</h3>
                </div>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: open === i ? '#06A3DA' : 'var(--light)', color: open === i ? 'white' : '#06A3DA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16, transition: 'all 0.3s', transform: open === i ? 'rotate(180deg)' : 'none' }}>
                  ↓
                </div>
              </div>
              {open === i && (
                <div style={{ padding: '0 24px 20px', borderTop: '1px solid rgba(6,163,218,0.1)' }}>
                  <p style={{ color: 'var(--text-2)', fontSize: 15, lineHeight: 1.7, marginTop: 16 }}>{faq.a}</p>
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-2)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🤔</div>
              <p style={{ fontSize: 16 }}>No results found. Try a different search or email <a href="mailto:hello@payport.africa" style={{ color: '#06A3DA', fontWeight: 600 }}>hello@payport.africa</a></p>
            </div>
          )}
        </div>

        {/* Contact CTA */}
        <div style={{ marginTop: 48, background: 'linear-gradient(160deg, #0B1024, #0E1430)', borderRadius: 20, padding: 36, textAlign: 'center' }}>
          <h3 style={{ color: 'white', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Still need help?</h3>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, marginBottom: 20 }}>Our team is ready to assist you.</p>
          <a href="mailto:hello@payport.africa" style={{ display: 'inline-block', padding: '14px 32px', background: '#06A3DA', color: 'white', borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
            📧 Email Us
          </a>
        </div>
      </div>
    </div>
  );
}

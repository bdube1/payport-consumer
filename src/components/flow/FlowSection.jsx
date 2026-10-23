import { useState, useEffect, useRef } from 'react';

/**
 * A section of a payment flow that collapses into a compact one-line summary
 * once it's filled in, instead of staying fully expanded — this is what keeps
 * the whole flow to roughly one screen instead of a long scroll of finished fields.
 * Tap the summary row to re-open and edit.
 */
export default function FlowSection({ title, subtitle, show = true, done = false, summary, children, accent = '#06A3DA' }) {
    const [expanded, setExpanded] = useState(true);
    const autoCollapsed = useRef(false);

    useEffect(() => {
        if (done && !autoCollapsed.current) {
            setExpanded(false);
            autoCollapsed.current = true;
        }
        if (!done) autoCollapsed.current = false;
    }, [done]);

    if (!show) return null;
    const collapsed = done && !expanded;

    if (collapsed) {
        return (
            <div onClick={() => setExpanded(true)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                padding: '10px 2px', marginBottom: 4, borderBottom: '1px solid rgba(6,163,218,0.08)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: accent, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>✓</span>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
                        {summary && <div style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{summary}</div>}
                    </div>
                </div>
                <span style={{ fontSize: 12, color: accent, fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>Edit</span>
            </div>
        );
    }

    return (
        <div style={{ marginBottom: 18, paddingBottom: 18, borderBottom: '1px solid rgba(6,163,218,0.1)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: subtitle ? 2 : 10 }}>{title}</h3>
            {subtitle && <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10 }}>{subtitle}</p>}
            {children}
        </div>
    );
}

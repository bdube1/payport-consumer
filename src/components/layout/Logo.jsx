// Real Payport logo lockup — used as a single unmodified image, not
// reconstructed from a separate mark + styled text.
import { useTheme } from '../../lib/theme.jsx';

export default function Logo({ size = 36 }) {
    const height = size + 8;
    const { dark } = useTheme();
    if (dark) {
        return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <img src="/images/brand/mark.png" alt="" style={{ height: Math.round(height * 0.7), width: 'auto', display: 'block' }} />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: Math.round(height * 0.38), color: 'var(--text)' }}>Payport</span>
            </span>
        );
    }
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            <img src="/images/brand/lockup.png" alt="Payport" style={{ height, width: 'auto', display: 'block' }} />
        </span>
    );
}

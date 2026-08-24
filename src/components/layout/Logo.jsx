// Real Payport logo lockup — used as a single unmodified image, not
// reconstructed from a separate mark + styled text.
export default function Logo({ size = 36 }) {
    const height = size + 8;
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            <img src="/images/brand/lockup.png" alt="Payport" style={{ height, width: 'auto', display: 'block' }} />
        </span>
    );
}

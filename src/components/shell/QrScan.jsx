import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

/** A PayPort QR: PAYPORT-QR:<token> (current QRs), or an older QR / text holding the six-digit code. */
export function isPayportQr(data) {
    const s = String(data || '').trim();
    return /^PAYPORT-QR:[A-Z]{16}$/i.test(s) || /([1-9]\d{5})(?!.*\d)/.test(s);
}

/** Reads a merchant QR code with the device camera. */
export default function QrScan({ onCode, onError }) {
    const video = useRef(null);
    const canvas = useRef(null);
    const [status, setStatus] = useState('Starting camera…');
    useEffect(() => {
        let stream = null; let raf = 0; let stopped = false;
        const tick = () => {
            if (stopped) return;
            const v = video.current, c = canvas.current;
            if (v && c && v.readyState === v.HAVE_ENOUGH_DATA) {
                c.width = v.videoWidth; c.height = v.videoHeight;
                const ctx = c.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(v, 0, 0, c.width, c.height);
                const img = ctx.getImageData(0, 0, c.width, c.height);
                const hit = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
                if (hit?.data) {
                    if (isPayportQr(hit.data)) { stopped = true; onCode(hit.data.trim()); return; }
                    setStatus('That is not a PayPort merchant QR code.');
                }
            }
            raf = requestAnimationFrame(tick);
        };
        (async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
                if (stopped) { stream.getTracks().forEach(t => t.stop()); return; }
                video.current.srcObject = stream;
                await video.current.play();
                setStatus('Point the camera at the merchant QR code');
                raf = requestAnimationFrame(tick);
            } catch {
                setStatus('');
                onError?.('The camera is not available. Enter the merchant code instead.');
            }
        })();
        return () => { stopped = true; cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach(t => t.stop()); };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return (
        <div style={{ marginTop: 14 }}>
            <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#000', aspectRatio: '4 / 3' }}>
                <video ref={video} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', inset: '15% 25%', border: '3px solid #06A3DA', borderRadius: 18 }} />
            </div>
            <canvas ref={canvas} style={{ display: 'none' }} />
            {status && <p style={{ fontSize: 13, color: 'var(--text-2)', textAlign: 'center', margin: '8px 0 0' }}>{status}</p>}
        </div>
    );
}

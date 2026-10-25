// Line icons (24x24, stroke) for the registered customer area.
const P = (d, k) => <path key={k} d={d} />;
const C = (cx, cy, r, k) => <circle key={k} cx={cx} cy={cy} r={r} />;
const R = (x, y, w, h, rx, k) => <rect key={k} x={x} y={y} width={w} height={h} rx={rx} />;

const PATHS = {
    home: [P('M3 10.5 12 3l9 7.5', 1), P('M5 9.5V21h5v-6h4v6h5V9.5', 2)],
    history: [C(12, 12, 9, 1), P('M12 7v5l3 2', 2)],
    contacts: [C(9, 8, 3.5, 1), P('M2.5 20a6.5 6.5 0 0 1 13 0', 2), P('M16 4.5a3.5 3.5 0 0 1 0 7', 3), P('M18 14a6 6 0 0 1 3.5 6', 4)],
    profile: [C(12, 8, 4, 1), P('M4 21a8 8 0 0 1 16 0', 2)],
    globe: [C(12, 12, 9, 1), P('M3 12h18', 2), P('M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z', 3)],
    plusSquare: [R(3, 3, 18, 18, 4, 1), P('M12 8v8M8 12h8', 2)],
    logout: [P('M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4', 1), P('M15 16l4-4-4-4', 2), P('M19 12H9', 3)],
    bell: [P('M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9', 1), P('M10 20a2 2 0 0 0 4 0', 2)],
    chevronDown: [P('m6 9 6 6 6-6', 1)],
    chevronRight: [P('m9 6 6 6-6 6', 1)],
    eyeOff: [P('M3 3l18 18', 1), P('M10.6 6.1A10 10 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3 3.6', 2), P('M6.6 6.6A17 17 0 0 0 2.5 12S6 18 12 18a9.6 9.6 0 0 0 5.4-1.6', 3), P('M9.9 9.9a3 3 0 0 0 4.2 4.2', 4)],
    eye: [P('M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z', 1), C(12, 12, 3, 2)],
    wallet: [R(3, 6, 18, 13, 3, 1), P('M16 12.5h2', 2), P('M3 9h13a2 2 0 0 1 2 2v0', 3)],
    topup: [R(3.5, 3.5, 17, 17, 4, 1), P('M12 8v8M8 12h8', 2)],
    send: [P('M21.5 2.5 10.5 13.5', 1), P('M21.5 2.5 14.5 21.5l-4-8-8-4z', 2)],
    cashout: [R(2.5, 5.5, 19, 13, 2.5, 1), C(12, 12, 2.6, 2), P('M6 9v.01M18 15v.01', 3), P('M9 21h6', 4)],
    convert: [P('M7 4 3 8l4 4', 1), P('M3 8h14', 2), P('m17 20 4-4-4-4', 3), P('M21 16H7', 4)],
    merchant: [P('M3.5 9 5 4h14l1.5 5', 1), P('M3.5 9h17v1.5a2.8 2.8 0 0 1-5.6 0 2.8 2.8 0 0 1-5.8 0 2.8 2.8 0 0 1-5.6 0z', 2), P('M5 13v7h14v-7', 3), P('M10 20v-4h4v4', 4)],
    airtime: [R(6.5, 2.5, 11, 19, 2.5, 1), P('M11 18h2', 2)],
    data: [P('M5 12.5a10 10 0 0 1 14 0', 1), P('M8.5 16a5 5 0 0 1 7 0', 2), P('M2 9a15 15 0 0 1 20 0', 3), P('M12 19.5h.01', 4)],
    bills: [P('M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z', 1), P('M14 3v5h5', 2), P('M9 13h6M9 17h6M9 9h1', 3)],
    cards: [R(2.5, 5, 19, 14, 2.5, 1), P('M2.5 10h19', 2), P('M6 15h4', 3)],
    info: [C(12, 12, 9, 1), P('M12 11v5', 2), P('M12 8h.01', 3)],
    stats: [P('M5 20V12', 1), P('M10 20V6', 2), P('M15 20v-9', 3), P('M20 20V4', 4)],
    qr: [R(3, 3, 7, 7, 1, 1), R(14, 3, 7, 7, 1, 2), R(3, 14, 7, 7, 1, 3), P('M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3', 4)],
    keypad: [C(6, 5, 1, 1), C(12, 5, 1, 2), C(18, 5, 1, 3), C(6, 11, 1, 4), C(12, 11, 1, 5), C(18, 11, 1, 6), C(6, 17, 1, 7), C(12, 17, 1, 8), C(18, 17, 1, 9), C(12, 22, 0.5, 10)],
    plus: [P('M12 5v14M5 12h14', 1)],
    ban: [C(12, 12, 9, 1), P('M5.6 5.6l12.8 12.8', 2)],
    back: [P('M19 12H5', 1), P('m12 19-7-7 7-7', 2)],
    menu: [P('M4 6h16M4 12h16M4 18h16', 1)],
    close: [P('M6 6l12 12M18 6 6 18', 1)],
    sun: [C(12, 12, 4, 1), P('M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4', 2)],
    moon: [P('M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z', 1)],
};

export default function Icon({ name, size = 22, color = 'currentColor', stroke = 2, style }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke}
            strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0, ...style }} aria-hidden="true">
            {PATHS[name] || null}
        </svg>
    );
}

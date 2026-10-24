import { useEffect, useState } from 'react';
import api, { walletApi, formatAmount, isLoggedIn } from './api';

/** The customer charge for a product payment (Limits & Charges), shown before paying. */
export function useCharge(product, currency, amountCents) {
    const [q, setQ] = useState(null);
    useEffect(() => {
        setQ(null);
        if (!product || !currency || !amountCents) return undefined;
        const t = setTimeout(() => {
            api.get('/api/v1/charges/quote', { params: { product, currency, amountCents, channel: 'WEB' } })
                .then(r => setQ(r.data?.data || null)).catch(() => {});
        }, 350);
        return () => clearTimeout(t);
    }, [product, currency, amountCents]);
    return q;
}

/** Wallet balances of a signed-in customer, by currency. */
export function useWalletBalances() {
    const [b, setB] = useState({});
    useEffect(() => {
        if (!isLoggedIn()) return;
        walletApi.list().then(r => {
            const out = {};
            for (const w of r.data?.data?.wallets || []) out[w.currency] = w.balanceMinor;
            setB(out);
        }).catch(() => {});
    }, []);
    return b;
}

/** "PayPort Wallet · USD 12.00" for the wallet option. */
export function methodLabel(m, balances, currency) {
    if (!m) return '';
    if (m.code !== 'WALLET') return m.name;
    return `PayPort Wallet${currency && balances[currency] != null ? ` · ${formatAmount(balances[currency], currency)}` : ''}`;
}

/** Amount / charge / tax rows for the confirmation, when a charge applies. */
export function chargeRows(q, amountCents, currency) {
    if (!q || !(q.chargeCents || q.taxCents)) return [];
    const rows = [['Amount', formatAmount(amountCents, currency)], ['Charge', formatAmount(q.chargeCents, currency)]];
    if (q.taxCents) rows.push(['Tax', formatAmount(q.taxCents, currency)]);
    return rows;
}

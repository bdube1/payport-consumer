import { useEffect, useState } from 'react';
import api, { walletApi, isLoggedIn } from './api';

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

/** The option's name ("Payport Wallet" for the wallet; balances are shown only on the home page). */
export function methodLabel(m) {
    if (!m) return '';
    return m.code === 'WALLET' ? 'Payport Wallet' : m.name;
}



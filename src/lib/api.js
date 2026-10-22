import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'https://api.payport.africa';
export { BASE };

const api = axios.create({
    baseURL: BASE,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' }
});

// Track if we're already redirecting to prevent multiple redirects
let isRedirecting = false;

// Helper function to redirect to login page
const redirectToLogin = () => {
    if (isRedirecting) return;
    isRedirecting = true;

    // Clear all auth data
    localStorage.removeItem('pp_token');
    localStorage.removeItem('pp_user');

    // Redirect to login page
    window.location.href = '/login';
};

// ===== Per-transaction access tokens =====
// /initiate returns a one-time accessToken for that reference. It must be sent back as
// X-Transaction-Token on /pay and when reading the transaction, otherwise a guest sees
// only the redacted public view (and nothing once the backend enforces the token).
// Kept for the browser session only.
const TX_TOKEN_PREFIX = 'pp_tx_token:';

export function rememberTransactionToken(reference, token) {
    if (!reference || !token) return;
    try { sessionStorage.setItem(TX_TOKEN_PREFIX + reference, token); } catch { /* storage unavailable: header just not sent */ }
}

export function transactionToken(reference) {
    if (!reference) return null;
    try { return sessionStorage.getItem(TX_TOKEN_PREFIX + reference); } catch { return null; }
}

function referenceOf(cfg) {
    const m = /\/api\/v1\/transactions\/([^/?]+)/.exec(cfg.url || '');
    if (m && !['initiate', 'pay', 'my-history'].includes(m[1])) return decodeURIComponent(m[1]);
    if ((cfg.url || '').startsWith('/api/v1/transactions/pay')) {
        const body = typeof cfg.data === 'string' ? safeJson(cfg.data) : cfg.data;
        return body?.reference || null;
    }
    return null;
}

function safeJson(s) {
    try { return JSON.parse(s); } catch { return null; }
}

// A fresh key per payment attempt; reuse it only when retrying the same attempt.
export function newIdempotencyKey() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'idem-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
}

// Attach JWT if available - using Bearer token
api.interceptors.request.use(cfg => {
    const token = localStorage.getItem('pp_token');
    if (token) {
        cfg.headers.Authorization = `Bearer ${token}`;
    }
    const txToken = transactionToken(referenceOf(cfg));
    if (txToken) cfg.headers['X-Transaction-Token'] = txToken;
    return cfg;
});

api.interceptors.response.use(
    res => res,
    err => {
        const data = err.response?.data;
        const code = data?.error?.code || data?.code || null;
        const gwMsg = data?.error?.message
            || data?.message
            || (typeof data?.error === 'string' ? data.error : null)
            || err.message;
        if (err.response) {
            err.response.data = { ...(data || {}), message: gwMsg, code };
        }
        // Only 401 means the session is invalid. 403 is a real answer the customer must see
        // (for example PAYMENT_NOT_ALLOWED), never a reason to log them out.
        if (err.response?.status === 401 && localStorage.getItem('pp_token')) {
            redirectToLogin();
        }
        return Promise.reject(err);
    }
);

/**
 * What to tell the customer when starting a payment fails. Server messages are shown as sent:
 *  - 503 PROVIDER_UNAVAILABLE: "...No money was taken..." -> offer another payment method;
 *  - 403 PAYMENT_NOT_ALLOWED: neutral wording that quotes the reference.
 */
export function paymentError(err, fallback = 'Payment could not be started. Please try again.') {
    const status = err?.response?.status;
    const code = err?.response?.data?.code;
    const message = err?.response?.data?.message || (err?.response ? null : 'No connection. Check your internet and try again.') || fallback;
    return {
        message: message || fallback,
        code,
        // 503 CHANNEL_UNAVAILABLE: payments through this app are paused (switched off in the portal).
        channelUnavailable: code === 'CHANNEL_UNAVAILABLE',
        providerUnavailable: code === 'PROVIDER_UNAVAILABLE' || (status === 503 && code !== 'CHANNEL_UNAVAILABLE'),
        notAllowed: status === 403 || code === 'PAYMENT_NOT_ALLOWED',
    };
}

// Both 07XXXXXXXX and +2637XXXXXXXX → +2637XXXXXXXX
export function normalizePhone(raw) {
    if (!raw) return '';
    let p = raw.replace(/\s+/g, '').replace(/-/g, '');
    if (p.startsWith('+263')) return p;
    if (p.startsWith('263')) return '+' + p;
    if (p.startsWith('0')) return '+263' + p.slice(1);
    if (p.match(/^[7-9]\d{8}$/)) return '+263' + p;
    return p;
}

export function maskPhone(phone) {
    if (!phone) return '';
    const p = normalizePhone(phone);
    return p.slice(0, 5) + '****' + p.slice(-3);
}

export function formatAmount(cents, currency = 'USD') {
    const amt = cents / 100;
    return `${currency} ${amt.toFixed(2)}`;
}

export function generateReference(channel = 'WEB') {
    const d = new Date();
    const date = d.getFullYear().toString() +
        String(d.getMonth() + 1).padStart(2, '0') +
        String(d.getDate()).padStart(2, '0');
    const seq = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
    return `PP-${channel}-${date}-${seq}`;
}

// ===== AUTH =====
export const authApi = {
    register: (data) => api.post('/api/v1/auth/register', data),
    login: (data) => api.post('/api/v1/auth/login', data),
    changePin: (currentValue, newValue) => api.post('/api/v1/account/change-pin', { currentValue, newValue }),
    logout: () => {
        localStorage.removeItem('pp_token');
        localStorage.removeItem('pp_user');
    }
};

// ===== PRODUCTS =====
export const productsApi = {
    getAll: () => api.get('/api/v1/products'),
    detectNetwork: (phone) => api.get(`/api/v1/products/detect-network/${encodeURIComponent(phone)}`),
    getPaymentMethods: () => api.get('/api/v1/products/payment-methods'),
    getDataBundles: (provider, currency = 'USD') =>
        api.get(`/api/v1/products/data-bundles?provider=${provider}&currency=${currency}`),
    // Unified bundle catalogue used by the Data flow (ECONET/TELECEL from DB, NETONE from external API on the backend)
    getBundles: (provider, currency = 'USD') =>
        api.get(`/api/v1/bundles/${provider}?currency=${encodeURIComponent(currency)}`),
};

// ===== BILLS =====
export const billsApi = {
    getCustomerInfo: (merchantCode, accountNumber, currencyCode) =>
        api.post('/api/v1/bills/customer-info', { merchantCode, accountNumber, currencyCode }),
};

// Biller catalogue (label, accountPattern, hint, currencies, limits) and account lookup
// (holderName, acceptedCurrencies, payable / notPayableReason). Public, rate-limited per IP.
export const billersApi = {
    catalogue: () => api.get('/api/v1/billers'),
    lookup: (code, accountNumber, currency, sourcePhone) =>
        api.post(`/api/v1/billers/${encodeURIComponent(code)}/lookup`, { accountNumber, currency, sourcePhone }),
};

// ===== BENEFICIARIES =====
// Centralised server-side — was previously localStorage-only, which is why
// beneficiaries created on mobile never appeared here for the same user.
export const beneficiariesApi = {
    list: () => api.get('/api/v1/beneficiaries'),
    create: (payload) => api.post('/api/v1/beneficiaries', payload),
    update: (id, payload) => api.put(`/api/v1/beneficiaries/${id}`, payload),
    remove: (id) => api.delete(`/api/v1/beneficiaries/${id}`),
};

// ===== TRANSACTIONS =====
export const transactionsApi = {
    initiate: (payload, idempotencyKey) => api.post('/api/v1/transactions/initiate', payload,
        { headers: { 'Idempotency-Key': idempotencyKey || newIdempotencyKey() } }),
    pay: (payload, idempotencyKey) => api.post('/api/v1/transactions/pay', payload,
        { headers: { 'Idempotency-Key': idempotencyKey || newIdempotencyKey() } }),
    getStatus: (ref) => api.get(`/api/v1/transactions/${ref}`),
    getOutcome: (ref, waitSeconds = 0) => api.get(`/api/v1/transactions/${ref}/outcome?waitSeconds=${waitSeconds}`),
    getTimeline: (ref) => api.get(`/api/v1/transactions/${ref}/timeline`),
    getMyHistory: (page = 0, size = 20) => api.get(`/api/v1/transactions/my-history?page=${page}&size=${size}`),
    confirmOmariOtp: (ref, otp) => api.post(`/api/v1/transactions/${ref}/confirm-omari-otp`, { otp }),
};

/**
 * Initiate + pay as one attempt: one Idempotency-Key for each call of this attempt (a network
 * retry of the same attempt cannot submit twice), and the access token kept for the reference.
 */
export async function startPayment(initiatePayload, payPayload) {
    const attempt = newIdempotencyKey();
    const init = await transactionsApi.initiate(initiatePayload, attempt + ':initiate');
    const tx = init.data?.data || init.data;
    rememberTransactionToken(initiatePayload.reference, tx?.accessToken);
    const { pin, ...pay } = payPayload;
    if (pay.paymentMethodCode === 'WALLET') {
        // Paid from the signed-in holder's wallet, confirmed with their PIN (never sent to /transactions/pay).
        const paid = await walletApi.pay(initiatePayload.reference, pin);
        return paid.data?.data || paid.data;
    }
    const paid = await transactionsApi.pay({ ...pay, reference: initiatePayload.reference }, attempt + ':pay');
    return paid.data?.data || paid.data;
}

/** The PayPort wallet is offered only to a signed-in customer. */
export function visibleMethods(methods) {
    return isLoggedIn() ? methods : methods.filter(m => m.code !== 'WALLET');
}

// ===== WALLET (Phase 8; switched on by PayPort when licensed) =====
export const walletApi = {
    list: () => api.get('/api/v1/wallet'),
    open: (currency) => api.post('/api/v1/wallet/open', { currency }),
    statement: (ref, limit = 100) => api.get(`/api/v1/wallet/${encodeURIComponent(ref)}/statement?limit=${limit}`),
    transfer: (to, currency, amountMinor, pin, clientRef) => api.post('/api/v1/wallet/transfers', { to, currency, amountMinor, pin, clientRef }),
    pay: (reference, pin) => api.post('/api/v1/wallet/pay', { reference, pin }),
    payCheckout: (sessionId, pin) => api.post('/api/v1/wallet/pay-checkout', { sessionId: Number(sessionId), pin }),
    quote: (from, to, amountMinor) => api.post('/api/v1/wallet/fx/quotes', { from, to, amountMinor }),
    convert: (quoteRef, pin) => api.post('/api/v1/wallet/fx/conversions', { quoteRef, pin }),
    cashOutCode: (currency, amountMinor, pin) => api.post('/api/v1/wallet/cash-out-codes', { currency, amountMinor, pin }),
    cashOutCodes: () => api.get('/api/v1/wallet/cash-out-codes'),
};

// Merchants Module, Phase 1 -- the hosted checkout page. Deliberately
// unauthenticated (a customer completing a merchant's checkout has no
// Payport account or token), talking to the public /api/v1/checkout/**
// endpoints, not the customer transactionsApi above.
export const checkoutApi = {
    getSession: (sessionId) => api.get(`/api/v1/checkout/${sessionId}`),
    pay: (sessionId, payload) => api.post(`/api/v1/checkout/${sessionId}/pay`, payload),
};

export const paymentLinkApi = {
    getInfo: (slug) => api.get(`/api/v1/pay/${slug}`),
    start: (slug, amountCents) => api.post(`/api/v1/pay/${slug}/start`, amountCents ? { amountCents } : {}),
};

// Helper function to check if user is logged in
export const isLoggedIn = () => {
    return !!localStorage.getItem('pp_token');
};

// Helper function to get current user from localStorage
export const getCurrentUser = () => {
    const userStr = localStorage.getItem('pp_user');
    try {
        return userStr ? JSON.parse(userStr) : null;
    } catch {
        return null;
    }
};

export default api;

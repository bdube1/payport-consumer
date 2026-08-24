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

// Attach JWT if available - using Bearer token
api.interceptors.request.use(cfg => {
    const token = localStorage.getItem('pp_token');
    if (token) {
        cfg.headers.Authorization = `Bearer ${token}`;
    }
    return cfg;
});

api.interceptors.response.use(
    res => res,
    err => {
        // Only a real 401/403 means the session is actually invalid -- a
        // timeout or network hiccup on some unrelated call should never
        // force a logout.
        if (err.response?.status === 401 || err.response?.status === 403) {
            redirectToLogin();
            return Promise.reject(err);
        }

        const gwMsg = err.response?.data?.error?.message
            || err.response?.data?.message
            || err.response?.data?.error
            || err.message;
        if (gwMsg && err.response) {
            err.response.data = { ...err.response.data, message: gwMsg };
        }
        return Promise.reject(err);
    }
);

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
    initiate: (payload) => api.post('/api/v1/transactions/initiate', payload),
    pay: (payload) => api.post('/api/v1/transactions/pay', payload),
    getStatus: (ref) => api.get(`/api/v1/transactions/${ref}`),
    getTimeline: (ref) => api.get(`/api/v1/transactions/${ref}/timeline`),
    getMyHistory: (page = 0, size = 20) => api.get(`/api/v1/transactions/my-history?page=${page}&size=${size}`),
    confirmOmariOtp: (ref, otp) => api.post(`/api/v1/transactions/${ref}/confirm-omari-otp`, { otp }),
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

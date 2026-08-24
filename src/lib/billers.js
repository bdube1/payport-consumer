import { productsApi, BASE } from './api';

// Single source of truth for biller display metadata — shared by Bills.jsx
// and Beneficiaries.jsx so they can never drift apart the way they did
// before (Bills used to fetch live from the backend while Beneficiaries
// didn't have a Bills concept at all).

export const getFallbackIcon = (code) => ({
    ZESA: '⚡', DSTV: '📺', GOTV: '📺', TELONE: '📞', ZINWA: '💧',
    CITY: '🏛️', NYARADZO: '🕊️', SCHOOL: '🎓', MUKURU: '🛒', FURNITURE: '🛋️',
}[code] || '🏦');

export const getBillerColor = (code) => ({
    ZESA: '#f59e0b', DSTV: '#1d4ed8', GOTV: '#2563eb', TELONE: '#059669', ZINWA: '#0284c7',
    CITY: '#7c3aed', NYARADZO: '#831843', SCHOOL: '#b45309', MUKURU: '#c2410c', FURNITURE: '#92400e',
}[code] || '#06A3DA');

export const getFieldName = (code) => ({
    ZESA: 'Meter Number', DSTV: 'Smartcard Number', GOTV: 'Smartcard Number', TELONE: 'Account Number',
    ZINWA: 'Account Number', CITY: 'Account Number', NYARADZO: 'Policy Number', SCHOOL: 'Student ID',
    MUKURU: 'Policy Number', FURNITURE: 'Account Number',
}[code] || 'Account Number');

export const getMerchantCode = (productCode) => ({
    ZESA_TOKEN: 'ZESA', DSTV_RENEWAL: 'DSTV', TELONE_BILL: 'TELONE', BULAWAYO_BILL: 'BULAWAYO',
    ZOL_PAYMENT: 'ZOL', NYARADZO_PAYMENT: 'NYARADZO', MOONLIGHT_PAYMENT: 'MOONLIGHT',
}[productCode] || productCode.replace('BILLS_', ''));

// Fetches whatever is actually active in the admin portal right now —
// never a fixed list.
export async function fetchActiveBillers() {
    const productsRes = await productsApi.getAll();
    const allProducts = productsRes.data?.data || productsRes.data || [];
    return allProducts
        .filter(p => p.category === 'BILLS' && p.isActive === true)
        .map(p => {
            const merchantCode = getMerchantCode(p.code);
            return {
                code: merchantCode, name: p.name, color: getBillerColor(merchantCode),
                fullLogoUrl: p.logoUrl ? `${BASE}${p.logoUrl}` : null,
                field: getFieldName(merchantCode), productCode: p.code,
                enabledCurrencies: p.enabledCurrencies || [],
                minAmountCents: p.minAmountCents || 100, maxAmountCents: p.maxAmountCents || 500000,
            };
        });
}

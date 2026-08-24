import { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { transactionsApi } from '../lib/api';

const C = { primary: '#06A3DA', green: '#34AD54', dark: '#091E3E', light: '#EEF9FF' };

/**
 * ZimSwitchWidget
 *
 * This page handles the OPPWa COPYandPAY card widget flow:
 *
 * 1. Gateway's /pay endpoint already created the checkout on OPPWa and
 *    returned widgetJsUrl (e.g. https://eu-test.oppwa.com/v1/paymentWidgets.js?checkoutId=XYZ)
 *    and paymentCorrelator (the checkoutId) in the TransactionResponse.
 *
 * 2. We load that JS script dynamically — it injects the card form into our page.
 *
 * 3. The form's action is set to our gateway callback URL:
 *    {VITE_API_URL}/api/v1/callbacks/zimswitch/result
 *    OPPWa will redirect the browser there with ?resourcePath=... after payment.
 *
 * 4. The gateway callback controller queries OPPWa, updates the transaction,
 *    and we redirect the customer to /processing/:ref to see their result.
 *
 * NAVIGATION STATE expected (passed from Airtime.jsx handleSubmit):
 *   state.widgetJsUrl  — the full JS URL including checkoutId
 *   state.reference    — the Payport transaction reference
 *
 * FALLBACK: If state is missing (e.g. page refresh), we re-fetch the transaction
 * from the gateway to get widgetJsUrl from the response.
 */
export default function ZimSwitchWidget() {
    const { ref } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [widgetJsUrl, setWidgetJsUrl] = useState(location.state?.widgetJsUrl || null);
    const [loading, setLoading] = useState(!location.state?.widgetJsUrl);
    const [error, setError] = useState('');
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const scriptRef = useRef(null);

    const BASE = import.meta.env.VITE_API_URL || 'https://api.payport.africa';
    // This is where OPPWa redirects the browser after card entry
    // The gateway ZimSwitchCallbackController handles this URL
    const shopperResultUrl = `${BASE}/api/v1/callbacks/zimswitch/result`;

    // Step 1: If we don't have widgetJsUrl (e.g. page refresh), fetch from gateway
    useEffect(() => {
        if (widgetJsUrl) return;
        setLoading(true);
        transactionsApi.getStatus(ref)
            .then(r => {
                const tx = r.data?.data || r.data;
                if (tx?.widgetJsUrl) {
                    setWidgetJsUrl(tx.widgetJsUrl);
                } else if (tx?.status === 'PAYMENT_PENDING') {
                    setError('Card widget URL not available. Please go back and try again.');
                } else {
                    // Transaction moved past PAYMENT_PENDING — redirect to status
                    navigate(`/processing/${ref}`, { replace: true });
                }
            })
            .catch(() => setError('Could not load payment details. Please check your connection.'))
            .finally(() => setLoading(false));
    }, [ref]);

    // Step 2: Once we have the widget URL, inject the OPPWa script tag
    useEffect(() => {
        if (!widgetJsUrl) return;

        // Remove any previously injected script (safety for dev hot-reload)
        if (scriptRef.current) {
            document.head.removeChild(scriptRef.current);
            scriptRef.current = null;
        }

        const script = document.createElement('script');
        script.src = widgetJsUrl;
        script.async = true;
        script.onload = () => setScriptLoaded(true);
        script.onerror = () => setError('Could not load the ZimSwitch card form. Please check your connection and try again.');
        document.head.appendChild(script);
        scriptRef.current = script;

        return () => {
            // Cleanup on unmount
            if (scriptRef.current && document.head.contains(scriptRef.current)) {
                document.head.removeChild(scriptRef.current);
            }
        };
    }, [widgetJsUrl]);

    if (loading) {
        return (
            <div style={pageWrap}>
                <div style={card}>
                    <div style={spinner} />
                    <p style={{ color: 'var(--text-2)', marginTop: 20 }}>Loading payment form...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={pageWrap}>
                <div style={card}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                    <h2 style={{ color: C.dark, marginBottom: 12 }}>Something went wrong</h2>
                    <p style={{ color: 'var(--text-2)', marginBottom: 28, lineHeight: 1.6 }}>{error}</p>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={() => navigate(-1)} style={btnSecondary}>← Go Back</button>
                        <button onClick={() => navigate('/help')} style={btnPrimary}>Get Help</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={pageWrap}>
            <div style={{ ...card, maxWidth: 540 }}>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>💳</div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
                        Secure Card Payment
                    </h2>
                    <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
                        Enter your card details below. Your payment is processed securely by ZimSwitch.
                    </p>
                    <div style={{ display: 'inline-block', padding: '4px 14px', background: 'rgba(6,163,218,0.08)', borderRadius: 100, fontSize: 12, color: C.primary, fontWeight: 600, marginTop: 8, fontFamily: 'monospace' }}>
                        {ref}
                    </div>
                </div>

                {/* Trust badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'rgba(52,173,84,0.07)', border: '1px solid rgba(52,173,84,0.2)', borderRadius: 10, marginBottom: 24 }}>
                    <span style={{ fontSize: 18 }}>🔒</span>
                    <span style={{ fontSize: 13, color: '#2a6e3a', fontWeight: 600 }}>
            256-bit SSL encrypted · ZimSwitch certified · Payport never stores card data
          </span>
                </div>

                {/* OPPWa Widget container */}
                {/* The OPPWa script injects the card form into .paymentWidgets */}
                {/* action must point to our gateway callback URL so OPPWa can redirect after payment */}
                {scriptLoaded ? (
                    <form
                        action={shopperResultUrl}
                        className="paymentWidgets"
                        data-brands="ZIMSWITCH VISA MASTER"
                    />
                ) : (
                    <div style={{ textAlign: 'center', padding: '32px 0' }}>
                        <div style={spinner} />
                        <p style={{ color: 'var(--text-2)', marginTop: 16, fontSize: 14 }}>Loading card form...</p>
                    </div>
                )}

                {/* Cancel link */}
                <div style={{ textAlign: 'center', marginTop: 24 }}>
                    <button
                        onClick={() => navigate(-1)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 14, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        Cancel and go back
                    </button>
                </div>

            </div>
        </div>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const pageWrap = {
    minHeight: '100vh',
    background: '#EEF9FF',
    paddingTop: 80,
    paddingBottom: 80,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 24px',
};

const card = {
    background: 'var(--bg-card, white)',
    borderRadius: 20,
    padding: '40px 36px',
    boxShadow: '0 8px 48px rgba(6,163,218,0.1)',
    border: '1.5px solid rgba(6,163,218,0.12)',
    width: '100%',
    maxWidth: 480,
};

const spinner = {
    width: 40,
    height: 40,
    border: '3px solid rgba(6,163,218,0.15)',
    borderTop: `3px solid ${C.primary}`,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto',
};

const btnPrimary = {
    flex: 1, padding: '13px', borderRadius: 12, fontSize: 15, fontWeight: 700,
    background: `linear-gradient(135deg, ${C.primary}, #0487b8)`,
    color: 'white', border: 'none', cursor: 'pointer',
};

const btnSecondary = {
    flex: 1, padding: '13px', borderRadius: 12, fontSize: 15, fontWeight: 600,
    background: 'var(--bg-2, #f4f8fb)', color: 'var(--text-2)',
    border: '1.5px solid var(--border, #dce8ef)', cursor: 'pointer',
};

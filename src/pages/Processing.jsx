import { useAuth } from '../lib/AuthContext';
import { BackBar } from '../components/shell/AppShell';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { transactionsApi } from '../lib/api';

const C = {
    green:  '#34AD54',
    red:    '#ef4444',
    blue:   '#06A3DA',
    dark:   'var(--text)',
    grey:   '#94b8ca',
    bgGrey: 'var(--light)',
};

const STATUS_MAP = {
    INITIATED:           { stepIndex: 0, paymentFailed: false, fulfilmentFailed: false },
    PAYMENT_PENDING:     { stepIndex: 1, paymentFailed: false, fulfilmentFailed: false },
    // A timed-out payment is final (owner decision): a late success is refunded, never delivered.
    PAYMENT_TIMEOUT:     { stepIndex: 1, paymentFailed: true,  fulfilmentFailed: false },
    PAYMENT_FAILED:      { stepIndex: 1, paymentFailed: true,  fulfilmentFailed: false },
    PAYMENT_CONFIRMED:   { stepIndex: 2, paymentFailed: false, fulfilmentFailed: false },
    FULFILMENT_PENDING:  { stepIndex: 3, paymentFailed: false, fulfilmentFailed: false },
    FULFILMENT_RETRY:    { stepIndex: 3, paymentFailed: false, fulfilmentFailed: false },
    FULFILMENT_FAILED:   { stepIndex: 3, paymentFailed: false, fulfilmentFailed: true  },
    MANUAL_FULFILMENT:   { stepIndex: 3, paymentFailed: false, fulfilmentFailed: true  },
    COMPLETED:           { stepIndex: 4, paymentFailed: false, fulfilmentFailed: false },
    REFUND_PENDING:      { stepIndex: 4, paymentFailed: false, fulfilmentFailed: false },
    REFUNDED:            { stepIndex: 4, paymentFailed: false, fulfilmentFailed: false },
};

const STEPS = [
    { label: 'Order Created',     icon: '📋' },
    { label: 'Payment',           icon: '💳' },
    { label: 'Payment Confirmed', icon: '✅' },
    { label: 'Delivering',        icon: '⚙️' },
    { label: 'Delivered',         icon: '🎉' },
];

// The screen is driven by the backend's `outcome` (the same answer every channel gives):
// REQUIRES_PAYMENT and PROCESSING are in progress; everything else is final.
const IN_PROGRESS = ['REQUIRES_PAYMENT', 'PROCESSING'];

// Older responses without `outcome`: derive it from the status.
function outcomeOf(tx) {
    if (!tx) return 'PROCESSING';
    if (tx.outcome) return tx.outcome;
    switch (tx.status) {
        case 'COMPLETED': return 'SUCCEEDED';
        case 'PAYMENT_FAILED': case 'FULFILMENT_FAILED': case 'MANUAL_FULFILMENT': return 'FAILED';
        case 'PAYMENT_TIMEOUT': return 'TIMED_OUT';
        case 'REFUND_PENDING': case 'REFUNDED': return 'REFUNDED';
        case 'CANCELLED': return 'CANCELLED';
        case 'INITIATED': return 'REQUIRES_PAYMENT';
        default: return 'PROCESSING';
    }
}

// NO_RESPONSE while delivering: final for now, but delivery is still being confirmed, so keep
// checking slowly (the SMS / push also tells the customer).
function keepCheckingSlowly(tx) {
    return outcomeOf(tx) === 'NO_RESPONSE' && tx?.status === 'FULFILMENT_PENDING';
}

function getStepState(stepIdx, statusInfo, status) {
    const { stepIndex, paymentFailed, fulfilmentFailed } = statusInfo;
    if (stepIdx === 1 && paymentFailed)    return 'failed';
    if (stepIdx === 3 && fulfilmentFailed) return 'failed';
    if (status === 'COMPLETED')            return 'done';
    if (stepIdx < stepIndex)               return 'done';
    if (stepIdx === stepIndex)             return 'active';
    return 'future';
}

function StepRow({ step, state, isLast }) {
    const isDone   = state === 'done';
    const isActive = state === 'active';
    const isFailed = state === 'failed';
    const isFuture = state === 'future';

    const bubbleBg = isDone   ? C.green
        : isFailed ? C.red
            : isActive ? `linear-gradient(135deg, ${C.blue}, #0487b8)`
                : C.bgGrey;

    const labelColor = isDone   ? C.green
        : isFailed ? C.red
            : isActive ? C.blue
                : C.grey;

    const bubbleContent = isDone ? '✓' : isFailed ? '✕' : step.icon;
    const bubbleColor   = (isDone || isFailed || isActive) ? 'white' : C.grey;

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '7px 0',
            borderBottom: !isLast ? '1px solid rgba(6,163,218,0.07)' : 'none',
        }}>
            <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: bubbleBg,
                border: isFuture ? '2px solid rgba(6,163,218,0.15)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: (isDone || isFailed) ? 12 : 14,
                fontWeight: 800,
                color: bubbleColor,
                boxShadow: isActive ? `0 4px 16px rgba(6,163,218,0.35)` : isDone ? `0 2px 8px rgba(52,173,84,0.2)` : isFailed ? `0 2px 8px rgba(239,68,68,0.2)` : 'none',
                transition: 'all 0.4s ease',
            }}>
                {bubbleContent}
            </div>

            <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: 12.5, color: labelColor, transition: 'color 0.3s' }}>
                    {step.label}
                </div>
                {isFailed && <div style={{ fontSize: 11, color: C.red, marginTop: 1 }}>Failed</div>}
            </div>

            {isActive && (
                <div style={{ width: 16, height: 16, flexShrink: 0, border: '2px solid rgba(6,163,218,0.15)', borderTop: `2px solid ${C.blue}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            )}
            {isDone && <div style={{ fontSize: 12, color: C.green, fontWeight: 700, flexShrink: 0 }}>✓</div>}
            {isFailed && (
                <div style={{ width: 16, height: 16, flexShrink: 0, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: C.red, fontWeight: 800 }}>✕</div>
            )}
        </div>
    );
}

function btnStyle(variant) {
    const base = { flex: 1, padding: '14px', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', border: 'none' };
    if (variant === 'primary') return { ...base, background: `linear-gradient(135deg, ${C.blue}, #0487b8)`, color: 'white', boxShadow: '0 4px 16px rgba(6,163,218,0.3)' };
    if (variant === 'danger')  return { ...base, background: 'rgba(239,68,68,0.08)', color: '#b91c1c', border: '1.5px solid rgba(239,68,68,0.2)' };
    return { ...base, background: 'var(--bg-2)', color: 'var(--text-2)', border: '1.5px solid rgba(6,163,218,0.15)' };
}

// Helper to get payment method display name
const getPaymentMethodName = (code) => {
    const methods = {
        'ECOCASH': 'EcoCash',
        'ONEMONEY': 'OneMoney',
        'ZIMSWITCH': 'ZimSwitch',
        'VISA': 'Visa',
        'MASTERCARD': 'Mastercard',
        'TELECASH': 'Telecash'
    };
    return methods[code] || code;
};

// Helper to extract just the EcoCash reference number
const getEcoCashReference = (transaction) => {
    if (!transaction) return null;

    // Direct ecocashReference field that looks like MP...
    if (transaction.ecocashReference &&
        typeof transaction.ecocashReference === 'string' &&
        transaction.ecocashReference.startsWith('MP')) {
        return transaction.ecocashReference;
    }

    return null;
};

export default function Processing() {
    const { user } = useAuth();
    const { ref } = useParams();
    const navigate = useNavigate();
    const [transaction, setTransaction] = useState(null);
    const [fetchError, setFetchError]   = useState('');
    const [dots, setDots]               = useState('');
    const [otpValue, setOtpValue]       = useState('');
    const [otpSubmitting, setOtpSubmitting] = useState(false);
    const [otpError, setOtpError]       = useState('');
    const intervalRef = useRef(null);
    const dotsRef     = useRef(null);
    const slowRef     = useRef(false);

    const poll = async () => {
        try {
            const r  = await transactionsApi.getStatus(ref);
            const tx = r.data?.data || r.data;
            setTransaction(tx);
            setFetchError('');

            const outcome = outcomeOf(tx);
            if (tx && !IN_PROGRESS.includes(outcome)) {
                clearInterval(intervalRef.current);
                clearInterval(dotsRef.current);
                if (keepCheckingSlowly(tx) && !slowRef.current) {
                    slowRef.current = true;
                    intervalRef.current = setInterval(poll, 15000);
                } else if (!keepCheckingSlowly(tx)) {
                    slowRef.current = false;
                }
            }
        } catch (e) {
            setFetchError(e.response?.data?.message || 'Unable to get status');
        }
    };

    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        if (!otpValue.trim()) return;
        setOtpError('');
        setOtpSubmitting(true);
        try {
            await transactionsApi.confirmOmariOtp(ref, otpValue.trim());
            setOtpValue('');
            // Refreshes immediately rather than waiting up to 3s for the
            // next scheduled poll -- the customer just took an action,
            // the screen should react to it right away.
            await poll();
        } catch (e) {
            // Clears here too, not just on success -- Omari allows up to
            // 3 attempts, and leaving the wrong code sitting in the field
            // invites resubmitting the exact same wrong value, burning an
            // attempt without the customer realising they need to type a
            // fresh one.
            setOtpValue('');
            setOtpError(e.response?.data?.message || 'Could not confirm that code — please check it and try again.');
        } finally {
            setOtpSubmitting(false);
        }
    };

    useEffect(() => {
        poll();
        // 1.5s, not 3s -- speed matters here specifically: the customer
        // is staring at this screen waiting to see their payment
        // confirmed, and every second of polling lag is a second of
        // perceived slowness on top of however long the backend itself
        // actually took to resolve it.
        intervalRef.current = setInterval(poll, 1500);
        dotsRef.current     = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
        return () => { clearInterval(intervalRef.current); clearInterval(dotsRef.current); };
    }, [ref]);

    // Show loading while fetching
    if (!transaction && !fetchError) {
        return (
            <div style={{ minHeight: '100vh', background: C.bgGrey, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, border: '3px solid rgba(6,163,218,0.1)', borderTop: `3px solid ${C.blue}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                    <p style={{ color: C.dark }}>Loading transaction...</p>
                </div>
            </div>
        );
    }

    const status     = transaction?.status || 'INITIATED';
    const statusInfo = STATUS_MAP[status] || STATUS_MAP['INITIATED'];
    const outcome    = outcomeOf(transaction);
    // The provider's own words for a failure, the timeout / no-response wording otherwise, or
    // the delivery note while processing. Shown exactly as sent.
    const outcomeMessage = transaction?.outcomeMessage || transaction?.failureReason || '';

    const isComplete      = outcome === 'SUCCEEDED';
    const isTimedOut      = outcome === 'TIMED_OUT' || (outcome === 'NO_RESPONSE' && !keepCheckingSlowly(transaction));
    const isConfirmingDelivery = keepCheckingSlowly(transaction);
    const isFulfilFailed  = outcome === 'FAILED' && statusInfo.stepIndex >= 2;
    const isPaymentFailed = (outcome === 'FAILED' && !isFulfilFailed) || isTimedOut;
    const isFailed        = isPaymentFailed || isFulfilFailed;
    const isRefunded      = outcome === 'REFUNDED';
    const isCancelled     = outcome === 'CANCELLED';
    const isPending       = IN_PROGRESS.includes(outcome) || isConfirmingDelivery;
    const isStillChecking = isConfirmingDelivery;
    const isCardPayment   = ['ZIMSWITCH','VISA','MASTERCARD'].includes(transaction?.paymentMethodCode);

    const paymentMethodName = getPaymentMethodName(transaction?.paymentMethodCode);
    const ecoCashReference = getEcoCashReference(transaction);
    const amount = transaction?.amount ||
        (transaction?.amountCents ? (transaction.amountCents / 100).toFixed(2) : '0.00');

    const topIcon = isComplete ? '🎉' : isFailed ? '✕' : isRefunded ? '↩' : '⏳';
    const topBg   = isComplete ? `linear-gradient(135deg, ${C.green}, #2a8f45)`
        : isFailed   ? `linear-gradient(135deg, ${C.red}, #b91c1c)`
            : isRefunded ? `linear-gradient(135deg, #8b5cf6, #6d28d9)`
                : `linear-gradient(135deg, ${C.blue}, #0487b8)`;

    const headline = isComplete      ? `${transaction?.productName || 'Order'} Delivered! 🎉`
        : isTimedOut      ? 'Payment not completed in time'
        : isPaymentFailed ? `${paymentMethodName} payment failed`
            : isFulfilFailed  ? `${transaction?.productName || 'Order'} could not be delivered`
                : isRefunded      ? 'Refunded'
                    : isCancelled     ? 'Cancelled'
                        : isConfirmingDelivery ? 'Confirming delivery'
                            : `Processing${dots}`;

    // No subtitle for payment failed since we have the message at the bottom
    const subtitle = isComplete      ? 'Your airtime has been sent successfully.'
        : isPaymentFailed ? ''
            : isFulfilFailed  ? ''
                : isRefunded      ? (outcomeMessage || 'Your payment has been refunded.')
                    : isCancelled     ? 'This payment was cancelled.'
                        : isStillChecking ? outcomeMessage
                            : (outcomeMessage || 'Hang tight — this usually takes under 30 seconds.');

    const handleTryAgain = () => navigate('/');

    return (
        <div style={user ? { maxWidth: 820 } : { minHeight: '100vh', background: C.bgGrey, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            {user && <BackBar title="Payment" />}
            <div style={{ maxWidth: user ? 560 : 460, width: '100%' }}>
                <div style={{ background: 'var(--bg-card)', borderRadius: 22, padding: '26px 26px', border: '1.5px solid rgba(6,163,218,0.1)', boxShadow: '0 8px 48px rgba(6,163,218,0.1)', textAlign: 'center' }}>

                    {/* Top icon */}
                    <div style={{
                        width: 56, height: 56, borderRadius: '50%', margin: '0 auto 14px',
                        background: topBg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: isFailed ? 22 : 26, fontWeight: 900, color: 'white',
                        boxShadow: isComplete ? '0 8px 32px rgba(52,173,84,0.35)' : isFailed ? '0 8px 32px rgba(239,68,68,0.35)' : '0 8px 32px rgba(6,163,218,0.3)',
                        animation: isPending ? 'pulse 2s infinite' : 'none',
                    }}>
                        {topIcon}
                    </div>

                    {/* Headline */}
                    <h1 style={{ fontSize: 18, fontWeight: 800, color: isFailed ? C.red : C.dark, marginBottom: 4, letterSpacing: '-0.02em' }}>
                        {headline}
                    </h1>

                    {/* Subtitle - empty for payment failed */}
                    {subtitle && (
                        <p style={{ fontSize: 12.5, lineHeight: 1.5, marginBottom: 6, color: isFailed ? '#b91c1c' : 'var(--text-2)', fontWeight: isFailed ? 600 : 400 }}>
                            {subtitle}
                        </p>
                    )}

                    {/* Reference pill with "Ref:" prefix */}
                    <div style={{ display: 'inline-block', padding: '3px 12px', background: 'rgba(6,163,218,0.08)', borderRadius: 100, fontSize: 11, color: C.blue, fontWeight: 600, marginBottom: ecoCashReference ? 10 : 16, fontFamily: 'monospace' }}>
                        Ref: {ref}
                    </div>

                    {/* EcoCash Reference - ONLY show if we have a valid MP reference */}
                    {ecoCashReference && (
                        <div style={{
                            display: 'inline-block',
                            padding: '3px 12px',
                            background: 'rgba(52,173,84,0.08)',
                            borderRadius: 100,
                            fontSize: 11,
                            color: C.green,
                            fontWeight: 600,
                            marginBottom: 16,
                            fontFamily: 'monospace',
                            border: '1px solid rgba(52,173,84,0.2)',
                            marginLeft: '8px'
                        }}>
                            {paymentMethodName} Ref: {ecoCashReference}
                        </div>
                    )}

                    {/* Step tracker */}
                    <div style={{ marginBottom: 14, textAlign: 'left' }}>
                        {STEPS.map((step, idx) => (
                            <StepRow
                                key={step.label}
                                step={step}
                                state={getStepState(idx, statusInfo, status)}
                                isLast={idx === STEPS.length - 1}
                            />
                        ))}
                    </div>

                    {/* Omari OTP entry -- takes priority over the normal pending hint */}
                    {transaction?.requiresOtpEntry && (
                        <form onSubmit={handleOtpSubmit} style={{ background: 'rgba(6,163,218,0.05)', borderRadius: 12, padding: '14px', marginBottom: 14, border: '1.5px solid rgba(6,163,218,0.15)', textAlign: 'left' }}>
                            <p style={{ fontSize: 12.5, color: C.dark, lineHeight: 1.4, margin: '0 0 10px', fontWeight: 600 }}>
                                📲 Enter the code sent to your mobile number to authorise this payment.
                            </p>
                            {otpError && (
                                <p style={{ fontSize: 12, color: C.red, margin: '0 0 8px' }}>⚠️ {otpError}</p>
                            )}
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    type="text" inputMode="numeric" value={otpValue}
                                    onChange={e => setOtpValue(e.target.value)}
                                    placeholder="Enter code" autoFocus
                                    style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1.5px solid rgba(6,163,218,0.2)', fontSize: 14, fontFamily: 'monospace', letterSpacing: '0.05em' }}
                                />
                                <button
                                    type="submit" disabled={otpSubmitting || !otpValue.trim()}
                                    style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: C.blue, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: otpSubmitting ? 0.6 : 1 }}
                                >
                                    {otpSubmitting ? 'Checking…' : 'Confirm'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* InnBucks: the code the customer approves in the InnBucks app */}
                    {isPending && transaction?.paymentCode && (
                        <div style={{ background: 'rgba(6,163,218,0.05)', borderRadius: 12, padding: '14px', marginBottom: 14, border: '1.5px solid rgba(6,163,218,0.15)', textAlign: 'center' }}>
                            <p style={{ fontSize: 12.5, color: 'var(--text-2)', margin: '0 0 6px' }}>Your InnBucks payment code</p>
                            <div style={{ fontFamily: 'monospace', fontSize: 26, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--text)' }}>{transaction.paymentCode}</div>
                            <p style={{ fontSize: 12.5, color: 'var(--text-2)', margin: '6px 0 0' }}>Open the InnBucks app and approve this code. This page updates automatically.</p>
                        </div>
                    )}

                    {/* Pending hint */}
                    {isPending && !transaction?.requiresOtpEntry && !transaction?.paymentCode && (statusInfo.stepIndex < 2 || isStillChecking) && (
                        <div style={{ background: 'rgba(6,163,218,0.05)', borderRadius: 12, padding: '10px 14px', marginBottom: 14, border: '1.5px solid rgba(6,163,218,0.1)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ fontSize: 16, flexShrink: 0 }}>{isStillChecking ? '⏳' : isCardPayment ? '💳' : '📱'}</div>
                            <p style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.4, margin: 0 }}>
                                {isStillChecking
                                    ? 'Your payment was received. We are confirming the delivery with the provider and will send you an SMS.'
                                    : isCardPayment
                                        ? 'Your card payment is being confirmed. This page updates automatically.'
                                        : <><strong>Check your phone</strong> for a payment prompt. This page updates automatically.</>
                                }
                            </p>
                        </div>
                    )}

                    {/* Payment failed detail */}
                    {isPaymentFailed && (
                        <div style={{ background: 'rgba(239,68,68,0.05)', borderRadius: 12, padding: '10px 14px', marginBottom: 14, border: '1.5px solid rgba(239,68,68,0.15)', textAlign: 'left' }}>
                            <p style={{ fontSize: 12.5, color: '#b91c1c', lineHeight: 1.4, margin: 0 }}>
                                {/* Was always this exact hardcoded generic
                                    text regardless of what actually went
                                    wrong -- the backend already stores a
                                    specific, translated failure reason
                                    (transaction.failureReason) but this
                                    screen never looked at it. A customer
                                    hitting a real, specific problem (limit
                                    exceeded, wrong PIN, etc.) always saw
                                    "was not completed" with no indication
                                    of why or what to do differently. */}
                                ⚠️ {outcomeMessage || `Your ${paymentMethodName} payment was not completed.`}
                                {isTimedOut && <><br />If money left your wallet after this, it will be refunded automatically: a late payment is never used.</>}
                            </p>
                        </div>
                    )}

                    {/* Fulfilment failed detail */}
                    {isFulfilFailed && (
                        <div style={{ background: 'rgba(239,68,68,0.05)', borderRadius: 12, padding: '10px 14px', marginBottom: 14, border: '1.5px solid rgba(239,68,68,0.15)', textAlign: 'left' }}>
                            <p style={{ fontSize: 12.5, color: '#b91c1c', lineHeight: 1.4, margin: 0 }}>
                                {/* Same fix as the payment-failed block above --
                                    was always this exact generic text regardless
                                    of the actual reason, even when the backend
                                    had a specific one (e.g. Econet's own status
                                    codes, properly translated). */}
                                ⚠️ Payment of <strong>{transaction?.currency || ''} {amount}</strong> received, but delivery failed.
                                {outcomeMessage ? ` ${outcomeMessage} ` : ' '}
                                We will deliver it or refund you — ref <strong>{ref}</strong>.
                            </p>
                        </div>
                    )}

                    {/* Action buttons */}
                    {isComplete && (
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => navigate('/')} style={btnStyle('secondary')}>Home</button>
                            <button onClick={() => navigate(`/status/${ref}`)} style={btnStyle('primary')}>View Receipt</button>
                        </div>
                    )}

                    {isPaymentFailed && (
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={handleTryAgain} style={btnStyle('secondary')}>← Try Again</button>
                            <button onClick={() => navigate('/help')} style={btnStyle('danger')}>Get Help</button>
                        </div>
                    )}

                    {isFulfilFailed && (
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => navigate('/')} style={btnStyle('secondary')}>Home</button>
                            <button onClick={() => navigate('/help')} style={btnStyle('danger')}>Contact Support</button>
                        </div>
                    )}

                    {isRefunded && (
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => navigate('/')} style={btnStyle('secondary')}>Home</button>
                            <button onClick={handleTryAgain} style={btnStyle('primary')}>Try Again</button>
                        </div>
                    )}

                    {fetchError && <p style={{ fontSize: 12, color: C.red, marginTop: 10 }}>⚠️ {fetchError}</p>}
                </div>
            </div>

            <style>{`
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.03);opacity:0.92} }
        @keyframes spin  { to{transform:rotate(360deg)} }
      `}</style>
        </div>
    );
}
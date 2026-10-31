import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { isLoggedIn } from '../lib/api';

// "Sign in with PayPort" for the PayPort Store: a signed-in customer is sent back to the store with a one-time code
// (the address is always the store's own, chosen by PayPort, not by this page's link).
export default function StoreSignin() {
    const navigate = useNavigate();
    const [error, setError] = useState('');
    useEffect(() => {
        const next = new URLSearchParams(window.location.search).get('next') || '/me';
        if (!isLoggedIn()) {
            navigate(`/login?next=${encodeURIComponent(`/store-signin?next=${encodeURIComponent(next)}`)}`, { replace: true });
            return;
        }
        api.post('/api/v1/store/sign-in', { next })
            .then(r => { window.location.replace((r.data?.data || r.data).url); })
            .catch(e => setError(e?.response?.data?.message || 'Signing in to the store did not work. Please try again.'));
    }, []);
    return (
        <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
            <div>
                <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>PayPort Store</h1>
                <p style={{ color: 'var(--text-2, #5A7A91)' }}>{error || 'Signing you in…'}</p>
            </div>
        </div>
    );
}

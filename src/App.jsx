import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { useIdleLogout } from './lib/idle';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import FloatingChat from './components/layout/FloatingChat';
import Home from './pages/Home';
const Checkout = lazy(() => import('./pages/Checkout'));
const PaymentLink = lazy(() => import('./pages/PaymentLink'));
const Airtime = lazy(() => import('./pages/Airtime'));
const Data = lazy(() => import('./pages/Data'));
const Bills = lazy(() => import('./pages/Bills'));
const Processing = lazy(() => import('./pages/Processing'));
const Status = lazy(() => import('./pages/Status'));
const Help = lazy(() => import('./pages/Help'));
const Register = lazy(() => import('./pages/Register'));
import Login from './pages/Login';
const History = lazy(() => import('./pages/History'));
const Beneficiaries = lazy(() => import('./pages/Beneficiaries'));
const Account = lazy(() => import('./pages/Account'));
const ZimSwitchWidget = lazy(() => import('./pages/ZimSwitchWidget'));
const Wallet = lazy(() => import('./pages/Wallet'));
const StoreSignin = lazy(() => import('./pages/StoreSignin'));
import Dashboard from './pages/Dashboard';
import AppShell from './components/shell/AppShell';
import Cards, { CardDetail } from './pages/Cards';

function Layout({ children }) {
    return (
        <>
            <Navbar />
            <main style={{ minHeight: 'calc(100vh - 72px - 320px)' }}>{children}</main>
            <Footer />
        </>
    );
}

/** Guests keep the public site; a signed-in customer gets the customer area. */
function Area({ children }) {
    const { user } = useAuth();
    return user ? <AppShell>{children}</AppShell> : <Layout>{children}</Layout>;
}

function HomeRoute() {
    const { user } = useAuth();
    return user ? <Dashboard /> : <Home />;
}

function PrivateRoute({ children }) {
    const { user } = useAuth();
    return user ? children : <Navigate to="/login" replace />;
}

/** Signs a registered customer out after the consumer time-out without activity. */
function IdleGuard() {
    const { user, logout } = useAuth();
    useIdleLogout(user ? localStorage.getItem('pp_token') : null, 'consumer', () => {
        logout();
        window.location.href = '/login?timeout=1';
    }, 10);
    return null;
}

export default function App() {
    return (
        <AuthProvider>
            <IdleGuard />
            <BrowserRouter>
                <Suspense fallback={<div style={{ padding: 60, textAlign: 'center' }}>Loading…</div>}><Routes>
                    <Route path="/" element={<Area><HomeRoute /></Area>} />
                    <Route path="/checkout/:sessionId" element={<Checkout />} />
                    <Route path="/pay/:slug" element={<PaymentLink />} />
                    <Route path="/airtime" element={<Area><Airtime /></Area>} />
                    <Route path="/data" element={<Area><Data /></Area>} />
                    <Route path="/bills" element={<Area><Bills /></Area>} />
                    <Route path="/processing/:ref" element={<Area><Processing /></Area>} />
                    {/* ZimSwitch card widget page — loaded after /pay returns widgetJsUrl */}
                    <Route path="/pay/zimswitch/:ref" element={<Layout><ZimSwitchWidget /></Layout>} />
                    <Route path="/status" element={<Area><Status /></Area>} />
                    <Route path="/status/:ref" element={<Area><Status /></Area>} />
                    <Route path="/help" element={<Area><Help /></Area>} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/store-signin" element={<StoreSignin />} />
                    <Route path="/history" element={
                        <PrivateRoute><Area><History /></Area></PrivateRoute>
                    } />
                    <Route path="/beneficiaries" element={
                        <PrivateRoute><Area><Beneficiaries /></Area></PrivateRoute>
                    } />
                    <Route path="/wallet" element={
                        <PrivateRoute><Area><Wallet /></Area></PrivateRoute>
                    } />
                    <Route path="/cards" element={
                        <PrivateRoute><Area><Cards /></Area></PrivateRoute>
                    } />
                    <Route path="/cards/:ref" element={
                        <PrivateRoute><Area><CardDetail /></Area></PrivateRoute>
                    } />
                    <Route path="/account" element={
                        <PrivateRoute><Area><Account /></Area></PrivateRoute>
                    } />
                </Routes></Suspense>
                <FloatingChat />
            </BrowserRouter>
        </AuthProvider>
    );
}

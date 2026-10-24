import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import FloatingChat from './components/layout/FloatingChat';
import Home from './pages/Home';
import Checkout from './pages/Checkout';
import PaymentLink from './pages/PaymentLink';
import Airtime from './pages/Airtime';
import Data from './pages/Data';
import Bills from './pages/Bills';
import Processing from './pages/Processing';
import Status from './pages/Status';
import Help from './pages/Help';
import Register from './pages/Register';
import Login from './pages/Login';
import History from './pages/History';
import Beneficiaries from './pages/Beneficiaries';
import Account from './pages/Account';
import ZimSwitchWidget from './pages/ZimSwitchWidget';
import Wallet from './pages/Wallet';
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

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
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
                </Routes>
                <FloatingChat />
            </BrowserRouter>
        </AuthProvider>
    );
}

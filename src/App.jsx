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

function Layout({ children }) {
    return (
        <>
            <Navbar />
            <main style={{ minHeight: 'calc(100vh - 72px - 320px)' }}>{children}</main>
            <Footer />
        </>
    );
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
                    <Route path="/" element={<Layout><Home /></Layout>} />
                    <Route path="/checkout/:sessionId" element={<Checkout />} />
                    <Route path="/pay/:slug" element={<PaymentLink />} />
                    <Route path="/airtime" element={<Layout><Airtime /></Layout>} />
                    <Route path="/data" element={<Layout><Data /></Layout>} />
                    <Route path="/bills" element={<Layout><Bills /></Layout>} />
                    <Route path="/processing/:ref" element={<Layout><Processing /></Layout>} />
                    {/* ZimSwitch card widget page — loaded after /pay returns widgetJsUrl */}
                    <Route path="/pay/zimswitch/:ref" element={<Layout><ZimSwitchWidget /></Layout>} />
                    <Route path="/status" element={<Layout><Status /></Layout>} />
                    <Route path="/status/:ref" element={<Layout><Status /></Layout>} />
                    <Route path="/help" element={<Layout><Help /></Layout>} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/history" element={
                        <PrivateRoute><Layout><History /></Layout></PrivateRoute>
                    } />
                    <Route path="/beneficiaries" element={
                        <PrivateRoute><Layout><Beneficiaries /></Layout></PrivateRoute>
                    } />
                    <Route path="/account" element={
                        <PrivateRoute><Layout><Account /></Layout></PrivateRoute>
                    } />
                </Routes>
                <FloatingChat />
            </BrowserRouter>
        </AuthProvider>
    );
}

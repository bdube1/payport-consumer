import { createContext, useContext, useState } from 'react';
import { authApi } from './api';

const AuthContext = createContext();

function extractAuthData(res) {
    const outer = res.data?.data || res.data || {};
    // Gateway returns { token, user: { fullName, phone, role } }
    // but data is wrapped in ApiResponse as { success: true, data: { token, user: {...} } }
    const token = outer.token || outer.accessToken || '';
    const u = outer.user || outer;
    return {
        userData: { fullName: u.fullName, phone: u.phone, role: u.role || 'CUSTOMER' },
        token,
    };
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('pp_user')); } catch { return null; }
    });
    const [loading, setLoading] = useState(false);

    const persist = (userData, jwt) => {
        setUser(userData);
        localStorage.setItem('pp_user', JSON.stringify(userData));
        if (jwt) localStorage.setItem('pp_token', jwt);
    };

    const login = async (phone, pin) => {
        setLoading(true);
        try {
            const res = await authApi.login({ phone, pin });
            const { userData, token } = extractAuthData(res);

            // Store the JWT token directly - NO Basic Auth conversion
            persist(userData, token);

            return { success: true };
        } catch (e) {
            const msg = e.response?.data?.error?.message
                || e.response?.data?.message
                || 'Login failed. Check your number and PIN.';
            return { success: false, message: msg };
        } finally {
            setLoading(false);
        }
    };

    const register = async (fullName, phone, pin, idNumber) => {
        setLoading(true);
        try {
            const res = await authApi.register({ fullName, phone, pin, idNumber });
            const { userData, token } = extractAuthData(res);

            // Fallback to submitted values if gateway response is missing them
            const finalUser = {
                fullName: userData.fullName || fullName,
                phone: userData.phone || phone,
                role: userData.role || 'CUSTOMER',
            };

            // Store the JWT token directly
            persist(finalUser, token);
            return { success: true };
        } catch (e) {
            const msg = e.response?.data?.error?.message
                || e.response?.data?.message
                || 'Registration failed. Please try again.';
            return { success: false, message: msg };
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('pp_user');
        localStorage.removeItem('pp_token');
    };

    // Helper function to check if user is authenticated
    const isAuthenticated = () => {
        return !!user && !!localStorage.getItem('pp_token');
    };

    // Helper function to get the current auth token
    const getToken = () => {
        return localStorage.getItem('pp_token');
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            register,
            logout,
            isAuthenticated,
            getToken
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

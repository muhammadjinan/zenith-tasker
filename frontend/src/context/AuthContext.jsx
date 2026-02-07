import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            fetchUser(token);
        } else {
            setLoading(false);
        }
    }, []);

    const fetchUser = async (token) => {
        try {
            const res = await fetch(`${API_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const userData = await res.json();
                setUser({ ...userData, token });
            } else {
                logout();
            }
        } catch (err) {
            console.error("Auth check failed", err);
            logout();
        } finally {
            setLoading(false);
        }
    };

    const login = async (username, password) => {
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Login failed');

            localStorage.setItem('token', data.token);
            setUser(data);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    const register = async (username, password) => {
        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Registration failed');

            localStorage.setItem('token', data.token);
            setUser({ ...data, token: data.token });
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    const registerGoogle = async (username, googleToken) => {
        try {
            const res = await fetch(`${API_URL}/auth/register-google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, googleToken })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Registration failed');

            localStorage.setItem('token', data.token);
            setUser({ ...data, token: data.token });
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    // ============ Profile Functions ============

    const updateProfile = async ({ username, email }) => {
        try {
            const res = await fetch(`${API_URL}/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ username, email })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Update failed');

            setUser(prev => ({ ...prev, ...data }));
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    const uploadProfilePicture = async (file) => {
        try {
            const formData = new FormData();
            formData.append('picture', file);

            const res = await fetch(`${API_URL}/auth/profile/picture`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${user.token}` },
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');

            setUser(prev => ({ ...prev, ...data }));
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    // ============ Password Functions ============

    const changePassword = async (currentPassword, newPassword) => {
        try {
            const res = await fetch(`${API_URL}/auth/change-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Change failed');

            return { success: true, message: data.message };
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    const forgotPassword = async (identifier) => {
        try {
            const res = await fetch(`${API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Request failed');

            return { success: true, ...data };
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    const resetPassword = async (token, newPassword) => {
        try {
            const res = await fetch(`${API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Reset failed');

            return { success: true, message: data.message };
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    // ============ Account Management Functions ============

    const deactivateAccount = async (password) => {
        try {
            const res = await fetch(`${API_URL}/auth/deactivate`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ password })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Deactivation failed');

            logout();
            return { success: true, message: data.message };
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    const deleteAccount = async (password) => {
        try {
            const res = await fetch(`${API_URL}/auth/delete-account`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ password })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Deletion failed');

            logout();
            return { success: true, message: data.message };
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    // Helper to get profile picture URL
    const getProfilePicUrl = (filename) => {
        if (!filename) return null;
        return `${API_URL}/uploads/${filename}`;
    };

    return (
        <AuthContext.Provider value={{
            user,
            setUser,
            loading,
            login,
            register,
            registerGoogle, // <--- Added
            logout,
            updateProfile,
            uploadProfilePicture,
            changePassword,
            forgotPassword,
            resetPassword,
            getProfilePicUrl,
            deactivateAccount,
            deleteAccount,
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

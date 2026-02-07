import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import ParticleBackground from '../components/ParticleBackground';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login, setUser } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Handle OAuth callback with token in URL
    useEffect(() => {
        const token = searchParams.get('token');
        const errorParam = searchParams.get('error');

        if (errorParam) {
            setError(errorParam === 'google_auth_failed' ? 'Google sign-in failed.' : errorParam);
            return;
        }

        if (token) {
            // Store token and fetch user data
            localStorage.setItem('token', token);
            // Fetch user data with the token
            fetch(`${API_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.id) {
                        setUser(data);
                        navigate('/');
                    } else {
                        console.error('Login error data:', data);
                        setError(data.error || 'Failed to authenticate. Please try again.');
                        localStorage.removeItem('token');
                    }
                })
                .catch((err) => {
                    console.error('Login fetch error:', err);
                    setError('Failed to reach server: ' + err.message);
                    localStorage.removeItem('token');
                });
        }
    }, [searchParams, navigate, setUser]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        const result = await login(username, password);
        if (result.success) {
            navigate('/');
        } else {
            setError(result.error);
        }
        setIsSubmitting(false);
    };

    const handleGoogleSignIn = () => {
        // Redirect to Google OAuth endpoint
        window.location.href = `${API_URL}/auth/google`;
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-950">
            <ParticleBackground />

            <div className="w-full max-w-md p-10 relative z-10 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl mx-4">
                {/* Header */}
                <div className="mb-10 text-center">
                    <h1 className="text-4xl mb-2 font-serif italic bg-gradient-to-r from-slate-200 to-slate-400 bg-clip-text text-transparent">
                        Login to Zenith Tasker
                    </h1>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm text-center">
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3.5 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                            placeholder="Username"
                            required
                        />
                    </div>

                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3.5 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                            placeholder="Password"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3.5 px-4 rounded-xl font-medium bg-slate-700/50 border border-white/10 text-white hover:bg-slate-600/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Logging in...' : 'Login'}
                    </button>

                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        className="w-full py-3.5 px-4 rounded-xl font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-3"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Sign in with Google
                    </button>
                </form>

                {/* Footer Links */}
                <div className="mt-8 text-center space-y-3">
                    <div>
                        <Link
                            to="/forgot-password"
                            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
                        >
                            Forgot password?
                        </Link>
                    </div>
                    <div className="text-sm text-slate-500">
                        Don't have an account?{' '}
                        <Link
                            to="/signup"
                            className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                        >
                            Sign Up
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;


import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import ParticleBackground from '../components/ParticleBackground';

const Signup = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Google Signup State
    const [searchParams] = useSearchParams();
    const googleSignupToken = searchParams.get('google_signup');
    const [googleProfile, setGoogleProfile] = useState(null);

    const { register, registerGoogle } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (googleSignupToken) {
            try {
                // Decode token to get profile info (email, name)
                // If jwt-decode is not installed, we can use a simple base64 decoder function
                const base64Url = googleSignupToken.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                const decoded = JSON.parse(jsonPayload);

                setGoogleProfile(decoded);
                // Pre-fill username suggestion based on email or name
                const suggestedName = (decoded.email?.split('@')[0] || '').replace(/[^a-zA-Z0-9]/g, '');
                setUsername(suggestedName);
            } catch (err) {
                console.error('Failed to decode Google token', err);
                setError('Invalid Google signup session. Please try again.');
            }
        }
    }, [googleSignupToken]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        if (!googleSignupToken) {
            // Validate password only for regular signup
            if (password !== confirmPassword) {
                setError('Passwords do not match');
                setIsSubmitting(false);
                return;
            }

            if (password.length < 6) {
                setError('Password must be at least 6 characters');
                setIsSubmitting(false);
                return;
            }
        }

        let result;
        if (googleSignupToken) {
            // Google Signup Flow
            result = await registerGoogle(username, googleSignupToken);
        } else {
            // Regular Signup Flow
            result = await register(username, password);
        }

        if (result.success) {
            navigate('/');
        } else {
            setError(result.error);
        }
        setIsSubmitting(false);
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-950">
            <ParticleBackground />

            <div className="w-full max-w-md p-10 relative z-10 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl mx-4">
                {/* Header */}
                <div className="mb-10 text-center">
                    <h1 className="text-4xl mb-2 font-serif italic bg-gradient-to-r from-slate-200 to-slate-400 bg-clip-text text-transparent">
                        {googleSignupToken ? 'Complete Signup' : 'Create Account'}
                    </h1>
                    <p className="text-slate-400 mt-3">
                        {googleSignupToken
                            ? `Signing up as ${googleProfile?.email || 'Google User'}`
                            : 'Join Zenith Tasker today'}
                    </p>
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
                        <label className="block text-slate-400 text-sm font-medium mb-2 ml-1">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3.5 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                            placeholder="Choose a username"
                            required
                        />
                    </div>

                    {!googleSignupToken && (
                        <>
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

                            <div>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3.5 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                                    placeholder="Confirm Password"
                                    required
                                />
                            </div>
                        </>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3.5 px-4 rounded-xl font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Creating Account...' : (googleSignupToken ? 'Complete Registration' : 'Sign Up')}
                    </button>
                </form>

                {/* Footer Links */}
                <div className="mt-8 text-center">
                    <div className="text-sm text-slate-500">
                        Already have an account?{' '}
                        <Link
                            to="/login"
                            className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                        >
                            Sign In
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Signup;

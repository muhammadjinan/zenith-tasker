import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ParticleBackground from '../components/ParticleBackground';

const ForgotPassword = () => {
    const [identifier, setIdentifier] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [redirectUrl, setRedirectUrl] = useState(null);
    const { forgotPassword } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!identifier.trim()) return;

        setLoading(true);
        setMessage({ type: '', text: '' });

        const result = await forgotPassword(identifier);

        if (result.success) {
            if (result.resetAvailable && result.redirectUrl) {
                // Admin has enabled reset - show button to go to reset page
                setRedirectUrl(result.redirectUrl);
                setMessage({ type: 'success', text: result.message });
            } else {
                setMessage({ type: 'success', text: result.message });
            }
        } else {
            setMessage({ type: 'error', text: result.error });
        }
        setLoading(false);
    };

    const goToReset = () => {
        if (redirectUrl) {
            navigate(redirectUrl);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
            <ParticleBackground />

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                        <span className="text-white font-bold text-2xl">Z</span>
                    </div>
                    <h1 className="text-3xl font-semibold text-white tracking-tight">Zenith</h1>
                </div>

                {/* Card */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                    <h2 className="text-2xl font-semibold text-white mb-2 text-center">Forgot Password</h2>
                    <p className="text-slate-400 text-center mb-6 text-sm">
                        Enter your username or email to reset your password
                    </p>

                    {message.text && (
                        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${message.type === 'success'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    {redirectUrl ? (
                        <div className="text-center">
                            <p className="text-slate-300 mb-4">An admin has enabled password reset for your account.</p>
                            <button
                                onClick={goToReset}
                                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl transition-all"
                            >
                                Reset Password Now
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Username or Email</label>
                                <input
                                    type="text"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                                    placeholder="Enter your username or email"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Sending...' : 'Send Reset Instructions'}
                            </button>
                        </form>
                    )}

                    <div className="mt-6 text-center">
                        <Link to="/login" className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors">
                            ← Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ParticleBackground from '../components/ParticleBackground';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const { resetPassword } = useAuth();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            setMessage({ type: 'error', text: 'Invalid or missing reset token. Please request a new password reset.' });
        }
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match' });
            return;
        }

        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });

        const result = await resetPassword(token, newPassword);

        if (result.success) {
            setSuccess(true);
            setMessage({ type: 'success', text: result.message });
        } else {
            setMessage({ type: 'error', text: result.error });
        }
        setLoading(false);
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
                    <h2 className="text-2xl font-semibold text-white mb-2 text-center">Reset Password</h2>
                    <p className="text-slate-400 text-center mb-6 text-sm">
                        Enter your new password below
                    </p>

                    {message.text && (
                        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${message.type === 'success'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    {success ? (
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-slate-300 mb-4">Your password has been reset successfully!</p>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl transition-all"
                            >
                                Go to Login
                            </button>
                        </div>
                    ) : token ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                                    placeholder="Enter new password"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Confirm Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                                    placeholder="Confirm new password"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </form>
                    ) : (
                        <div className="text-center">
                            <Link
                                to="/forgot-password"
                                className="inline-block py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl transition-all"
                            >
                                Request New Reset Link
                            </Link>
                        </div>
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

export default ResetPassword;

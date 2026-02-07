import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminPanel = ({ isOpen, onClose }) => {
    const { user, getProfilePicUrl } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (isOpen && user?.is_admin) {
            fetchUsers();
        }
    }, [isOpen, user]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/admin/users`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (err) {
            console.error('Failed to fetch users:', err);
        }
        setLoading(false);
    };

    const allowReset = async (userId) => {
        try {
            const res = await fetch(`${API_URL}/admin/users/${userId}/allow-reset`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ hours: 24 })
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: data.message });
                fetchUsers(); // Refresh list
            } else {
                setMessage({ type: 'error', text: data.error });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to enable reset' });
        }
        setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    };

    const revokeReset = async (userId) => {
        try {
            const res = await fetch(`${API_URL}/admin/users/${userId}/allow-reset`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: data.message });
                fetchUsers();
            } else {
                setMessage({ type: 'error', text: data.error });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to revoke reset' });
        }
        setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    };

    if (!isOpen || !user?.is_admin) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-2xl mx-4 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h2 className="text-xl font-semibold text-white">Admin Panel</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Message */}
                {message.text && (
                    <div className={`mx-6 mt-4 px-4 py-3 rounded-lg text-sm ${message.type === 'success'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                        {message.text}
                    </div>
                )}

                {/* User List */}
                <div className="flex-1 overflow-y-auto p-6">
                    <h3 className="text-sm font-medium text-slate-400 mb-4">User Management</h3>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {users.map((u) => {
                                const isResetActive = u.reset_allowed_until && new Date(u.reset_allowed_until) > new Date();
                                const profilePic = getProfilePicUrl(u.profile_pic);

                                return (
                                    <div key={u.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center text-sm font-medium text-slate-300">
                                                {profilePic ? (
                                                    <img src={profilePic} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    u.username?.charAt(0)?.toUpperCase() || '?'
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">
                                                    {u.username}
                                                    {u.is_admin && (
                                                        <span className="ml-2 px-2 py-0.5 text-xs bg-indigo-500/20 text-indigo-400 rounded-full">Admin</span>
                                                    )}
                                                </p>
                                                <p className="text-sm text-slate-500">{u.email || 'No email'}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {isResetActive ? (
                                                <button
                                                    onClick={() => revokeReset(u.id)}
                                                    className="px-4 py-2 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                                                >
                                                    Revoke Reset
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => allowReset(u.id)}
                                                    className="px-4 py-2 text-sm bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
                                                >
                                                    Allow Reset (24h)
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;

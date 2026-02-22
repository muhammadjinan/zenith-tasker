import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Compute activity level from login_days_14d count and account status
const getActivityLevel = (user) => {
    if (user.status === 'inactive') return { label: 'Deactivated', color: 'slate', dotClass: 'bg-slate-500' };
    if (user.login_days_14d >= 10) return { label: 'Active', color: 'green', dotClass: 'bg-green-400' };
    if (user.login_days_14d >= 4) return { label: 'Average', color: 'amber', dotClass: 'bg-amber-400' };
    if (user.login_days_14d >= 1) return { label: 'Less Active', color: 'orange', dotClass: 'bg-orange-400' };
    return { label: 'New', color: 'gray', dotClass: 'bg-slate-400' };
};

// Badge component for activity level
const ActivityBadge = ({ level }) => {
    const colorMap = {
        green: 'bg-green-500/15 text-green-400 border-green-500/30',
        amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        orange: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
        gray: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
        slate: 'bg-slate-500/15 text-slate-500 border-slate-500/30',
    };

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${colorMap[level.color]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${level.dotClass}`}></span>
            {level.label}
        </span>
    );
};

// Format relative time
const timeAgo = (dateStr) => {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    return `${weeks}w ago`;
};

const AdminPanel = ({ isOpen, onClose }) => {
    const { user, getProfilePicUrl } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [activeTab, setActiveTab] = useState('activity'); // 'activity' | 'management'

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

    // Compute activity stats
    const activityStats = useMemo(() => {
        const stats = { active: 0, average: 0, lessActive: 0, newUser: 0, deactivated: 0 };
        users.forEach(u => {
            const level = getActivityLevel(u);
            if (level.label === 'Active') stats.active++;
            else if (level.label === 'Average') stats.average++;
            else if (level.label === 'Less Active') stats.lessActive++;
            else if (level.label === 'New') stats.newUser++;
            else if (level.label === 'Deactivated') stats.deactivated++;
        });
        return stats;
    }, [users]);

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
            <div className="relative w-full max-w-3xl mx-4 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h2 className="text-xl font-semibold text-white">Admin Panel</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-6 pt-4">
                    <button
                        onClick={() => setActiveTab('activity')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'activity'
                            ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                            : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            User Activity
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('management')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'management'
                            ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                            : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                            </svg>
                            User Management
                        </span>
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

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                        </div>
                    ) : activeTab === 'activity' ? (
                        /* ========== USER ACTIVITY TAB ========== */
                        <div>
                            {/* Stats Summary Bar */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                                <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-center">
                                    <p className="text-2xl font-bold text-green-400">{activityStats.active}</p>
                                    <p className="text-xs text-green-400/70 mt-0.5">Active</p>
                                </div>
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-center">
                                    <p className="text-2xl font-bold text-amber-400">{activityStats.average}</p>
                                    <p className="text-xs text-amber-400/70 mt-0.5">Average</p>
                                </div>
                                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3 text-center">
                                    <p className="text-2xl font-bold text-orange-400">{activityStats.lessActive}</p>
                                    <p className="text-xs text-orange-400/70 mt-0.5">Less Active</p>
                                </div>
                                <div className="bg-slate-500/10 border border-slate-500/20 rounded-xl px-4 py-3 text-center">
                                    <p className="text-2xl font-bold text-slate-400">{activityStats.newUser}</p>
                                    <p className="text-xs text-slate-400/70 mt-0.5">New</p>
                                </div>
                                <div className="bg-slate-500/10 border border-slate-500/20 rounded-xl px-4 py-3 text-center">
                                    <p className="text-2xl font-bold text-slate-500">{activityStats.deactivated}</p>
                                    <p className="text-xs text-slate-500/70 mt-0.5">Deactivated</p>
                                </div>
                            </div>

                            {/* User Activity List */}
                            <h3 className="text-sm font-medium text-slate-400 mb-3">All Users ({users.length})</h3>
                            <div className="space-y-2">
                                {users.map((u) => {
                                    const level = getActivityLevel(u);
                                    const profilePic = getProfilePicUrl(u.profile_pic);
                                    const isDeactivated = u.status === 'inactive';

                                    return (
                                        <div
                                            key={u.id}
                                            className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isDeactivated
                                                ? 'bg-slate-800/30 border-white/5 opacity-60'
                                                : 'bg-slate-800/50 border-white/5 hover:border-white/10'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                {/* Avatar with activity dot */}
                                                <div className="relative flex-shrink-0">
                                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center text-sm font-medium text-slate-300">
                                                        {profilePic ? (
                                                            <img src={profilePic} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            u.username?.charAt(0)?.toUpperCase() || '?'
                                                        )}
                                                    </div>
                                                    <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${level.dotClass}`}></span>
                                                </div>

                                                {/* User info */}
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className={`font-medium truncate ${isDeactivated ? 'text-slate-500' : 'text-white'}`}>
                                                            {u.username}
                                                        </p>
                                                        {u.is_admin && (
                                                            <span className="px-2 py-0.5 text-xs bg-indigo-500/20 text-indigo-400 rounded-full flex-shrink-0">Admin</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500 truncate">
                                                        {u.email || 'No email'} · Last login: {timeAgo(u.last_login)}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Activity badge + login count */}
                                            <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                                                <div className="text-right hidden sm:block">
                                                    <p className="text-xs text-slate-500">{u.login_days_14d}d / 14d</p>
                                                </div>
                                                <ActivityBadge level={level} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        /* ========== USER MANAGEMENT TAB ========== */
                        <div>
                            <h3 className="text-sm font-medium text-slate-400 mb-4">User Management</h3>
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
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;

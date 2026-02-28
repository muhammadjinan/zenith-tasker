import React, { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PERM_LIST = [
    { key: 'can_read', icon: '📖', label: 'Can view' },
    { key: 'can_write', icon: '✏️', label: 'Can add/edit transactions' },
    { key: 'can_delete', icon: '🗑️', label: 'Can delete entries' },
    { key: 'can_manage_members', icon: '👥', label: 'Can manage members' },
    { key: 'can_manage_categories', icon: '📁', label: 'Can manage categories' },
    { key: 'can_manage_investments', icon: '📈', label: 'Can manage investments' },
    { key: 'can_manage_loans', icon: '💰', label: 'Can manage loans' },
    { key: 'can_export', icon: '📥', label: 'Can export data' },
];

const MemberManager = ({ trackerId, permissions, authFetch }) => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inviteUsername, setInviteUsername] = useState('');
    const [invitePerms, setInvitePerms] = useState({ can_read: true, can_export: true });
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${API_URL}/finance/${trackerId}/members`);
            if (res.ok) setMembers(await res.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [trackerId, authFetch]);

    useEffect(() => { load(); }, [load]);

    const handleInvite = async () => {
        if (!inviteUsername.trim()) return;
        setError('');
        try {
            const res = await authFetch(`${API_URL}/finance/${trackerId}/members`, {
                method: 'POST', body: JSON.stringify({ username: inviteUsername, permissions: invitePerms })
            });
            if (res.ok) { setInviteUsername(''); setInvitePerms({ can_read: true, can_export: true }); load(); }
            else { const d = await res.json(); setError(d.error || 'Failed to invite'); }
        } catch (e) { setError(e.message); }
    };

    const handleUpdatePerm = async (userId, permKey, value) => {
        try {
            const res = await authFetch(`${API_URL}/finance/${trackerId}/members/${userId}`, {
                method: 'PUT', body: JSON.stringify({ permissions: { [permKey]: value } })
            });
            if (res.ok) load();
            else { const d = await res.json(); setError(d.error); }
        } catch (e) { console.error(e); }
    };

    const handleRemove = async (userId) => {
        if (!confirm('Remove this member?')) return;
        try {
            await authFetch(`${API_URL}/finance/${trackerId}/members/${userId}`, { method: 'DELETE' });
            load();
        } catch (e) { console.error(e); }
    };

    const canManage = permissions.is_owner || permissions.can_manage_members;

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Members</h3>

            {/* Invite */}
            {canManage && (
                <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10 space-y-3">
                    <div className="flex gap-2">
                        <input placeholder="Username to invite..." value={inviteUsername} onChange={e => setInviteUsername(e.target.value)}
                            className="flex-1 px-4 py-2 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm outline-none focus:border-cyan-500/50 placeholder-slate-500" />
                        <button onClick={handleInvite} className="px-6 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors">Invite</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {PERM_LIST.map(p => (
                            <button key={p.key} onClick={() => setInvitePerms(prev => ({ ...prev, [p.key]: !prev[p.key] }))}
                                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] transition-all border ${invitePerms[p.key] ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400' : 'border-white/10 text-slate-500'}`}>
                                {p.icon} {p.label}
                            </button>
                        ))}
                    </div>
                    {error && <p className="text-xs text-red-400">{error}</p>}
                </div>
            )}

            {/* Member List */}
            {loading ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>
                : (
                    <div className="space-y-2">
                        {members.map(m => (
                            <div key={m.id} className="p-3 rounded-xl bg-slate-800/30 border border-white/5">
                                <div className="flex items-center gap-3">
                                    {m.profile_pic ? <img src={m.profile_pic} className="w-8 h-8 rounded-full object-cover" alt="" /> : <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-white text-xs font-bold">{m.username?.[0]?.toUpperCase()}</div>}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-white font-medium">{m.username}</span>
                                            {m.is_owner && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">Owner</span>}
                                            {!m.is_owner && m.can_manage_members && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">Admin</span>}
                                        </div>
                                        {m.email && <span className="text-xs text-slate-500">{m.email}</span>}
                                    </div>
                                    {!m.is_owner && canManage && (
                                        <div className="flex gap-1">
                                            <button onClick={() => setEditingId(editingId === m.user_id ? null : m.user_id)} className="px-2 py-1 rounded-lg text-[10px] text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10">
                                                {editingId === m.user_id ? 'Close' : 'Permissions'}
                                            </button>
                                            <button onClick={() => handleRemove(m.user_id)} className="p-1 text-slate-500 hover:text-red-400 text-xs">🗑️</button>
                                        </div>
                                    )}
                                </div>
                                {/* Permission toggles */}
                                {editingId === m.user_id && (
                                    <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-2">
                                        {PERM_LIST.map(p => {
                                            if (p.key === 'can_manage_members' && !permissions.is_owner) return null;
                                            return (
                                                <button key={p.key} onClick={() => handleUpdatePerm(m.user_id, p.key, !m[p.key])}
                                                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all border ${m[p.key] ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-white/10 text-slate-500 hover:bg-white/5'}`}>
                                                    {p.icon} {p.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
        </div>
    );
};

export default MemberManager;

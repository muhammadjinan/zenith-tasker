import React, { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const LoanTracker = ({ trackerId, currency, permissions, authFetch, onDataChange }) => {
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [editId, setEditId] = useState(null);
    const [activeTab, setActiveTab] = useState('borrowed');
    const [form, setForm] = useState({ type: 'borrowed', person_name: '', amount: '', purpose: '', loan_date: new Date().toISOString().split('T')[0], expected_payback_date: '', notes: '' });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${API_URL}/finance/${trackerId}/loans`);
            if (res.ok) setLoans(await res.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [trackerId, authFetch]);

    useEffect(() => { load(); }, [load]);

    const handleSubmit = async () => {
        if (!form.person_name || !form.amount) return;
        const url = editId ? `${API_URL}/finance/loans/${editId}` : `${API_URL}/finance/${trackerId}/loans`;
        try {
            await authFetch(url, { method: editId ? 'PUT' : 'POST', body: JSON.stringify(form) });
            setShowAdd(false); setEditId(null);
            setForm({ type: activeTab, person_name: '', amount: '', purpose: '', loan_date: new Date().toISOString().split('T')[0], expected_payback_date: '', notes: '' });
            load();
            onDataChange && onDataChange();
        } catch (e) { console.error(e); }
    };

    const handleSettle = async (id) => {
        try {
            await authFetch(`${API_URL}/finance/loans/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'settled', actual_payback_date: new Date().toISOString().split('T')[0] }) });
            load();
            onDataChange && onDataChange();
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this loan record?')) return;
        try { await authFetch(`${API_URL}/finance/loans/${id}`, { method: 'DELETE' }); load(); onDataChange && onDataChange(); } catch (e) { console.error(e); }
    };

    const canManage = permissions.is_owner || permissions.can_manage_loans;
    const filtered = loans.filter(l => l.type === activeTab);
    const activeBorrowed = loans.filter(l => l.type === 'borrowed' && l.status === 'active').reduce((s, l) => s + parseFloat(l.amount), 0);
    const activeGiven = loans.filter(l => l.type === 'given' && l.status === 'active').reduce((s, l) => s + parseFloat(l.amount), 0);

    const statusBadge = (status, expected) => {
        const isOverdue = status === 'active' && expected && new Date(expected) < new Date();
        const actualStatus = isOverdue ? 'overdue' : status;
        const styles = { active: 'bg-blue-500/15 text-blue-400', settled: 'bg-green-500/15 text-green-400', overdue: 'bg-red-500/15 text-red-400 animate-pulse' };
        return <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${styles[actualStatus]}`}>{actualStatus}</span>;
    };

    return (
        <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                    <p className="text-[10px] text-orange-400/70">Active Borrowed</p>
                    <p className="text-xl font-bold text-orange-400">{currency} {activeBorrowed.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <p className="text-[10px] text-purple-400/70">Active Given</p>
                    <p className="text-xl font-bold text-purple-400">{currency} {activeGiven.toLocaleString()}</p>
                </div>
            </div>

            {/* Tabs + Add */}
            <div className="flex items-center gap-2">
                <button onClick={() => setActiveTab('borrowed')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'borrowed' ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30' : 'text-slate-400 border border-transparent'}`}>💸 Borrowed</button>
                <button onClick={() => setActiveTab('given')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'given' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' : 'text-slate-400 border border-transparent'}`}>🤲 Given</button>
                <div className="flex-1" />
                {canManage && <button onClick={() => { setEditId(null); setForm({ ...form, type: activeTab }); setShowAdd(true); }} className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-medium">+ Add</button>}
            </div>

            {/* Add Form */}
            {showAdd && (
                <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <input placeholder="Person name" value={form.person_name} onChange={e => setForm({ ...form, person_name: e.target.value })} className="px-3 py-2 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm outline-none" />
                        <input type="number" placeholder="Amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="px-3 py-2 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm outline-none" />
                        <input placeholder="Purpose" value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} className="px-3 py-2 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm outline-none placeholder-slate-500" />
                        <input type="date" value={form.loan_date} onChange={e => setForm({ ...form, loan_date: e.target.value })} className="px-3 py-2 rounded-xl bg-slate-900/50 border border-white/10 text-sm text-slate-300 outline-none" title="Loan date" />
                        <input type="date" value={form.expected_payback_date} onChange={e => setForm({ ...form, expected_payback_date: e.target.value })} className="px-3 py-2 rounded-xl bg-slate-900/50 border border-white/10 text-sm text-slate-300 outline-none" title="Expected payback" placeholder="Expected payback" />
                        <input placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="px-3 py-2 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm outline-none placeholder-slate-500" />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-slate-400">Cancel</button>
                        <button onClick={handleSubmit} className="px-6 py-2 rounded-xl bg-cyan-600 text-white text-sm font-medium">{editId ? 'Update' : 'Add'}</button>
                    </div>
                </div>
            )}

            {/* Loan List */}
            {loading ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>
                : filtered.length === 0 ? <p className="text-center py-8 text-slate-500">No {activeTab} loans recorded</p>
                    : (
                        <div className="space-y-2">
                            {filtered.map(loan => (
                                <div key={loan.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-white/5 hover:border-white/10 transition-all group">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-white font-medium">{loan.person_name}</span>
                                            {statusBadge(loan.status, loan.expected_payback_date)}
                                        </div>
                                        <div className="flex gap-3 text-xs text-slate-500 mt-0.5">
                                            {loan.purpose && <span>{loan.purpose}</span>}
                                            <span>Loan: {new Date(loan.loan_date).toLocaleDateString()}</span>
                                            {loan.expected_payback_date && <span>Due: {new Date(loan.expected_payback_date).toLocaleDateString()}</span>}
                                        </div>
                                    </div>
                                    <span className={`text-sm font-semibold ${loan.type === 'borrowed' ? 'text-orange-400' : 'text-purple-400'}`}>{currency} {Number(loan.amount).toLocaleString()}</span>
                                    <div className="hidden group-hover:flex gap-1">
                                        {canManage && loan.status === 'active' && <button onClick={() => handleSettle(loan.id)} className="px-2 py-1 text-[10px] rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25">Settle</button>}
                                        {(permissions.is_owner || permissions.can_delete) && <button onClick={() => handleDelete(loan.id)} className="p-1 text-slate-500 hover:text-red-400 text-xs">🗑️</button>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
        </div>
    );
};

export default LoanTracker;

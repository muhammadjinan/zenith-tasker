import React, { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const TransactionList = ({ trackerId, currency, permissions, authFetch, onDataChange }) => {
    const [transactions, setTransactions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [editId, setEditId] = useState(null);
    const [filters, setFilters] = useState({ from: '', to: '', category_id: '', type: '' });
    const [form, setForm] = useState({ type: 'expense', amount: '', category_id: '', date: new Date().toISOString().split('T')[0], description: '' });

    const loadCategories = useCallback(async () => {
        try {
            const res = await authFetch(`${API_URL}/finance/${trackerId}/categories`);
            if (res.ok) setCategories(await res.json());
        } catch (e) { console.error(e); }
    }, [trackerId, authFetch]);

    const loadTransactions = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.from) params.set('from', filters.from);
            if (filters.to) params.set('to', filters.to);
            if (filters.category_id) params.set('category_id', filters.category_id);
            if (filters.type) params.set('type', filters.type);
            const res = await authFetch(`${API_URL}/finance/${trackerId}/transactions?${params}`);
            if (res.ok) { const data = await res.json(); setTransactions(data.transactions); setTotal(data.total); }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [trackerId, filters, authFetch]);

    useEffect(() => { loadCategories(); }, [loadCategories]);
    useEffect(() => { loadTransactions(); }, [loadTransactions]);

    const flatCats = categories.flatMap(c => [c, ...(c.children || [])]);

    const handleSubmit = async () => {
        if (!form.amount || parseFloat(form.amount) <= 0) return;
        const url = editId ? `${API_URL}/finance/transactions/${editId}` : `${API_URL}/finance/${trackerId}/transactions`;
        const method = editId ? 'PUT' : 'POST';
        try {
            const res = await authFetch(url, { method, body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }) });
            if (res.ok) {
                setShowAdd(false); setEditId(null);
                setForm({ type: 'expense', amount: '', category_id: '', date: new Date().toISOString().split('T')[0], description: '' });
                loadTransactions();
                onDataChange && onDataChange();
            }
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this transaction?')) return;
        try {
            await authFetch(`${API_URL}/finance/transactions/${id}`, { method: 'DELETE' });
            loadTransactions();
            onDataChange && onDataChange();
        } catch (e) { console.error(e); }
    };

    const startEdit = (tx) => {
        setForm({ type: tx.type, amount: tx.amount, category_id: tx.category_id || '', date: tx.date?.split('T')[0] || '', description: tx.description || '' });
        setEditId(tx.id); setShowAdd(true);
    };

    const handleExport = async () => {
        const params = new URLSearchParams({ section: 'transactions' });
        if (filters.from) params.set('from', filters.from);
        if (filters.to) params.set('to', filters.to);
        if (filters.category_id) params.set('category_id', filters.category_id);
        try {
            const res = await authFetch(`${API_URL}/finance/${trackerId}/export?${params}`);
            if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'transactions_export.csv'; a.click();
                URL.revokeObjectURL(url);
            }
        } catch (e) { console.error(e); }
    };

    return (
        <div className="space-y-4">
            {/* Actions Bar */}
            <div className="flex flex-wrap gap-2 items-center">
                {permissions.can_write && (
                    <button onClick={() => { setEditId(null); setForm({ type: 'expense', amount: '', category_id: '', date: new Date().toISOString().split('T')[0], description: '' }); setShowAdd(true); }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-medium flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Add Transaction
                    </button>
                )}
                {permissions.can_export && (
                    <button onClick={handleExport} className="px-3 py-2 rounded-xl bg-slate-800/50 border border-white/10 text-slate-400 hover:text-white text-sm flex items-center gap-1.5 transition-all">
                        📥 Export CSV
                    </button>
                )}
                <div className="flex-1" />
                {/* Filters */}
                <select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })}
                    className="px-3 py-2 rounded-xl bg-slate-800/50 border border-white/10 text-sm text-slate-300 outline-none">
                    <option value="">All Types</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                </select>
                <select value={filters.category_id} onChange={e => setFilters({ ...filters, category_id: e.target.value })}
                    className="px-3 py-2 rounded-xl bg-slate-800/50 border border-white/10 text-sm text-slate-300 outline-none max-w-[150px]">
                    <option value="">All Categories</option>
                    {flatCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
                <input type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })}
                    className="px-3 py-2 rounded-xl bg-slate-800/50 border border-white/10 text-sm text-slate-300 outline-none" />
                <input type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })}
                    className="px-3 py-2 rounded-xl bg-slate-800/50 border border-white/10 text-sm text-slate-300 outline-none" />
            </div>

            {/* Add/Edit Form */}
            {showAdd && (
                <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10 space-y-3">
                    <div className="flex gap-2">
                        <button onClick={() => setForm({ ...form, type: 'expense' })} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${form.type === 'expense' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-slate-400 border border-white/10'}`}>Expense</button>
                        <button onClick={() => setForm({ ...form, type: 'income' })} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${form.type === 'income' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-slate-400 border border-white/10'}`}>Income</button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <input type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                            className="px-3 py-2 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm outline-none focus:border-cyan-500/50" />
                        <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}
                            className="px-3 py-2 rounded-xl bg-slate-900/50 border border-white/10 text-sm text-slate-300 outline-none">
                            <option value="">No Category</option>
                            {flatCats.filter(c => c.type === form.type || c.type === 'both').map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                        </select>
                        <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                            className="px-3 py-2 rounded-xl bg-slate-900/50 border border-white/10 text-sm text-slate-300 outline-none" />
                        <input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                            className="px-3 py-2 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm outline-none placeholder-slate-500" />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => { setShowAdd(false); setEditId(null); }} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
                        <button onClick={handleSubmit} className="px-6 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium">{editId ? 'Update' : 'Add'}</button>
                    </div>
                </div>
            )}

            {/* Transaction List */}
            {loading ? (
                <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>
            ) : transactions.length === 0 ? (
                <div className="text-center py-12 text-slate-500"><p>No transactions yet</p></div>
            ) : (
                <div className="space-y-2">
                    <p className="text-xs text-slate-500">{total} transaction{total !== 1 ? 's' : ''}</p>
                    {transactions.map(tx => (
                        <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-white/5 hover:border-white/10 transition-all group">
                            <span className="text-lg">{tx.category_icon || (tx.type === 'income' ? '💰' : '💸')}</span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-white font-medium truncate">{tx.description || tx.category_name || (tx.type === 'income' ? 'Income' : 'Expense')}</span>
                                    {tx.category_name && <span className="text-[10px] px-1.5 py-0.5 rounded-full border" style={{ borderColor: tx.category_color + '50', color: tx.category_color, background: tx.category_color + '15' }}>{tx.category_name}</span>}
                                </div>
                                <span className="text-xs text-slate-500">{new Date(tx.date).toLocaleDateString()} {tx.entered_by ? `· ${tx.entered_by}` : ''}</span>
                            </div>
                            <span className={`text-sm font-semibold ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                                {tx.type === 'income' ? '+' : '-'}{currency} {Number(tx.amount).toLocaleString()}
                            </span>
                            <div className="hidden group-hover:flex gap-1">
                                {permissions.can_write && <button onClick={() => startEdit(tx)} className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10">✏️</button>}
                                {permissions.can_delete && <button onClick={() => handleDelete(tx.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10">🗑️</button>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TransactionList;

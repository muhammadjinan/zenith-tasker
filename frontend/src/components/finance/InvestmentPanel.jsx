import React, { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const InvestmentPanel = ({ trackerId, currency, permissions, authFetch, onDataChange }) => {
    const [investments, setInvestments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [editId, setEditId] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const [dividends, setDividends] = useState([]);
    const [divForm, setDivForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
    const [form, setForm] = useState({ name: '', type: 'stock', symbol: '', units: '', buy_price: '', current_price: '', buy_date: '', notes: '' });

    const TYPES = ['stock', 'mutual_fund', 'crypto', 'bond', 'real_estate', 'gold', 'other'];

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${API_URL}/finance/${trackerId}/investments`);
            if (res.ok) setInvestments(await res.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [trackerId, authFetch]);

    useEffect(() => { load(); }, [load]);

    const handleSubmit = async () => {
        if (!form.name) return;
        const url = editId ? `${API_URL}/finance/investments/${editId}` : `${API_URL}/finance/${trackerId}/investments`;
        try {
            await authFetch(url, { method: editId ? 'PUT' : 'POST', body: JSON.stringify(form) });
            setShowAdd(false); setEditId(null);
            setForm({ name: '', type: 'stock', symbol: '', units: '', buy_price: '', current_price: '', buy_date: '', notes: '' });
            load();
            onDataChange && onDataChange();
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this investment?')) return;
        try { await authFetch(`${API_URL}/finance/investments/${id}`, { method: 'DELETE' }); load(); onDataChange && onDataChange(); } catch (e) { console.error(e); }
    };

    const loadDividends = async (invId) => {
        if (expandedId === invId) { setExpandedId(null); return; }
        setExpandedId(invId);
        try {
            const res = await authFetch(`${API_URL}/finance/investments/${invId}/dividends`);
            if (res.ok) setDividends(await res.json());
        } catch (e) { console.error(e); }
    };

    const addDividend = async () => {
        if (!divForm.amount) return;
        try {
            await authFetch(`${API_URL}/finance/investments/${expandedId}/dividends`, { method: 'POST', body: JSON.stringify(divForm) });
            setDivForm({ amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
            loadDividends(expandedId);
            load();
            onDataChange && onDataChange();
        } catch (e) { console.error(e); }
    };

    const canManage = permissions.is_owner || permissions.can_manage_investments;

    // Portfolio totals
    const totalInvested = investments.reduce((s, i) => s + parseFloat(i.units) * parseFloat(i.buy_price), 0);
    const totalCurrent = investments.reduce((s, i) => s + parseFloat(i.units) * parseFloat(i.current_price), 0);
    const totalDividends = investments.reduce((s, i) => s + parseFloat(i.total_dividends || 0), 0);
    const gainLoss = totalCurrent - totalInvested;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">Investments</h3>
                {canManage && <button onClick={() => { setEditId(null); setForm({ name: '', type: 'stock', symbol: '', units: '', buy_price: '', current_price: '', buy_date: '', notes: '' }); setShowAdd(true); }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-medium flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>Add Investment
                </button>}
            </div>

            {/* Portfolio Summary */}
            {investments.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5">
                        <p className="text-[10px] text-slate-500">Invested</p>
                        <p className="text-lg font-bold text-white">{currency} {totalInvested.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5">
                        <p className="text-[10px] text-slate-500">Current Value</p>
                        <p className="text-lg font-bold text-white">{currency} {totalCurrent.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5">
                        <p className="text-[10px] text-slate-500">Gain/Loss</p>
                        <p className={`text-lg font-bold ${gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>{gainLoss >= 0 ? '+' : ''}{currency} {gainLoss.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5">
                        <p className="text-[10px] text-slate-500">Total Dividends</p>
                        <p className="text-lg font-bold text-emerald-400">{currency} {totalDividends.toLocaleString()}</p>
                    </div>
                </div>
            )}

            {/* Add Form */}
            {showAdd && (
                <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="px-3 py-2 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm outline-none" />
                        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="px-3 py-2 rounded-xl bg-slate-900/50 border border-white/10 text-sm text-slate-300 outline-none">
                            {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                        </select>
                        <input placeholder="Symbol" value={form.symbol} onChange={e => setForm({ ...form, symbol: e.target.value })} className="px-3 py-2 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm outline-none" />
                        <input type="number" placeholder="Units" value={form.units} onChange={e => setForm({ ...form, units: e.target.value })} className="px-3 py-2 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm outline-none" />
                        <input type="number" placeholder="Buy Price" value={form.buy_price} onChange={e => setForm({ ...form, buy_price: e.target.value })} className="px-3 py-2 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm outline-none" />
                        <input type="number" placeholder="Current Price" value={form.current_price} onChange={e => setForm({ ...form, current_price: e.target.value })} className="px-3 py-2 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm outline-none" />
                        <input type="date" value={form.buy_date} onChange={e => setForm({ ...form, buy_date: e.target.value })} className="px-3 py-2 rounded-xl bg-slate-900/50 border border-white/10 text-sm text-slate-300 outline-none" />
                        <input placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="px-3 py-2 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm outline-none placeholder-slate-500" />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-slate-400">Cancel</button>
                        <button onClick={handleSubmit} className="px-6 py-2 rounded-xl bg-cyan-600 text-white text-sm font-medium">{editId ? 'Update' : 'Add'}</button>
                    </div>
                </div>
            )}

            {/* Investment List */}
            {loading ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>
                : investments.length === 0 ? <p className="text-center py-8 text-slate-500">No investments tracked yet</p>
                    : (
                        <div className="space-y-2">
                            {investments.map(inv => {
                                const val = parseFloat(inv.units) * parseFloat(inv.current_price);
                                const cost = parseFloat(inv.units) * parseFloat(inv.buy_price);
                                const gl = val - cost;
                                const glPct = cost > 0 ? ((gl / cost) * 100).toFixed(1) : 0;
                                return (
                                    <div key={inv.id}>
                                        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-white/5 hover:border-white/10 transition-all group cursor-pointer" onClick={() => loadDividends(inv.id)}>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2"><span className="text-sm text-white font-medium">{inv.name}</span>{inv.symbol && <span className="text-[10px] text-slate-500">{inv.symbol}</span>}<span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700/50 text-slate-400">{inv.type.replace('_', ' ')}</span></div>
                                                <span className="text-xs text-slate-500">{inv.units} units @ {currency} {Number(inv.buy_price).toLocaleString()}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-white">{currency} {val.toLocaleString()}</p>
                                                <p className={`text-xs ${gl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{gl >= 0 ? '+' : ''}{currency} {gl.toLocaleString()} ({glPct}%)</p>
                                            </div>
                                            {parseFloat(inv.total_dividends) > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">div: {currency} {Number(inv.total_dividends).toLocaleString()}</span>}
                                            {canManage && <button onClick={e => { e.stopPropagation(); handleDelete(inv.id); }} className="hidden group-hover:block p-1 text-slate-500 hover:text-red-400">🗑️</button>}
                                        </div>
                                        {/* Dividends Expanded */}
                                        {expandedId === inv.id && (
                                            <div className="ml-6 mt-1 p-3 rounded-xl bg-slate-800/20 border border-white/[.03] space-y-2">
                                                <p className="text-xs text-slate-400 font-medium">Dividends</p>
                                                {canManage && (
                                                    <div className="flex gap-2">
                                                        <input type="number" placeholder="Amount" value={divForm.amount} onChange={e => setDivForm({ ...divForm, amount: e.target.value })} className="px-2 py-1 rounded-lg bg-slate-900/50 border border-white/10 text-white text-xs outline-none w-24" />
                                                        <input type="date" value={divForm.date} onChange={e => setDivForm({ ...divForm, date: e.target.value })} className="px-2 py-1 rounded-lg bg-slate-900/50 border border-white/10 text-slate-300 text-xs outline-none" />
                                                        <button onClick={addDividend} className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs">Add</button>
                                                    </div>
                                                )}
                                                {dividends.length === 0 ? <p className="text-xs text-slate-600">No dividends recorded</p>
                                                    : dividends.map(d => (
                                                        <div key={d.id} className="flex items-center gap-2 text-xs text-slate-400">
                                                            <span className="text-emerald-400 font-medium">+{currency} {Number(d.amount).toLocaleString()}</span>
                                                            <span>{new Date(d.date).toLocaleDateString()}</span>
                                                            {d.notes && <span className="text-slate-600">{d.notes}</span>}
                                                        </div>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
        </div>
    );
};

export default InvestmentPanel;

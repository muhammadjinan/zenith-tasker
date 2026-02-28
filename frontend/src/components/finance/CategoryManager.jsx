import React, { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CategoryManager = ({ trackerId, permissions, authFetch }) => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ name: '', icon: '📂', color: '#6366f1', type: 'expense', parent_id: '' });
    const [editId, setEditId] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', icon: '', color: '', type: '', parent_id: '' });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${API_URL}/finance/${trackerId}/categories`);
            if (res.ok) setCategories(await res.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [trackerId, authFetch]);

    useEffect(() => { load(); }, [load]);

    const handleAdd = async () => {
        if (!form.name.trim()) return;
        try {
            await authFetch(`${API_URL}/finance/${trackerId}/categories`, {
                method: 'POST', body: JSON.stringify({ ...form, parent_id: form.parent_id || null })
            });
            setShowAdd(false); setForm({ name: '', icon: '📂', color: '#6366f1', type: 'expense', parent_id: '' });
            load();
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this category?')) return;
        try { await authFetch(`${API_URL}/finance/categories/${id}`, { method: 'DELETE' }); load(); }
        catch (e) { console.error(e); }
    };

    const startEdit = (cat) => {
        setEditId(cat.id);
        setEditForm({ name: cat.name, icon: cat.icon, color: cat.color, type: cat.type, parent_id: cat.parent_id || '' });
    };

    const cancelEdit = () => {
        setEditId(null);
        setEditForm({ name: '', icon: '', color: '', type: '', parent_id: '' });
    };

    const handleUpdate = async () => {
        if (!editForm.name.trim()) return;
        try {
            await authFetch(`${API_URL}/finance/categories/${editId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    name: editForm.name,
                    icon: editForm.icon,
                    color: editForm.color,
                    type: editForm.type,
                    parent_id: editForm.parent_id || null,
                })
            });
            cancelEdit();
            load();
        } catch (e) { console.error(e); }
    };

    const canManage = permissions.is_owner || permissions.can_manage_categories;
    const flatCats = categories.flatMap(c => [c]);

    // Edit form component (reused for both parents and children)
    const renderEditForm = (cat) => (
        <div className="p-3 rounded-xl bg-slate-900/70 border border-cyan-500/30 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <input placeholder="Category name" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    className="px-3 py-2 rounded-xl bg-slate-800/50 border border-white/10 text-white text-sm outline-none focus:border-cyan-500/50" />
                <input placeholder="Icon emoji" value={editForm.icon} onChange={e => setEditForm({ ...editForm, icon: e.target.value })}
                    className="px-3 py-2 rounded-xl bg-slate-800/50 border border-white/10 text-white text-sm outline-none w-20" />
                <input type="color" value={editForm.color} onChange={e => setEditForm({ ...editForm, color: e.target.value })}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0" />
                <select value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })}
                    className="px-3 py-2 rounded-xl bg-slate-800/50 border border-white/10 text-sm text-slate-300 outline-none">
                    <option value="expense">Expense</option><option value="income">Income</option><option value="both">Both</option>
                </select>
            </div>
            {/* Parent selector (for moving sub-categories) */}
            <select value={editForm.parent_id} onChange={e => setEditForm({ ...editForm, parent_id: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/50 border border-white/10 text-sm text-slate-300 outline-none">
                <option value="">No parent (top-level)</option>
                {flatCats.filter(c => c.id !== cat.id).map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <div className="flex justify-end gap-2">
                <button onClick={cancelEdit} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button onClick={handleUpdate} className="px-6 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors">Save</button>
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">Categories</h3>
                {canManage && <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-medium flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>Add Category
                </button>}
            </div>

            {showAdd && (
                <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <input placeholder="Category name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                            className="px-3 py-2 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm outline-none" />
                        <input placeholder="Icon emoji" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })}
                            className="px-3 py-2 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm outline-none w-20" />
                        <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })}
                            className="w-10 h-10 rounded-lg cursor-pointer border-0" />
                        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                            className="px-3 py-2 rounded-xl bg-slate-900/50 border border-white/10 text-sm text-slate-300 outline-none">
                            <option value="expense">Expense</option><option value="income">Income</option><option value="both">Both</option>
                        </select>
                    </div>
                    <select value={form.parent_id} onChange={e => setForm({ ...form, parent_id: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900/50 border border-white/10 text-sm text-slate-300 outline-none">
                        <option value="">No parent (top-level)</option>
                        {flatCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                    </select>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-slate-400">Cancel</button>
                        <button onClick={handleAdd} className="px-6 py-2 rounded-xl bg-cyan-600 text-white text-sm font-medium">Add</button>
                    </div>
                </div>
            )}

            {loading ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>
                : categories.length === 0 ? <p className="text-center py-8 text-slate-500">No categories</p>
                    : (
                        <div className="space-y-2">
                            {categories.map(cat => (
                                <div key={cat.id}>
                                    {editId === cat.id ? renderEditForm(cat) : (
                                        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-white/5 group">
                                            <span className="text-lg">{cat.icon}</span>
                                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                                            <span className="text-sm text-white font-medium flex-1">{cat.name}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${cat.type === 'income' ? 'bg-green-500/15 text-green-400' : cat.type === 'both' ? 'bg-blue-500/15 text-blue-400' : 'bg-red-500/15 text-red-400'}`}>{cat.type}</span>
                                            {cat.is_default && <span className="text-[10px] text-slate-500">default</span>}
                                            {canManage && (
                                                <div className="hidden group-hover:flex items-center gap-1">
                                                    <button onClick={() => startEdit(cat)} className="p-1 rounded text-slate-500 hover:text-cyan-400 text-xs" title="Edit">✏️</button>
                                                    {!cat.is_default && <button onClick={() => handleDelete(cat.id)} className="p-1 rounded text-slate-500 hover:text-red-400 text-xs" title="Delete">🗑️</button>}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {cat.children?.length > 0 && (
                                        <div className="ml-8 mt-1 space-y-1">
                                            {cat.children.map(sub => (
                                                <div key={sub.id}>
                                                    {editId === sub.id ? renderEditForm(sub) : (
                                                        <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/20 border border-white/[.03] group">
                                                            <span>{sub.icon}</span>
                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sub.color }} />
                                                            <span className="text-xs text-slate-300 flex-1">{sub.name}</span>
                                                            {canManage && (
                                                                <div className="hidden group-hover:flex items-center gap-1">
                                                                    <button onClick={() => startEdit(sub)} className="text-xs text-slate-600 hover:text-cyan-400" title="Edit">✏️</button>
                                                                    {!sub.is_default && <button onClick={() => handleDelete(sub.id)} className="text-xs text-slate-600 hover:text-red-400" title="Delete">🗑️</button>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
        </div>
    );
};

export default CategoryManager;

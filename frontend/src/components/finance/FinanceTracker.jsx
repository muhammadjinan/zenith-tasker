import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import TransactionList from './TransactionList';
import CategoryManager from './CategoryManager';
import InvestmentPanel from './InvestmentPanel';
import LoanTracker from './LoanTracker';
import MemberManager from './MemberManager';
import FinanceCharts from './FinanceCharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const TRACKER_TYPES = [
    { id: 'personal', label: 'Personal', icon: '👤', color: '#22d3ee' },
    { id: 'business', label: 'Business', icon: '🏢', color: '#a855f7' },
    { id: 'project', label: 'Project', icon: '🏗️', color: '#f59e0b' },
    { id: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦', color: '#ec4899' },
];

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'JPY', 'CAD', 'AUD', 'SGD', 'CHF', 'CNY'];

const TABS = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'transactions', label: 'Transactions', icon: '💳' },
    { id: 'investments', label: 'Investments', icon: '📈' },
    { id: 'loans', label: 'Loans', icon: '🤝' },
    { id: 'categories', label: 'Categories', icon: '📂' },
    { id: 'members', label: 'Members', icon: '👥' },
];

const ALL_SECTIONS = ['overview', 'transactions', 'investments', 'loans', 'categories', 'members'];

const FinanceTracker = ({ trackerId, onBack, onUpdateCounts }) => {
    const { user } = useAuth();
    const [trackers, setTrackers] = useState([]);
    const [activeTracker, setActiveTracker] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newTracker, setNewTracker] = useState({ name: '', type: 'personal', currency: 'INR', description: '', enabled_sections: [...ALL_SECTIONS] });
    const [showSettings, setShowSettings] = useState(false);
    const [typeFilter, setTypeFilter] = useState('all');
    const [balanceSources, setBalanceSources] = useState([]);
    const [showAddSource, setShowAddSource] = useState(false);
    const [sourceForm, setSourceForm] = useState({ name: '', icon: '🏦', initial_balance: '' });
    const [editSourceId, setEditSourceId] = useState(null);

    const authFetch = useCallback(async (url, opts = {}) => {
        const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}`, ...opts.headers };
        return fetch(url, { ...opts, headers });
    }, [user?.token]);

    // Load trackers
    const loadTrackers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${API_URL}/finance`);
            if (res.ok) { const data = await res.json(); setTrackers(data); }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [authFetch]);

    useEffect(() => { loadTrackers(); }, [loadTrackers]);

    // Auto-select tracker
    useEffect(() => {
        if (trackerId && trackers.length) {
            const t = trackers.find(t => t.id === parseInt(trackerId));
            if (t) loadTracker(t.id);
        }
    }, [trackerId, trackers]);

    const loadTracker = async (id) => {
        try {
            const res = await authFetch(`${API_URL}/finance/${id}`);
            if (res.ok) setActiveTracker(await res.json());
        } catch (err) { console.error(err); }
    };

    const createTracker = async () => {
        if (!newTracker.name.trim()) return;
        try {
            const res = await authFetch(`${API_URL}/finance`, { method: 'POST', body: JSON.stringify(newTracker) });
            if (res.ok) {
                const t = await res.json();
                setShowCreate(false);
                setShowSettings(false);
                setNewTracker({ name: '', type: 'personal', currency: 'INR', description: '', enabled_sections: [...ALL_SECTIONS] });
                await loadTrackers();
                if (onUpdateCounts) onUpdateCounts();
                loadTracker(t.id);
            }
        } catch (err) { console.error(err); }
    };

    const deleteTracker = async (id) => {
        if (!confirm('Delete this tracker and all its data? This cannot be undone.')) return;
        try {
            await authFetch(`${API_URL}/finance/${id}`, { method: 'DELETE' });
            setActiveTracker(null);
            loadTrackers();
            if (onUpdateCounts) onUpdateCounts();
        } catch (err) { console.error(err); }
    };

    // ====== BALANCE SOURCES ======
    const loadBalanceSources = useCallback(async (id) => {
        try {
            const res = await authFetch(`${API_URL}/finance/${id}/balance-sources`);
            if (res.ok) setBalanceSources(await res.json());
        } catch (e) { console.error(e); }
    }, [authFetch]);

    const handleAddSource = async () => {
        if (!sourceForm.name.trim()) return;
        const url = editSourceId ? `${API_URL}/finance/balance-sources/${editSourceId}` : `${API_URL}/finance/${activeTracker.id}/balance-sources`;
        try {
            await authFetch(url, { method: editSourceId ? 'PUT' : 'POST', body: JSON.stringify({ ...sourceForm, initial_balance: parseFloat(sourceForm.initial_balance) || 0 }) });
            setShowAddSource(false); setEditSourceId(null);
            setSourceForm({ name: '', icon: '🏦', initial_balance: '' });
            loadBalanceSources(activeTracker.id);
        } catch (e) { console.error(e); }
    };

    const handleDeleteSource = async (id) => {
        if (!confirm('Delete this balance source?')) return;
        try { await authFetch(`${API_URL}/finance/balance-sources/${id}`, { method: 'DELETE' }); loadBalanceSources(activeTracker.id); }
        catch (e) { console.error(e); }
    };

    // Load balance sources when tracker changes
    useEffect(() => {
        if (activeTracker?.id) loadBalanceSources(activeTracker.id);
    }, [activeTracker?.id, loadBalanceSources]);

    const updateSections = async (sections) => {
        try {
            const res = await authFetch(`${API_URL}/finance/${activeTracker.id}`, {
                method: 'PUT', body: JSON.stringify({ enabled_sections: sections })
            });
            if (res.ok) {
                const updated = await res.json();
                setActiveTracker(prev => ({ ...prev, enabled_sections: updated.enabled_sections }));
                // If current tab is now disabled, switch to first enabled
                if (!sections.includes(activeTab)) {
                    setActiveTab(sections[0] || 'overview');
                }
            }
        } catch (e) { console.error(e); }
    };

    const perms = activeTracker?.permissions || {};
    const stats = activeTracker?.stats || {};
    const enabledSections = activeTracker?.enabled_sections || ALL_SECTIONS;

    // ====== TRACKER LIST VIEW ======
    const getHeaderTitle = () => {
        switch (typeFilter) {
            case 'all': return 'All Finance Trackers';
            case 'personal': return 'Personal Finances';
            case 'business': return 'Business Finances';
            case 'project': return 'Project Finances';
            case 'family': return 'Family Finances';
            case 'shared': return 'Shared With Me';
            default: return 'Finance Trackers';
        }
    };

    if (!activeTracker) {
        return (
            <div className="h-full flex flex-col">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pl-12 lg:pl-0">
                    <h1 className="text-3xl font-semibold text-white lg:truncate">{getHeaderTitle()}</h1>
                    <button onClick={() => setShowCreate(true)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        New Tracker
                    </button>
                </div>

                {/* Create Modal */}
                {showCreate && (
                    <>
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowCreate(false)} />
                        <div className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50 px-4">
                            <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6">
                                <h2 className="text-xl font-semibold text-white mb-4">Create Finance Tracker</h2>
                                <div className="space-y-4">
                                    <input value={newTracker.name} onChange={e => setNewTracker({ ...newTracker, name: e.target.value })}
                                        placeholder="Tracker name..." className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder-slate-500 outline-none focus:border-cyan-500/50 text-sm" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-slate-400 mb-1 block">Type</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {TRACKER_TYPES.map(t => (
                                                    <button key={t.id} onClick={() => setNewTracker({ ...newTracker, type: t.id })}
                                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${newTracker.type === t.id ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>
                                                        <span>{t.icon}</span>{t.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400 mb-1 block">Currency</label>
                                            <select value={newTracker.currency} onChange={e => setNewTracker({ ...newTracker, currency: e.target.value })}
                                                className="w-full px-3 py-2 rounded-xl bg-slate-800/50 border border-white/10 text-white text-sm outline-none">
                                                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <textarea value={newTracker.description} onChange={e => setNewTracker({ ...newTracker, description: e.target.value })}
                                        placeholder="Description (optional)" rows={2}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder-slate-500 outline-none text-sm resize-none" />
                                    <div>
                                        <label className="text-xs text-slate-400 mb-2 block">Enabled Sections</label>
                                        <div className="flex flex-wrap gap-2">
                                            {TABS.map(tab => {
                                                const isOn = newTracker.enabled_sections.includes(tab.id);
                                                return (
                                                    <button key={tab.id} onClick={() => {
                                                        setNewTracker(prev => ({
                                                            ...prev,
                                                            enabled_sections: isOn
                                                                ? prev.enabled_sections.filter(s => s !== tab.id)
                                                                : [...prev.enabled_sections, tab.id]
                                                        }));
                                                    }}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${isOn ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400' : 'border-white/10 text-slate-500 hover:bg-white/5'}`}>
                                                        <span>{tab.icon}</span>{tab.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition-colors text-sm">Cancel</button>
                                        <button onClick={createTracker} className="px-6 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-sm transition-colors">Create</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Type Sub-tabs */}
                <div className="flex gap-1 mb-6 overflow-x-auto pb-1 pl-12 lg:pl-0">
                    {[{ id: 'all', label: 'All', icon: '📋' }, ...TRACKER_TYPES].map(t => (
                        <button key={t.id} onClick={() => setTypeFilter(t.id)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${typeFilter === t.id ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
                            <span>{t.icon}</span>{t.label}
                        </button>
                    ))}
                </div>

                {/* Tracker Cards */}
                {loading ? (
                    <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>
                ) : trackers.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <span className="text-6xl mb-4">💰</span>
                        <h2 className="text-xl text-white font-medium mb-2">No finance trackers yet</h2>
                        <p className="text-slate-400 text-sm mb-6">Create your first tracker to start managing your finances</p>
                        <button onClick={() => setShowCreate(true)} className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium">Get Started</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {trackers.filter(t => typeFilter === 'all' || t.type === typeFilter).map(t => {
                            const meta = TRACKER_TYPES.find(tt => tt.id === t.type) || TRACKER_TYPES[0];
                            return (
                                <button key={t.id} onClick={() => loadTracker(t.id)}
                                    className="group p-5 rounded-2xl bg-slate-800/40 border border-white/5 hover:border-cyan-500/30 hover:bg-slate-800/60 transition-all text-left">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="text-2xl">{meta.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-white font-medium truncate group-hover:text-cyan-400 transition-colors">{t.name}</h3>
                                            <span className="text-xs text-slate-500">{meta.label} · {t.currency}</span>
                                        </div>
                                        {t.is_owner && <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">Owner</span>}
                                    </div>
                                    <div className="flex gap-4 text-xs">
                                        <span className="text-slate-500">{t.member_count} member{t.member_count != 1 ? 's' : ''}</span>
                                        <span className="text-slate-600">{new Date(t.updated_at).toLocaleDateString()}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    // ====== ACTIVE TRACKER VIEW ======
    const typeMeta = TRACKER_TYPES.find(t => t.id === activeTracker.type) || TRACKER_TYPES[0];

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-4 mb-4 pl-12 lg:pl-0">
                <button onClick={() => setActiveTracker(null)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">{typeMeta.icon}</span>
                        <h1 className="text-2xl font-semibold text-white truncate">{activeTracker.name}</h1>
                        <span className="text-xs px-2 py-0.5 rounded-full border" style={{ borderColor: typeMeta.color + '50', color: typeMeta.color, background: typeMeta.color + '15' }}>{typeMeta.label}</span>
                        <span className="text-xs text-slate-500 ml-1">{activeTracker.currency}</span>
                    </div>
                </div>
                {perms.is_owner && (
                    <div className="flex items-center gap-1">
                        <button onClick={() => setShowSettings(!showSettings)} className="p-2 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all" title="Tracker settings">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                        <button onClick={() => deleteTracker(activeTracker.id)} className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete tracker">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                )}
            </div>

            {/* Settings Panel */}
            {showSettings && perms.is_owner && (
                <div className="mb-4 p-4 rounded-xl bg-slate-800/50 border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-white">Enabled Sections</h3>
                        <button onClick={() => setShowSettings(false)} className="text-xs text-slate-500 hover:text-white">✕</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {TABS.map(tab => {
                            const isOn = enabledSections.includes(tab.id);
                            return (
                                <button key={tab.id} onClick={() => {
                                    const next = isOn
                                        ? enabledSections.filter(s => s !== tab.id)
                                        : [...enabledSections, tab.id];
                                    if (next.length === 0) return; // prevent disabling all
                                    updateSections(next);
                                }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${isOn ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400' : 'border-white/10 text-slate-500 hover:bg-white/5'}`}>
                                    <span>{tab.icon}</span>{tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
                {TABS.filter(tab => {
                    if (!enabledSections.includes(tab.id)) return false;
                    if (tab.id === 'members' && !perms.is_owner && !perms.can_manage_members) return false;
                    if (tab.id === 'investments' && !perms.can_read) return false;
                    return true;
                }).map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
                        <span>{tab.icon}</span>{tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
                {activeTab === 'overview' && (
                    <div className="space-y-4">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
                                <p className="text-xs text-green-400/70 mb-1">Total Income</p>
                                <p className="text-2xl font-bold text-green-400">{activeTracker.currency} {Number(stats.total_income || 0).toLocaleString()}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-rose-500/10 border border-red-500/20">
                                <p className="text-xs text-red-400/70 mb-1">Total Expenses</p>
                                <p className="text-2xl font-bold text-red-400">{activeTracker.currency} {Number(stats.total_expense || 0).toLocaleString()}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                                <p className="text-xs text-cyan-400/70 mb-1">Balance</p>
                                {(() => { const totalInitial = balanceSources.reduce((s, b) => s + parseFloat(b.initial_balance || 0), 0); const total = (stats.balance || 0) + totalInitial; return <p className={`text-2xl font-bold ${total >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>{activeTracker.currency} {Number(total).toLocaleString()}</p>; })()}
                            </div>
                            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                                <p className="text-xs text-amber-400/70 mb-1">Transactions</p>
                                <p className="text-2xl font-bold text-amber-400">{stats.transaction_count || 0}</p>
                            </div>
                        </div>
                        {/* Loan Summary */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 rounded-xl bg-slate-800/40 border border-white/5">
                                <p className="text-xs text-slate-400 mb-1">Cash Borrowed (Active)</p>
                                <p className="text-xl font-bold text-orange-400">{activeTracker.currency} {Number(stats.total_borrowed || 0).toLocaleString()}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-slate-800/40 border border-white/5">
                                <p className="text-xs text-slate-400 mb-1">Cash Given (Active)</p>
                                <p className="text-xl font-bold text-purple-400">{activeTracker.currency} {Number(stats.total_given || 0).toLocaleString()}</p>
                            </div>
                        </div>
                        {/* Balance Sources */}
                        <div className="p-4 rounded-xl bg-slate-800/40 border border-white/5">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-medium text-white">Balance Sources</h3>
                                {(perms.is_owner || perms.can_write) && (
                                    <button onClick={() => { setEditSourceId(null); setSourceForm({ name: '', icon: '🏦', initial_balance: '' }); setShowAddSource(true); }}
                                        className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>Add
                                    </button>
                                )}
                            </div>
                            {showAddSource && (
                                <div className="mb-3 flex gap-2 items-end">
                                    <input placeholder="Icon" value={sourceForm.icon} onChange={e => setSourceForm({ ...sourceForm, icon: e.target.value })}
                                        className="w-12 px-2 py-2 rounded-lg bg-slate-900/50 border border-white/10 text-white text-sm outline-none text-center" />
                                    <input placeholder="Source name (e.g. HDFC Bank)" value={sourceForm.name} onChange={e => setSourceForm({ ...sourceForm, name: e.target.value })}
                                        className="flex-1 px-3 py-2 rounded-lg bg-slate-900/50 border border-white/10 text-white text-sm outline-none" />
                                    <input type="number" placeholder="Initial balance" value={sourceForm.initial_balance} onChange={e => setSourceForm({ ...sourceForm, initial_balance: e.target.value })}
                                        className="w-36 px-3 py-2 rounded-lg bg-slate-900/50 border border-white/10 text-white text-sm outline-none" />
                                    <button onClick={handleAddSource} className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium">{editSourceId ? 'Save' : 'Add'}</button>
                                    <button onClick={() => { setShowAddSource(false); setEditSourceId(null); }} className="px-3 py-2 text-sm text-slate-400">✕</button>
                                </div>
                            )}
                            {balanceSources.length === 0 && !showAddSource ? (
                                <p className="text-xs text-slate-500">No balance sources added yet</p>
                            ) : (
                                <div className="space-y-2">
                                    {balanceSources.map(src => (
                                        <div key={src.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/30 border border-white/[.03] group">
                                            <span>{src.icon}</span>
                                            <span className="text-sm text-white flex-1">{src.name}</span>
                                            <span className="text-sm font-medium text-cyan-400">{activeTracker.currency} {Number(src.initial_balance || 0).toLocaleString()}</span>
                                            {(perms.is_owner || perms.can_write) && (
                                                <div className="hidden group-hover:flex gap-1">
                                                    <button onClick={() => { setEditSourceId(src.id); setSourceForm({ name: src.name, icon: src.icon, initial_balance: src.initial_balance }); setShowAddSource(true); }} className="text-xs text-slate-500 hover:text-cyan-400">✏️</button>
                                                    <button onClick={() => handleDeleteSource(src.id)} className="text-xs text-slate-500 hover:text-red-400">🗑️</button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                        <span className="text-xs text-slate-400">Total Initial Balance</span>
                                        <span className="text-sm font-bold text-white">{activeTracker.currency} {balanceSources.reduce((s, b) => s + parseFloat(b.initial_balance || 0), 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Charts & Analytics */}
                        <FinanceCharts trackerId={activeTracker.id} currency={activeTracker.currency} authFetch={authFetch} />
                        {/* Export */}
                        {(perms.is_owner || perms.can_export) && (
                            <div className="p-4 rounded-xl bg-slate-800/40 border border-white/5">
                                <h3 className="text-sm font-medium text-white mb-3">Export Data</h3>
                                <div className="flex flex-wrap gap-2">
                                    {['transactions', 'investments', 'loans'].map(section => (
                                        <button key={section} onClick={async () => {
                                            try {
                                                const res = await authFetch(`${API_URL}/finance/${activeTracker.id}/export?section=${section}`);
                                                if (res.ok) {
                                                    const blob = await res.blob();
                                                    const url = URL.createObjectURL(blob);
                                                    const a = document.createElement('a'); a.href = url; a.download = `${section}_export.csv`; a.click();
                                                    URL.revokeObjectURL(url);
                                                }
                                            } catch (e) { console.error(e); }
                                        }}
                                            className="px-3 py-2 rounded-lg bg-slate-900/50 border border-white/10 text-sm text-slate-300 hover:text-white hover:border-cyan-500/30 transition-all flex items-center gap-1.5">
                                            📥 {section.charAt(0).toUpperCase() + section.slice(1)} CSV
                                        </button>
                                    ))}
                                    <button onClick={async () => {
                                        try {
                                            const res = await authFetch(`${API_URL}/finance/${activeTracker.id}/export?section=transactions`);
                                            if (res.ok) {
                                                const text = await res.text();
                                                const tsv = text.split('\n').map(line => line.replace(/,/g, '\t')).join('\n');
                                                await navigator.clipboard.writeText(tsv);
                                                alert('Copied! Paste into Google Sheets.');
                                            }
                                        } catch (e) { console.error(e); }
                                    }}
                                        className="px-3 py-2 rounded-lg bg-slate-900/50 border border-white/10 text-sm text-slate-300 hover:text-white hover:border-green-500/30 transition-all flex items-center gap-1.5">
                                        📋 Copy for Google Sheets
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'transactions' && <TransactionList trackerId={activeTracker.id} currency={activeTracker.currency} permissions={perms} authFetch={authFetch} onDataChange={() => loadTracker(activeTracker.id)} />}
                {activeTab === 'investments' && <InvestmentPanel trackerId={activeTracker.id} currency={activeTracker.currency} permissions={perms} authFetch={authFetch} onDataChange={() => loadTracker(activeTracker.id)} />}
                {activeTab === 'loans' && <LoanTracker trackerId={activeTracker.id} currency={activeTracker.currency} permissions={perms} authFetch={authFetch} onDataChange={() => loadTracker(activeTracker.id)} />}
                {activeTab === 'categories' && <CategoryManager trackerId={activeTracker.id} permissions={perms} authFetch={authFetch} />}
                {activeTab === 'members' && <MemberManager trackerId={activeTracker.id} permissions={perms} authFetch={authFetch} />}
            </div>
        </div>
    );
};

export default FinanceTracker;

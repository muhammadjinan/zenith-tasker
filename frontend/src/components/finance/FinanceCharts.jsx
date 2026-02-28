import React, { useState, useEffect, useCallback } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PERIODS = [
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'quarterly', label: 'Quarterly' },
    { id: 'yearly', label: 'Yearly' },
];

const PIE_COLORS = [
    '#22d3ee', '#a855f7', '#f59e0b', '#ec4899', '#10b981',
    '#6366f1', '#ef4444', '#14b8a6', '#f97316', '#8b5cf6',
    '#06b6d4', '#84cc16', '#e879f9', '#fb923c', '#2dd4bf',
];

const CustomTooltip = ({ active, payload, label, currency }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-xl">
            <p className="text-xs text-slate-400 mb-1">{label}</p>
            {payload.map((p, i) => (
                <p key={i} className="text-sm font-medium" style={{ color: p.color }}>
                    {p.name}: {currency} {Number(p.value).toLocaleString()}
                </p>
            ))}
        </div>
    );
};

const FinanceCharts = ({ trackerId, currency, authFetch }) => {
    const [period, setPeriod] = useState('monthly');
    const [trendData, setTrendData] = useState([]);
    const [categoryData, setCategoryData] = useState([]);
    const [incomeCategoryData, setIncomeCategoryData] = useState([]);
    const [loading, setLoading] = useState(true);

    const [chartPrefs, setChartPrefs] = useState(() => {
        const saved = localStorage.getItem(`zenith_chart_prefs_${trackerId}`);
        const parsed = saved ? JSON.parse(saved) : {};
        return {
            area: true, overview: true, expense: true, income: true,
            trendSize: 600, overviewSize: 400, expenseSize: 400, incomeSize: 400,
            showCategories: true,
            overviewValueType: 'default', expenseValueType: 'default', incomeValueType: 'default',
            ...parsed
        };
    });

    useEffect(() => {
        localStorage.setItem(`zenith_chart_prefs_${trackerId}`, JSON.stringify(chartPrefs));
    }, [chartPrefs, trackerId]);

    const loadStats = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${API_URL}/finance/${trackerId}/stats?period=${period}`);
            if (res.ok) {
                const data = await res.json();
                // Format trend data for chart
                const trend = data.trend.map(t => ({
                    period: formatPeriodLabel(t.period, period),
                    Income: t.income || 0,
                    Expense: t.expense || 0,
                }));
                setTrendData(trend);

                // Category breakdown for pie chart (expenses only by default)
                const cats = data.categoryBreakdown
                    .filter(c => c.type === 'expense' && c.total > 0)
                    .map(c => ({
                        name: c.name || 'Uncategorized',
                        value: c.total,
                        icon: c.icon,
                        color: c.color,
                    }));
                setCategoryData(cats);

                const incomeCats = data.categoryBreakdown
                    .filter(c => c.type === 'income' && c.total > 0)
                    .map(c => ({
                        name: c.name || 'Uncategorized',
                        value: c.total,
                        icon: c.icon,
                        color: c.color,
                    }));
                setIncomeCategoryData(incomeCats);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [trackerId, period, authFetch]);

    useEffect(() => { loadStats(); }, [loadStats]);

    if (loading) {
        return <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>;
    }

    const totalExpenses = categoryData.reduce((s, c) => s + c.value, 0);
    const totalIncome = incomeCategoryData.reduce((s, c) => s + c.value, 0);

    const togglePref = (key) => {
        setChartPrefs(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSizeChange = (key, value) => {
        setChartPrefs(prev => ({ ...prev, [key]: parseInt(value) }));
    };

    const overviewData = [
        { name: 'Income', value: totalIncome, color: '#10b981', icon: '💰' },
        { name: 'Expense', value: totalExpenses, color: '#ef4444', icon: '📉' }
    ].filter(d => d.value > 0);

    return (
        <div className="space-y-6">
            {/* Controls Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                        <h3 className="text-sm font-medium text-white mr-2">Charts</h3>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer hover:text-white transition-colors whitespace-nowrap">
                                <input type="checkbox" checked={chartPrefs.area} onChange={() => togglePref('area')} className="rounded border-white/10 bg-slate-800/50 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900" />
                                Trend Area
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer hover:text-white transition-colors whitespace-nowrap">
                                <input type="checkbox" checked={chartPrefs.overview} onChange={() => togglePref('overview')} className="rounded border-white/10 bg-slate-800/50 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900" />
                                Overview Pie
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer hover:text-white transition-colors whitespace-nowrap">
                                <input type="checkbox" checked={chartPrefs.expense} onChange={() => togglePref('expense')} className="rounded border-white/10 bg-slate-800/50 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900" />
                                Expense Pie
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer hover:text-white transition-colors whitespace-nowrap">
                                <input type="checkbox" checked={chartPrefs.income} onChange={() => togglePref('income')} className="rounded border-white/10 bg-slate-800/50 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900" />
                                Income Pie
                            </label>
                        </div>
                    </div>

                    {/* Size & Display Controls */}
                    <div className="flex flex-wrap items-center gap-3 mt-3 sm:mt-0">
                        {/* Categories Toggle */}
                        <button
                            onClick={() => togglePref('showCategories')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${chartPrefs.showCategories ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' : 'bg-slate-800/50 text-slate-400 border-white/5 hover:text-white'}`}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                            {chartPrefs.showCategories ? 'Hide List' : 'Show List'}
                        </button>
                    </div>
                </div>

                <div className="flex gap-1 ml-auto">
                    {PERIODS.map(p => (
                        <button key={p.id} onClick={() => setPeriod(p.id)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${period === p.id ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' : 'text-slate-500 hover:text-white border border-transparent'}`}>
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Area Chart Card */}
            {chartPrefs.area && (
                <div
                    className="bg-slate-800/30 rounded-xl border border-white/5 p-4 flex flex-col gap-4 flex-grow shrink-0 mt-6"
                    style={{ width: chartPrefs.trendSize, maxWidth: '100%' }}
                >
                    <div className="flex items-center gap-4 justify-between">
                        <h3 className="text-sm font-medium text-white truncate mr-2">Trend Area</h3>
                        <div className="flex items-center gap-3 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-white/5 w-fit shrink-0">
                            <input
                                type="range" min="300" max="1200" step="10"
                                value={chartPrefs.trendSize} onChange={(e) => handleSizeChange('trendSize', e.target.value)}
                                className="w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                            />
                        </div>
                    </div>
                    {trendData.length > 0 ? (
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="period" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                                    <Tooltip content={<CustomTooltip currency={currency} />} />
                                    <Area type="monotone" dataKey="Income" stroke="#10b981" fill="url(#incomeGrad)" strokeWidth={2} />
                                    <Area type="monotone" dataKey="Expense" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-48 flex items-center justify-center rounded-xl bg-slate-800/20 border border-white/5">
                            <p className="text-sm text-slate-500">No transaction data for this period</p>
                        </div>
                    )}
                </div>
            )}

            {/* Pie Charts Grid Section */}
            <div className="flex flex-wrap items-stretch justify-start gap-4">

                {/* Overview Pie Chart Card */}
                {chartPrefs.overview && overviewData.length > 0 && (
                    <div
                        className="bg-slate-800/30 rounded-xl border border-white/5 p-4 flex flex-col gap-4 flex-grow shrink-0"
                        style={{ width: chartPrefs.showCategories ? chartPrefs.overviewSize : 'max-content', maxWidth: '100%' }}
                    >
                        <div className="flex items-center gap-4 justify-between">
                            <h3 className="text-sm font-medium text-white truncate mr-2">Income vs Expense</h3>
                            <div className="flex gap-2">
                                <div className="hidden sm:flex items-center gap-3 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-white/5 w-fit shrink-0">
                                    <input
                                        type="range" min="200" max="800" step="10"
                                        value={chartPrefs.overviewSize} onChange={(e) => handleSizeChange('overviewSize', e.target.value)}
                                        className="w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                    />
                                </div>
                                {chartPrefs.showCategories && (
                                    <div className="flex bg-slate-800/50 rounded-lg p-0.5 border border-white/5 shrink-0">
                                        <button onClick={() => setChartPrefs(p => ({ ...p, overviewValueType: 'default' }))} className={`px-2 py-1 text-[10px] rounded leading-none transition-colors ${chartPrefs.overviewValueType === 'default' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}>All</button>
                                        <button onClick={() => setChartPrefs(p => ({ ...p, overviewValueType: 'amount' }))} className={`px-2 py-1 text-[10px] rounded leading-none transition-colors ${chartPrefs.overviewValueType === 'amount' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}>Amount</button>
                                        <button onClick={() => setChartPrefs(p => ({ ...p, overviewValueType: 'percent' }))} className={`px-2 py-1 text-[10px] rounded leading-none transition-colors ${chartPrefs.overviewValueType === 'percent' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}>Percent</button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-1">
                            {/* Pie */}
                            <div className="w-[45%] shrink-0 aspect-square relative -ml-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={overviewData}
                                            cx="50%" cy="50%"
                                            innerRadius="50%" outerRadius="80%"
                                            paddingAngle={0}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {overviewData.map((entry, i) => (
                                                <Cell key={i} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={({ active, payload }) => {
                                            if (!active || !payload?.length) return null;
                                            const d = payload[0].payload;
                                            const total = totalIncome + totalExpenses;
                                            return (
                                                <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-xl">
                                                    <p className="text-sm font-medium text-white">{d.icon} {d.name}</p>
                                                    <p className="text-xs text-slate-400">{currency} {Number(d.value).toLocaleString()} ({((d.value / total) * 100).toFixed(1)}%)</p>
                                                </div>
                                            );
                                        }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Categories */}
                            {chartPrefs.showCategories && (
                                <div className="w-[55%] flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                                    {overviewData.map((d, i) => {
                                        const total = totalIncome + totalExpenses;
                                        const pct = ((d.value / total) * 100).toFixed(0);
                                        return (
                                            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/40 border border-white/5 overflow-hidden">
                                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                                                <span className="text-sm text-slate-300 flex-1 min-w-[30px] truncate">{d.icon} {d.name}</span>
                                                <div className="flex-shrink-0 text-right">
                                                    {chartPrefs.overviewValueType === 'default' ? (
                                                        <span className="text-xs font-medium text-slate-300">{currency} {Number(d.value).toLocaleString()}<span className="text-[10px] text-slate-500 ml-1 font-normal">({pct}%)</span></span>
                                                    ) : chartPrefs.overviewValueType === 'amount' ? (
                                                        <span className="text-xs font-medium text-slate-300">{currency} {Number(d.value).toLocaleString()}</span>
                                                    ) : (
                                                        <span className="text-xs font-medium text-slate-300">{pct}%</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Expense Pie Chart Card */}
                {chartPrefs.expense && categoryData.length > 0 && (
                    <div
                        className="bg-slate-800/30 rounded-xl border border-white/5 p-4 flex flex-col gap-4 flex-grow shrink-0"
                        style={{ width: chartPrefs.showCategories ? chartPrefs.expenseSize : 'max-content', maxWidth: '100%' }}
                    >
                        <div className="flex items-center gap-4 justify-between">
                            <h3 className="text-sm font-medium text-white truncate mr-2">Expense Breakdown</h3>
                            <div className="flex gap-2">
                                <div className="hidden sm:flex items-center gap-3 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-white/5 w-fit shrink-0">
                                    <input
                                        type="range" min="200" max="800" step="10"
                                        value={chartPrefs.expenseSize} onChange={(e) => handleSizeChange('expenseSize', e.target.value)}
                                        className="w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                    />
                                </div>
                                {chartPrefs.showCategories && (
                                    <div className="flex bg-slate-800/50 rounded-lg p-0.5 border border-white/5 shrink-0">
                                        <button onClick={() => setChartPrefs(p => ({ ...p, expenseValueType: 'default' }))} className={`px-2 py-1 text-[10px] rounded leading-none transition-colors ${chartPrefs.expenseValueType === 'default' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}>All</button>
                                        <button onClick={() => setChartPrefs(p => ({ ...p, expenseValueType: 'amount' }))} className={`px-2 py-1 text-[10px] rounded leading-none transition-colors ${chartPrefs.expenseValueType === 'amount' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}>Amount</button>
                                        <button onClick={() => setChartPrefs(p => ({ ...p, expenseValueType: 'percent' }))} className={`px-2 py-1 text-[10px] rounded leading-none transition-colors ${chartPrefs.expenseValueType === 'percent' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}>Percent</button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-1">
                            <div className="w-[45%] shrink-0 aspect-square relative -ml-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            cx="50%" cy="50%"
                                            innerRadius="50%" outerRadius="80%"
                                            paddingAngle={0}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {categoryData.map((entry, i) => (
                                                <Cell key={i} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={({ active, payload }) => {
                                            if (!active || !payload?.length) return null;
                                            const d = payload[0].payload;
                                            const name = d.name || 'Uncategorized';
                                            return (
                                                <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-xl">
                                                    <p className="text-sm font-medium text-white">{d.icon} {name}</p>
                                                    <p className="text-xs text-slate-400">{currency} {Number(d.value).toLocaleString()} ({((d.value / totalExpenses) * 100).toFixed(1)}%)</p>
                                                </div>
                                            );
                                        }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {chartPrefs.showCategories && (
                                <div className="w-[55%] flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                                    {categoryData.map((cat, i) => {
                                        const pct = ((cat.value / totalExpenses) * 100).toFixed(0);
                                        const catName = cat.name || 'Uncategorized';
                                        return (
                                            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/40 border border-white/5 overflow-hidden">
                                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color || PIE_COLORS[i % PIE_COLORS.length] }} />
                                                <span className="text-sm text-slate-300 flex-1 min-w-[30px] truncate">{cat.icon} {catName}</span>
                                                <div className="flex-shrink-0 text-right">
                                                    {chartPrefs.expenseValueType === 'default' ? (
                                                        <span className="text-xs font-medium text-slate-300">{currency} {Number(cat.value).toLocaleString()}<span className="text-[10px] text-slate-500 ml-1 font-normal">({pct}%)</span></span>
                                                    ) : chartPrefs.expenseValueType === 'amount' ? (
                                                        <span className="text-xs font-medium text-slate-300">{currency} {Number(cat.value).toLocaleString()}</span>
                                                    ) : (
                                                        <span className="text-xs font-medium text-slate-300">{pct}%</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Income Pie Chart Card */}
                {chartPrefs.income && incomeCategoryData.length > 0 && (
                    <div
                        className="bg-slate-800/30 rounded-xl border border-white/5 p-4 flex flex-col gap-4 flex-grow shrink-0"
                        style={{ width: chartPrefs.showCategories ? chartPrefs.incomeSize : 'max-content', maxWidth: '100%' }}
                    >
                        <div className="flex items-center gap-4 justify-between">
                            <h3 className="text-sm font-medium text-white truncate mr-2">Income Breakdown</h3>
                            <div className="flex gap-2">
                                <div className="hidden sm:flex items-center gap-3 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-white/5 w-fit shrink-0">
                                    <input
                                        type="range" min="200" max="800" step="10"
                                        value={chartPrefs.incomeSize} onChange={(e) => handleSizeChange('incomeSize', e.target.value)}
                                        className="w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                    />
                                </div>
                                {chartPrefs.showCategories && (
                                    <div className="flex bg-slate-800/50 rounded-lg p-0.5 border border-white/5 shrink-0">
                                        <button onClick={() => setChartPrefs(p => ({ ...p, incomeValueType: 'default' }))} className={`px-2 py-1 text-[10px] rounded leading-none transition-colors ${chartPrefs.incomeValueType === 'default' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}>All</button>
                                        <button onClick={() => setChartPrefs(p => ({ ...p, incomeValueType: 'amount' }))} className={`px-2 py-1 text-[10px] rounded leading-none transition-colors ${chartPrefs.incomeValueType === 'amount' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}>Amount</button>
                                        <button onClick={() => setChartPrefs(p => ({ ...p, incomeValueType: 'percent' }))} className={`px-2 py-1 text-[10px] rounded leading-none transition-colors ${chartPrefs.incomeValueType === 'percent' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}>Percent</button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-1">
                            <div className="w-[45%] shrink-0 aspect-square relative -ml-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={incomeCategoryData}
                                            cx="50%" cy="50%"
                                            innerRadius="50%" outerRadius="80%"
                                            paddingAngle={0}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {incomeCategoryData.map((entry, i) => (
                                                <Cell key={i} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={({ active, payload }) => {
                                            if (!active || !payload?.length) return null;
                                            const d = payload[0].payload;
                                            const name = d.name || 'Uncategorized';
                                            return (
                                                <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-xl">
                                                    <p className="text-sm font-medium text-white">{d.icon} {name}</p>
                                                    <p className="text-xs text-slate-400">{currency} {Number(d.value).toLocaleString()} ({((d.value / totalIncome) * 100).toFixed(1)}%)</p>
                                                </div>
                                            );
                                        }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {chartPrefs.showCategories && (
                                <div className="w-[55%] flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                                    {incomeCategoryData.map((cat, i) => {
                                        const pct = ((cat.value / totalIncome) * 100).toFixed(0);
                                        const catName = cat.name || 'Uncategorized';
                                        return (
                                            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/40 border border-white/5 overflow-hidden">
                                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color || PIE_COLORS[i % PIE_COLORS.length] }} />
                                                <span className="text-sm text-slate-300 flex-1 min-w-[30px] truncate">{cat.icon} {catName}</span>
                                                <div className="flex-shrink-0 text-right">
                                                    {chartPrefs.incomeValueType === 'default' ? (
                                                        <span className="text-xs font-medium text-slate-300">{currency} {Number(cat.value).toLocaleString()}<span className="text-[10px] text-slate-500 ml-1 font-normal">({pct}%)</span></span>
                                                    ) : chartPrefs.incomeValueType === 'amount' ? (
                                                        <span className="text-xs font-medium text-slate-300">{currency} {Number(cat.value).toLocaleString()}</span>
                                                    ) : (
                                                        <span className="text-xs font-medium text-slate-300">{pct}%</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper to format period labels
function formatPeriodLabel(dateStr, period) {
    const d = new Date(dateStr);
    switch (period) {
        case 'daily': return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        case 'weekly': return `W${getWeekNumber(d)} ${d.toLocaleDateString(undefined, { month: 'short' })}`;
        case 'monthly': return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
        case 'quarterly': return `Q${Math.ceil((d.getMonth() + 1) / 3)} ${d.getFullYear()}`;
        case 'yearly': return d.getFullYear().toString();
        default: return dateStr;
    }
}

function getWeekNumber(d) {
    const oneJan = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
}

export default FinanceCharts;

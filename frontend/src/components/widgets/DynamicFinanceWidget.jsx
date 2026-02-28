import React, { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Area } from 'recharts';
import { useNavigate } from 'react-router-dom';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const CustomAreaTooltip = ({ active, payload, label, currency = '₹' }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-xl z-50">
                <p className="text-white font-medium mb-1">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-xs" style={{ color: entry.color }}>
                        {entry.name}: <span className="font-semibold">{currency} {Number(entry.value).toLocaleString()}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

// Formats YYYY-MM to Month Year (e.g. Jan 2025)
const formatPeriodLabel = (periodStr) => {
    if (!periodStr) return '';
    try {
        if (periodStr.includes('-')) {
            const [y, m] = periodStr.split('-');
            const d = new Date(parseInt(y), parseInt(m) - 1, 1);
            return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }
        return periodStr;
    } catch { return periodStr; }
};

const DynamicFinanceWidget = ({ config, authFetch, apiUrl }) => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const { targetTracker, chartType, title = 'Finance Widget' } = config;

    // Fetch data whenever targetTracker changes
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            if (targetTracker === 'all') {
                if (chartType === 'trend') {
                    // "All trackes" trend isn't explicitly supported by a dedicated endpoint, so we default to overview stats if needed
                    const res = await authFetch(`${apiUrl}/finance/overview`);
                    if (res.ok) {
                        const data = await res.json();
                        setStats({ type: 'overview', income: data.total_income, expense: data.total_expense });
                    }
                } else {
                    const res = await authFetch(`${apiUrl}/finance/overview`);
                    if (res.ok) {
                        const data = await res.json();
                        setStats({ type: 'overview', income: data.total_income, expense: data.total_expense });
                    }
                }
            } else {
                // Fetch stats for specific tracker
                const res = await authFetch(`${apiUrl}/finance/${targetTracker}/stats?period=monthly`);
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            }
        } catch (e) {
            console.error('Failed to load DynamicFinanceWidget data', e);
        } finally {
            setLoading(false);
        }
    }, [targetTracker, chartType, authFetch, apiUrl]);

    useEffect(() => { loadData(); }, [loadData]);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!stats) {
        return <div className="h-full flex items-center justify-center text-slate-500 text-sm">Failed to load data.</div>;
    }

    // Helper functions for parsing
    const renderOverview = () => {
        const inc = targetTracker === 'all' ? stats.income : (stats.trend?.reduce((a, b) => a + (b.income || 0), 0) || 0);
        const exp = targetTracker === 'all' ? stats.expense : (stats.trend?.reduce((a, b) => a + (b.expense || 0), 0) || 0);

        if (inc === 0 && exp === 0) return <p className="text-slate-500 text-sm">No data available.</p>;

        const data = [
            { name: 'Income', value: inc, color: '#10b981' },
            { name: 'Expense', value: exp, color: '#ef4444' }
        ];

        return (
            <>
                <div className="w-full flex-1 min-h-0 relative -mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={data} cx="50%" cy="50%" innerRadius="50%" outerRadius="80%" paddingAngle={0} dataKey="value" stroke="none">
                                {data.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                            </Pie>
                            <RechartsTooltip content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const d = payload[0].payload;
                                return (
                                    <div className="bg-slate-900/95 border border-white/10 rounded-lg p-2 shadow-xl">
                                        <p className="text-xs font-medium" style={{ color: d.color }}>{d.name}</p>
                                        <p className="text-xs text-slate-300">₹{Number(d.value).toLocaleString()}</p>
                                    </div>
                                );
                            }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-2 shrink-0">
                    <div className="text-center">
                        <p className="text-[10px] text-slate-400">Income</p>
                        <p className="text-xs font-semibold text-emerald-400">₹{inc.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] text-slate-400">Expense</p>
                        <p className="text-xs font-semibold text-red-400">₹{exp.toLocaleString()}</p>
                    </div>
                </div>
            </>
        );
    };

    const renderBreakdownPie = (type) => { // 'income' or 'expense'
        if (targetTracker === 'all' || !stats.categoryBreakdown) {
            return <p className="text-slate-500 text-sm text-center">Breakdown unavailable for all trackers.</p>;
        }
        const cats = stats.categoryBreakdown
            .filter(c => c.type === type && c.total > 0)
            .map(c => ({
                name: c.name || 'Uncategorized',
                value: c.total,
                icon: c.icon,
                color: c.color,
            }));

        if (cats.length === 0) return <p className="text-slate-500 text-sm text-center">No {type}s recorded.</p>;

        return (
            <div className="w-full flex-1 min-h-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={cats} cx="50%" cy="50%" innerRadius="40%" outerRadius="80%" paddingAngle={0} dataKey="value" stroke="none">
                            {cats.map((entry, i) => <Cell key={i} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <RechartsTooltip content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                                <div className="bg-slate-900/95 border border-white/10 rounded-lg p-2 shadow-xl">
                                    <p className="text-xs font-medium text-white">{d.icon} {d.name}</p>
                                    <p className="text-xs text-slate-300">₹{Number(d.value).toLocaleString()}</p>
                                </div>
                            );
                        }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        );
    };

    const renderTrend = () => {
        if (targetTracker === 'all' || !stats.trend) {
            return <p className="text-slate-500 text-sm text-center mt-6">Trend unavailable for all trackers.</p>;
        }

        const trend = stats.trend.map(t => ({
            period: formatPeriodLabel(t.period),
            Income: t.income || 0,
            Expense: t.expense || 0,
        }));

        if (trend.length === 0) return <p className="text-slate-500 text-sm text-center mt-6">No trend data.</p>;

        return (
            <div className="w-full flex-1 min-h-0 pt-4 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="widgetIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="widgetExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="period" hide />
                        <YAxis hide />
                        <RechartsTooltip content={<CustomAreaTooltip />} />
                        <Area type="monotone" dataKey="Income" stroke="#10b981" fill="url(#widgetIncomeGrad)" strokeWidth={2} />
                        <Area type="monotone" dataKey="Expense" stroke="#ef4444" fill="url(#widgetExpenseGrad)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        );
    };

    let content = null;
    if (chartType === 'overview') content = renderOverview();
    else if (chartType === 'expense') content = renderBreakdownPie('expense');
    else if (chartType === 'income') content = renderBreakdownPie('income');
    else if (chartType === 'trend') content = renderTrend();

    return (
        <div className="h-full flex flex-col p-2 relative">
            <div className="flex-1 flex flex-col justify-center overflow-hidden">
                {content}
            </div>
            <button
                onClick={() => navigate(targetTracker === 'all' ? '/dashboard?view=finance' : `/dashboard?view=finance&tracker=${targetTracker}`)}
                className="absolute top-1 right-1 p-1 bg-slate-800/80 hover:bg-slate-700/80 rounded border border-transparent hover:border-white/10 text-slate-400 hover:text-white transition-all"
                title="Go to tracker"
            >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </button>
        </div>
    );
};

export default DynamicFinanceWidget;

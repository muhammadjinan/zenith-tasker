import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import Sidebar from '../components/Sidebar';
import ParticleBackground from '../components/ParticleBackground';
import TaskCalendar from '../components/TaskCalendar';
import WidgetWrapper from '../components/widgets/WidgetWrapper';
import WidgetToolbar from '../components/widgets/WidgetToolbar';
import SearchModal from '../components/SearchModal';
import { useAuth } from '../context/AuthContext';
import DynamicFinanceWidget from '../components/widgets/DynamicFinanceWidget';

const ResponsiveGridLayout = WidthProvider(Responsive);
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Strip HTML tags for preview
const stripHtml = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').slice(0, 80);
};

// ============ Widget Registry ============
const WIDGET_DEFS = [
    { id: 'stats', name: 'Stats Cards', minW: 4, minH: 3, defaultW: 12, defaultH: 3, adminOnly: false },
    { id: 'quickActions', name: 'Quick Actions', minW: 4, minH: 1, defaultW: 12, defaultH: 1, adminOnly: false },
    { id: 'recentPages', name: 'Recent Pages', minW: 3, minH: 3, defaultW: 6, defaultH: 5, adminOnly: false },
    { id: 'pendingTasks', name: 'Pending Tasks', minW: 3, minH: 3, defaultW: 6, defaultH: 5, adminOnly: false },
    { id: 'calendar', name: 'Task Calendar', minW: 4, minH: 4, defaultW: 12, defaultH: 7, adminOnly: false },
    { id: 'financeChart', name: 'Finance Chart', minW: 3, minH: 3, defaultW: 6, defaultH: 5, adminOnly: false, allowMultiple: true },
    { id: 'userActivity', name: 'User Activity', minW: 4, minH: 3, defaultW: 12, defaultH: 6, adminOnly: true },
];

const WIDGET_ICONS = {
    stats: <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
    quickActions: <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>,
    recentPages: <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    pendingTasks: <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
    calendar: <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    financeChart: <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>,
    userActivity: <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>,
};

const WIDGET_NAMES = {
    stats: 'Stats',
    quickActions: 'Quick Actions',
    recentPages: 'Recent Pages',
    pendingTasks: 'Pending Tasks',
    calendar: 'Calendar',
    financeChart: 'Finance Chart',
    userActivity: 'User Activity',
};

const getDefaultLayout = (user) => {
    const layout = [
        { i: 'quickActions', x: 0, y: 0, w: 4, h: 2 },
        { i: 'stats', x: 4, y: 0, w: 8, h: 3 },
    ];
    let nextY = 2; // Keep track of rows to smartly place items

    // Add task-related widgets if they have permission
    if (user?.is_admin || user?.can_view_tasks) {
        layout.push({ i: 'calendar', x: 0, y: nextY, w: 4, h: 6 });
        layout.push({ i: 'pendingTasks', x: 4, y: 3, w: 4, h: 5 });
        nextY += 6; // Move down below calendar
    }

    // Add page-related widgets if they have permission
    // If tasks are present, it places next to pendingTasks. Otherwise, positions it smartly
    if (user?.is_admin || user?.can_view_pages) {
        layout.push({ i: 'recentPages', x: 8, y: 3, w: 4, h: 5 });
    }

    if (user?.is_admin) {
        layout.push({ i: 'userActivity', x: 0, y: Math.max(8, nextY), w: 12, h: 6 });
    }
    return layout;
};

// ============ Time helper ============
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
    return `${Math.floor(days / 7)}w ago`;
};

// ============ Activity level ============
const getActivityLevel = (u) => {
    if (u.status === 'inactive') return { label: 'Deactivated', color: 'slate', dotClass: 'bg-slate-500' };
    if (u.login_days_14d >= 10) return { label: 'Active', color: 'green', dotClass: 'bg-green-400' };
    if (u.login_days_14d >= 4) return { label: 'Average', color: 'amber', dotClass: 'bg-amber-400' };
    if (u.login_days_14d >= 1) return { label: 'Less Active', color: 'orange', dotClass: 'bg-orange-400' };
    return { label: 'New', color: 'gray', dotClass: 'bg-slate-400' };
};

const BADGE_COLORS = {
    green: 'bg-green-500/15 text-green-400 border-green-500/30',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    orange: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    gray: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    slate: 'bg-slate-500/15 text-slate-500 border-slate-500/30',
};

const FinanceModalForm = ({ trackers, onClose, onSubmit }) => {
    const [selectedTracker, setSelectedTracker] = useState('all');
    const [title, setTitle] = useState('');
    const [chartType, setChartType] = useState('overview');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ targetTracker: selectedTracker, chartType, title });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-white">Configure Finance Widget</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Widget Title <span className="text-slate-500 font-normal">(Optional)</span></label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Leave blank for default" className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Target Tracker</label>
                        <select value={selectedTracker} onChange={(e) => setSelectedTracker(e.target.value)} className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50">
                            <option value="all">All Trackers Combined</option>
                            {trackers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Chart Type</label>
                        <select value={chartType} onChange={(e) => setChartType(e.target.value)} className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50">
                            <option value="overview">Income vs Expense (Pie)</option>
                            <option value="expense">Expense Breakdown (Pie)</option>
                            <option value="income">Income Breakdown (Pie)</option>
                            <option value="trend">Income vs Expense (Trend Graph)</option>
                        </select>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-slate-800 transition-colors font-medium">Cancel</button>
                        <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white transition-colors font-medium">Add Widget</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

function Home() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [pages, setPages] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [trackers, setTrackers] = useState([]);
    const [financeModalOpen, setFinanceModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [adminUsers, setAdminUsers] = useState([]);
    const [editMode, setEditMode] = useState(false);
    const [layouts, setLayouts] = useState({});
    const [hiddenWidgets, setHiddenWidgets] = useState([]);
    const [layoutLoaded, setLayoutLoaded] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const saveTimeoutRef = useRef(null);
    const isResettingRef = useRef(false);

    const authenticatedFetch = useCallback(async (url, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`,
            ...options.headers
        };
        return fetch(url, { ...options, headers });
    }, [user?.token]);

    // Ctrl+K to open search
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setShowSearch(prev => !prev);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Fetch data on load
    useEffect(() => {
        if (!user?.token) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const [pagesRes, tasksRes, financeRes] = await Promise.all([
                    authenticatedFetch(`${API_URL}/pages`),
                    authenticatedFetch(`${API_URL}/tasks`),
                    authenticatedFetch(`${API_URL}/finance`)
                ]);
                if (pagesRes.ok) { const d = await pagesRes.json(); if (Array.isArray(d)) setPages(d); }
                if (tasksRes.ok) { const d = await tasksRes.json(); if (Array.isArray(d)) setTasks(d); }
                if (financeRes.ok) {
                    const d = await financeRes.json();
                    if (d.trackers && Array.isArray(d.trackers)) setTrackers(d.trackers);
                    else if (Array.isArray(d)) setTrackers(d);
                }
            } catch (err) {
                console.error('Failed to fetch data:', err);
            } finally { setLoading(false); }
        };
        fetchData();
    }, [user?.token, authenticatedFetch]);

    // Fetch admin users (admin only)
    useEffect(() => {
        if (!user?.token || !user?.is_admin) return;
        const fetchAdminUsers = async () => {
            try {
                const res = await authenticatedFetch(`${API_URL}/admin/users`);
                if (res.ok) { const d = await res.json(); if (Array.isArray(d)) setAdminUsers(d); }
            } catch (err) { console.error('Failed to fetch admin users:', err); }
        };
        fetchAdminUsers();
    }, [user?.token, user?.is_admin, authenticatedFetch]);

    // Load layout from backend
    useEffect(() => {
        if (!user?.token) return;
        const loadLayout = async () => {
            try {
                const res = await authenticatedFetch(`${API_URL}/dashboard/layout`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.layout && data.layout.length > 0) {
                        setLayouts({ lg: data.layout });
                        setHiddenWidgets(data.hidden_widgets || []);
                    } else {
                        setLayouts({ lg: getDefaultLayout(user) });
                    }
                } else {
                    setLayouts({ lg: getDefaultLayout(user) });
                }
            } catch (err) {
                console.error('Failed to load layout:', err);
                setLayouts({ lg: getDefaultLayout(user) });
            }
            setLayoutLoaded(true);
        };
        loadLayout();
    }, [user?.token]);

    // Save layout to backend (debounced)
    const saveLayout = useCallback((newLayout, newHidden) => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await authenticatedFetch(`${API_URL}/dashboard/layout`, {
                    method: 'PUT',
                    body: JSON.stringify({ layout: newLayout, hidden_widgets: newHidden }),
                });
            } catch (err) { console.error('Failed to save layout:', err); }
        }, 800);
    }, [authenticatedFetch]);

    const handleLayoutChange = (currentLayout, allLayouts) => {
        if (isResettingRef.current) return;

        // Preserve missing config from react-grid-layout strip
        const preservedLayout = currentLayout.map(item => {
            const oldItem = (layouts.lg || []).find(l => l.i === item.i);
            return oldItem ? { ...item, config: oldItem.config } : item;
        });

        // Use preservedLayout instead of currentLayout
        setLayouts({ ...allLayouts, lg: preservedLayout });
        if (layoutLoaded) {
            saveLayout(preservedLayout, hiddenWidgets);
        }
    };

    const removeWidget = (widgetId) => {
        const newHidden = [...hiddenWidgets, widgetId];
        setHiddenWidgets(newHidden);
        const currentLg = layouts.lg || [];
        const newLayout = currentLg.filter(l => l.i !== widgetId);
        setLayouts({ ...layouts, lg: newLayout });
        saveLayout(newLayout, newHidden);
    };

    const addWidget = (widgetId) => {
        if (widgetId === 'financeChart') {
            setFinanceModalOpen(true);
            return;
        }

        const def = WIDGET_DEFS.find(w => w.id === widgetId);
        if (!def) return;
        const newHidden = hiddenWidgets.filter(h => h !== widgetId);
        setHiddenWidgets(newHidden);
        const currentLg = layouts.lg || [];
        // Place at bottom
        const maxY = currentLg.reduce((max, l) => Math.max(max, l.y + l.h), 0);
        const newItem = { i: widgetId, x: 0, y: maxY, w: def.defaultW, h: def.defaultH };
        const newLayout = [...currentLg, newItem];
        setLayouts({ ...layouts, lg: newLayout });
        saveLayout(newLayout, newHidden);
    };

    const resetLayout = async () => {
        isResettingRef.current = true;
        // Cancel any pending debounced saves
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        const defaultLg = getDefaultLayout(user?.is_admin);
        setLayouts({ lg: defaultLg });
        setHiddenWidgets([]);
        // Save immediately (bypass debounce)
        try {
            await authenticatedFetch(`${API_URL}/dashboard/layout`, {
                method: 'PUT',
                body: JSON.stringify({ layout: defaultLg, hidden_widgets: [] }),
            });
        } catch (err) { console.error('Failed to save reset layout:', err); }
        // Block handleLayoutChange long enough for RGL to settle
        setTimeout(() => { isResettingRef.current = false; }, 1500);
    };

    // Compute stats
    const totalPages = pages.length;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const pendingTasks = totalTasks - completedTasks;

    const recentPages = [...pages].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 5);
    const upcomingTasks = tasks.filter(t => t.status !== 'completed' && !t.is_completed).slice(0, 5);

    const activityStats = useMemo(() => {
        const stats = { active: 0, average: 0, lessActive: 0, newUser: 0, deactivated: 0 };
        adminUsers.forEach(u => {
            const level = getActivityLevel(u);
            if (level.label === 'Active') stats.active++;
            else if (level.label === 'Average') stats.average++;
            else if (level.label === 'Less Active') stats.lessActive++;
            else if (level.label === 'New') stats.newUser++;
            else if (level.label === 'Deactivated') stats.deactivated++;
        });
        return stats;
    }, [adminUsers]);

    // Navigation handlers
    const handleNavigateToPages = () => {
        if (!user?.is_admin && !user?.can_view_pages) return;
        navigate('/dashboard?view=pages');
    };
    const handleNavigateToTasks = () => {
        if (!user?.is_admin && !user?.can_view_tasks) return;
        navigate('/dashboard?view=tasks');
    };
    const handleCreatePage = async () => {
        if (!user?.is_admin && !user?.can_view_pages) return;
        try {
            const res = await authenticatedFetch(`${API_URL}/pages`, { method: 'POST' });
            if (res.ok) {
                const newPage = await res.json();
                navigate(`/dashboard?view=pages&page=${newPage.id}&edit=true`);
            }
        } catch (err) { console.error('Failed to create page:', err); }
    };

    // Time-based greeting
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const userName = user?.username || user?.email?.split('@')[0] || 'there';

    // Which widgets are currently visible
    const visibleWidgets = WIDGET_DEFS.filter(w => {
        if (w.adminOnly && !user?.is_admin) return false;
        if (hiddenWidgets.includes(w.id)) return false;
        return true;
    });

    // Available to add (currently hidden)
    const addableWidgets = WIDGET_DEFS
        .filter(w => {
            if (w.adminOnly && !user?.is_admin) return false;
            // Feature Flags for specific widgets (do not show if they DON'T have permission AND aren't admin)
            if (w.id === 'financeChart' && !user?.is_admin && !user?.can_view_finance) return false;
            if (w.id === 'pendingTasks' && !user?.is_admin && !user?.can_view_tasks) return false;
            if (w.id === 'recentPages' && !user?.is_admin && !user?.can_view_pages) return false;
            if (w.id === 'calendar' && !user?.is_admin && !user?.can_view_tasks) return false;

            if (w.allowMultiple) return true;

            // For standard singular widgets, they are addable if they are NOT currently in the active layout
            const isInLayout = (layouts.lg || []).some(item => item.i === w.id);
            return !isInLayout;
        })
        .map(w => ({ id: w.id, name: w.name, icon: WIDGET_ICONS[w.id] }));

    // Build layout items with min constraints
    const layoutWithConstraints = useMemo(() => {
        const lg = layouts.lg || [];
        return lg
            .filter(l => !hiddenWidgets.includes(l.i))
            .map(l => {
                const def = WIDGET_DEFS.find(w => w.id === l.i);
                return { ...l, minW: def?.minW || 3, minH: def?.minH || 2 };
            });
    }, [layouts, hiddenWidgets]);

    // ============ Stats Card System ============
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const ALL_STAT_CARDS = useMemo(() => [
        { id: 'pages', label: 'Pages', value: totalPages, gradient: 'from-cyan-500/10 to-blue-500/10', border: 'border-cyan-500/20', iconBg: 'bg-cyan-500/20', iconBorder: 'border-cyan-500/30', iconColor: 'text-cyan-400', barColor: '#22d3ee', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
        { id: 'tasks', label: 'Tasks', value: totalTasks, gradient: 'from-purple-500/10 to-pink-500/10', border: 'border-purple-500/20', iconBg: 'bg-purple-500/20', iconBorder: 'border-purple-500/30', iconColor: 'text-purple-400', barColor: '#c084fc', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /> },
        { id: 'done', label: 'Done', value: completedTasks, gradient: 'from-green-500/10 to-emerald-500/10', border: 'border-green-500/20', iconBg: 'bg-green-500/20', iconBorder: 'border-green-500/30', iconColor: 'text-green-400', barColor: '#4ade80', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> },
        { id: 'pending', label: 'Pending', value: pendingTasks, gradient: 'from-amber-500/10 to-orange-500/10', border: 'border-amber-500/20', iconBg: 'bg-amber-500/20', iconBorder: 'border-amber-500/30', iconColor: 'text-amber-400', barColor: '#fbbf24', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /> },
        { id: 'overdue', label: 'Overdue', value: tasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'done').length, gradient: 'from-red-500/10 to-rose-500/10', border: 'border-red-500/20', iconBg: 'bg-red-500/20', iconBorder: 'border-red-500/30', iconColor: 'text-red-400', barColor: '#f87171', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /> },
        { id: 'highPriority', label: 'High Priority', value: tasks.filter(t => t.priority === 'high' && t.status !== 'done').length, gradient: 'from-rose-500/10 to-pink-500/10', border: 'border-rose-500/20', iconBg: 'bg-rose-500/20', iconBorder: 'border-rose-500/30', iconColor: 'text-rose-400', barColor: '#fb7185', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /> },
        { id: 'inProgress', label: 'In Progress', value: tasks.filter(t => t.status === 'in_progress').length, gradient: 'from-blue-500/10 to-indigo-500/10', border: 'border-blue-500/20', iconBg: 'bg-blue-500/20', iconBorder: 'border-blue-500/30', iconColor: 'text-blue-400', barColor: '#60a5fa', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /> },
        { id: 'dueThisWeek', label: 'Due This Week', value: tasks.filter(t => t.due_date && new Date(t.due_date) >= now && new Date(t.due_date) <= weekFromNow && t.status !== 'done').length, gradient: 'from-teal-500/10 to-cyan-500/10', border: 'border-teal-500/20', iconBg: 'bg-teal-500/20', iconBorder: 'border-teal-500/30', iconColor: 'text-teal-400', barColor: '#2dd4bf', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
    ], [totalPages, totalTasks, completedTasks, pendingTasks, tasks]);

    const DEFAULT_VISIBLE_CARDS = ['pages', 'tasks', 'done', 'pending'];
    const [visibleCards, setVisibleCards] = useState(() => {
        try { const s = localStorage.getItem('zenith_stats_cards'); return s ? JSON.parse(s) : DEFAULT_VISIBLE_CARDS; }
        catch { return DEFAULT_VISIBLE_CARDS; }
    });
    const [statsView, setStatsView] = useState('graph');
    const [statsGearOpen, setStatsGearOpen] = useState(false);
    const statsGearRef = useRef(null);

    useEffect(() => {
        const h = (e) => { if (statsGearRef.current && !statsGearRef.current.contains(e.target)) setStatsGearOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const toggleCard = (cardId) => {
        const updated = visibleCards.includes(cardId) ? visibleCards.filter(c => c !== cardId) : [...visibleCards, cardId];
        setVisibleCards(updated);
        localStorage.setItem('zenith_stats_cards', JSON.stringify(updated));
    };

    const activeCards = ALL_STAT_CARDS.filter(c => visibleCards.includes(c.id));

    // Header actions for stats widget (view toggle + gear)
    const statsHeaderActions = (
        <>
            <div className="flex bg-slate-800/80 rounded-lg p-0.5 border border-white/5">
                <button onClick={() => setStatsView('cards')} className={`px-2 py-1 text-xs rounded-md transition-all ${statsView === 'cards' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                </button>
                <button onClick={() => setStatsView('graph')} className={`px-2 py-1 text-xs rounded-md transition-all ${statsView === 'graph' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </button>
            </div>
            {editMode && (
                <div className="relative" ref={statsGearRef}>
                    <button onClick={(e) => { e.stopPropagation(); setStatsGearOpen(!statsGearOpen); }} className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Configure stat cards">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                    {statsGearOpen && (
                        <div className="absolute top-full right-0 mt-2 w-52 py-2 bg-slate-800 border border-white/10 rounded-xl shadow-2xl z-50">
                            <p className="px-4 py-1 text-[10px] font-medium text-slate-500 uppercase tracking-wider">Toggle Cards</p>
                            {ALL_STAT_CARDS.map(card => (
                                <button key={card.id} onClick={() => toggleCard(card.id)} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 transition-colors">
                                    <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${visibleCards.includes(card.id) ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600'}`}>
                                        {visibleCards.includes(card.id) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </span>
                                    {card.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </>
    );

    const renderStats = () => (
        <div className="h-full flex flex-col">
            {/* Cards View */}
            {statsView === 'cards' && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-1 content-start">
                    {activeCards.map(card => (
                        <div key={card.id} className={`p-4 rounded-xl bg-gradient-to-br ${card.gradient} border ${card.border} flex items-center gap-3`}>
                            <div className={`w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center border ${card.iconBorder}`}>
                                <svg className={`w-5 h-5 ${card.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">{card.icon}</svg>
                            </div>
                            <div><p className="text-2xl font-bold text-white">{card.value}</p><p className="text-xs text-slate-400">{card.label}</p></div>
                        </div>
                    ))}
                    {activeCards.length === 0 && <div className="col-span-full text-center py-4 text-slate-500 text-sm">No cards selected. Click <span className="text-cyan-400">Customize</span> → ⚙ to add cards.</div>}
                </div>
            )}
            {/* Graph View */}
            {statsView === 'graph' && (
                <div className="flex-1 flex items-end gap-3 px-2 pt-6 pb-1" style={{ minHeight: '80px' }}>
                    {activeCards.map(card => {
                        const maxVal = Math.max(...activeCards.map(c => c.value), 1);
                        const barHeight = Math.max(Math.round((card.value / maxVal) * 70), 8);
                        return (
                            <div key={card.id} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                                <span className="text-sm font-bold text-white">{card.value}</span>
                                <div className="w-full rounded-t-lg relative overflow-hidden transition-all duration-500" style={{ height: `${barHeight}px`, background: `linear-gradient(to top, ${card.barColor}44, ${card.barColor}aa)`, border: `1px solid ${card.barColor}66`, borderBottom: 'none' }}>
                                    <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10"></div>
                                </div>
                                <span className="text-[10px] text-slate-400 truncate w-full text-center leading-tight">{card.label}</span>
                            </div>
                        );
                    })}
                    {activeCards.length === 0 && <div className="w-full text-center py-4 text-slate-500 text-sm">No cards to graph.</div>}
                </div>
            )}
        </div>
    );

    const renderQuickActions = () => (
        <div className="flex flex-wrap gap-3">
            {(user?.is_admin || user?.can_view_pages) && (
                <>
                    <button onClick={handleCreatePage} className="px-4 py-2.5 rounded-xl font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        New Page
                    </button>
                    <button onClick={handleNavigateToPages} className="px-4 py-2.5 rounded-xl font-medium bg-slate-800/80 hover:bg-slate-700/80 text-white border border-white/10 hover:border-cyan-500/30 transition-all flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        All Pages
                    </button>
                </>
            )}
            {(user?.is_admin || user?.can_view_tasks) && (
                <>
                    <button onClick={() => navigate('/dashboard?view=tasks&newTask=true')} className="px-4 py-2.5 rounded-xl font-medium bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        New Task
                    </button>
                    <button onClick={handleNavigateToTasks} className="px-4 py-2.5 rounded-xl font-medium bg-slate-800/80 hover:bg-slate-700/80 text-white border border-white/10 hover:border-purple-500/30 transition-all flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        All Tasks
                    </button>
                </>
            )}
        </div>
    );

    const renderRecentPages = () => (
        <div className="space-y-2">
            {recentPages.length === 0 ? (
                <div className="text-center py-6 text-slate-500"><p>No pages yet. Create your first one!</p></div>
            ) : recentPages.map(page => (
                <div key={page.id} onClick={() => navigate(`/dashboard?view=pages&page=${page.id}`)} className="group flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-transparent hover:border-cyan-500/20 cursor-pointer transition-all">
                    <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-white group-hover:text-cyan-400 transition-colors truncate text-sm">{page.title || 'Untitled'}</p>
                        <p className="text-xs text-slate-500 truncate">{stripHtml(page.content) || 'No content'}</p>
                    </div>
                    <span className="text-xs text-slate-500 flex-shrink-0">{new Date(page.updated_at).toLocaleDateString()}</span>
                </div>
            ))}
        </div>
    );

    const renderPendingTasks = () => (
        <div className="space-y-2">
            {upcomingTasks.length === 0 ? (
                <div className="text-center py-6 text-slate-500"><p>No pending tasks. You're all caught up! 🎉</p></div>
            ) : upcomingTasks.map(task => (
                <div key={task.id} onClick={handleNavigateToTasks} className="group flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-transparent hover:border-purple-500/20 cursor-pointer transition-all">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${task.priority === 'high' ? 'bg-red-500/20 border border-red-500/30' : task.priority === 'medium' ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-slate-700/50'}`}>
                        <svg className={`w-4 h-4 ${task.priority === 'high' ? 'text-red-400' : task.priority === 'medium' ? 'text-amber-400' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-white group-hover:text-purple-400 transition-colors truncate text-sm">{task.title || 'Untitled Task'}</p>
                        <p className="text-xs text-slate-500">{task.due_date ? `Due: ${new Date(task.due_date).toLocaleDateString()}` : 'No due date'}</p>
                    </div>
                    {task.priority && (
                        <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${task.priority === 'high' ? 'bg-red-500/15 text-red-400 border border-red-500/30' : task.priority === 'medium' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-slate-500/15 text-slate-400 border border-slate-500/30'}`}>
                            {task.priority}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );

    const renderCalendar = () => (
        <TaskCalendar tasks={tasks} onTaskClick={handleNavigateToTasks} embedded />
    );

    const renderFinanceModal = () => {
        if (!financeModalOpen) return null;
        return (
            <FinanceModalForm
                trackers={trackers}
                onClose={() => setFinanceModalOpen(false)}
                onSubmit={(config) => {
                    const newId = `financeChart_${Date.now()}`;
                    const def = WIDGET_DEFS.find(w => w.id === 'financeChart');
                    const currentLg = layouts.lg || [];
                    const maxY = currentLg.reduce((max, l) => Math.max(max, l.y + l.h), 0);
                    const newItem = { i: newId, x: 0, y: maxY, w: def.defaultW, h: def.defaultH, config };

                    // No need to hide the definition from the toolbar, it allows multiple
                    const newLayout = [...currentLg, newItem];
                    setLayouts({ ...layouts, lg: newLayout });
                    saveLayout(newLayout, hiddenWidgets);
                    setFinanceModalOpen(false);
                }}
            />
        );
    };

    const renderedWidgets = (layouts.lg || []).map(layoutItem => {
        const baseId = layoutItem.i.split('_')[0];
        const def = WIDGET_DEFS.find(w => w.id === baseId);
        if (!def) return null;
        if (def.adminOnly && !user?.is_admin) return null;

        // Block rendering of widgets if the user lacks the specific roles
        if (baseId === 'financeChart' && !user?.is_admin && !user?.can_view_finance) return null;
        if (baseId === 'pendingTasks' && !user?.is_admin && !user?.can_view_tasks) return null;
        if (baseId === 'recentPages' && !user?.is_admin && !user?.can_view_pages) return null;
        if (baseId === 'calendar' && !user?.is_admin && !user?.can_view_tasks) return null;

        // If it's a singleton and it's hidden, don't render it
        if (!def.allowMultiple && hiddenWidgets.includes(baseId)) return null;

        let resolvedTitle = layoutItem.config?.title?.trim() || WIDGET_NAMES[baseId];
        let resolvedIcon = WIDGET_ICONS[baseId];

        if (baseId === 'financeChart') {
            const tracker = trackers.find(t => t.id === layoutItem.config?.targetTracker);
            if (tracker?.icon) resolvedIcon = <span className="text-base leading-none">{tracker.icon}</span>;

            if (!layoutItem.config?.title?.trim()) {
                const typeLabels = { overview: "Overview Pie", expense: "Exp Pie", income: "Inc Pie", trend: "Trend" };
                resolvedTitle = tracker ? `${typeLabels[layoutItem.config?.chartType] || 'Finance'} (${tracker.name})` : `${typeLabels[layoutItem.config?.chartType] || 'Finance'} (All)`;
            }
        }

        return { ...def, instanceId: layoutItem.i, config: layoutItem.config, resolvedTitle, resolvedIcon };
    }).filter(Boolean);

    const renderUserActivity = () => (
        <div>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 text-center">
                    <p className="text-lg font-bold text-green-400">{activityStats.active}</p>
                    <p className="text-[10px] text-green-400/70">Active</p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-center">
                    <p className="text-lg font-bold text-amber-400">{activityStats.average}</p>
                    <p className="text-[10px] text-amber-400/70">Average</p>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2 text-center">
                    <p className="text-lg font-bold text-orange-400">{activityStats.lessActive}</p>
                    <p className="text-[10px] text-orange-400/70">Less Active</p>
                </div>
                <div className="bg-slate-500/10 border border-slate-500/20 rounded-lg px-3 py-2 text-center">
                    <p className="text-lg font-bold text-slate-400">{activityStats.newUser}</p>
                    <p className="text-[10px] text-slate-400/70">New</p>
                </div>
                <div className="bg-slate-500/10 border border-slate-500/20 rounded-lg px-3 py-2 text-center">
                    <p className="text-lg font-bold text-slate-500">{activityStats.deactivated}</p>
                    <p className="text-[10px] text-slate-500/70">Deactivated</p>
                </div>
            </div>
            {/* User List */}
            <div className="space-y-2">
                {adminUsers.map(u => {
                    const level = getActivityLevel(u);
                    const isDeactivated = u.status === 'inactive';
                    return (
                        <div key={u.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isDeactivated ? 'bg-slate-800/30 border-white/5 opacity-60' : 'bg-slate-800/50 border-white/5 hover:border-white/10'}`}>
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="relative flex-shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-medium text-slate-300">
                                        {u.username?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${level.dotClass}`}></span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className={`text-sm font-medium truncate ${isDeactivated ? 'text-slate-500' : 'text-white'}`}>
                                        {u.username}
                                        {u.is_admin && <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-indigo-500/20 text-indigo-400 rounded-full">Admin</span>}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">Last login: {timeAgo(u.last_login)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <span className="text-xs text-slate-500 hidden sm:block">{u.login_days_14d}d/14d</span>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${BADGE_COLORS[level.color]}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${level.dotClass}`}></span>
                                    {level.label}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const WIDGET_RENDERERS = {
        stats: renderStats,
        quickActions: renderQuickActions,
        recentPages: renderRecentPages,
        pendingTasks: renderPendingTasks,
        calendar: renderCalendar,
        userActivity: renderUserActivity,
    };

    return (
        <div className="flex min-h-screen w-full bg-slate-950 text-slate-100 overflow-hidden relative">
            <ParticleBackground />

            <Sidebar
                pages={pages}
                financeTrackersCount={trackers.length}
                onCreatePage={handleCreatePage}
                activePageId={null}
                onSelectPage={(pageId) => navigate(`/dashboard?view=pages&page=${pageId}`)}
                onDeletePage={() => { }}
                onReorder={() => { }}
                user={user}
                onLogout={logout}
                activeView="home"
                onViewChange={(view) => {
                    if (view === 'home') navigate('/');
                    else if (view === 'pages') handleNavigateToPages();
                    else if (view === 'tasks') handleNavigateToTasks();
                    else if (view === 'finance') navigate('/dashboard?view=finance');
                    else if (view === 'articles') navigate('/dashboard?view=articles');
                }}
                onTaskFilterChange={(filter) => navigate(`/dashboard?view=tasks&filter=${filter}`)}
                onPagesFilterChange={(filter) => navigate(`/dashboard?view=pages&pagesFilter=${filter}`)}
                tasks={tasks}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                onOpenSearch={() => setShowSearch(true)}
            />

            <main className="flex-1 flex flex-col h-screen overflow-y-auto relative z-10 p-4 lg:p-6">
                {/* Mobile hamburger */}
                {!sidebarOpen && (
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-slate-900/90 backdrop-blur border border-white/10 text-slate-400 hover:text-white hover:bg-slate-800 transition-all shadow-lg"
                        aria-label="Open sidebar"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                )}
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="max-w-6xl mx-auto w-full space-y-6">
                        {/* Welcome + Toolbar */}
                        <div className="pt-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pl-12 lg:pl-0">
                            <div>
                                <h1 className="text-3xl font-bold text-white mb-1">
                                    {getGreeting()}, <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">{userName}</span>!
                                </h1>
                                <p className="text-slate-400">Here's what's happening with your workspace today.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Search Bar */}
                                <button
                                    onClick={() => setShowSearch(true)}
                                    className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/50 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all cursor-pointer"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <span className="text-sm">Search...</span>
                                    <kbd className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-slate-700/50 text-slate-500 border border-white/10">Ctrl+K</kbd>
                                </button>
                                <WidgetToolbar
                                    editMode={editMode}
                                    onToggleEditMode={() => setEditMode(!editMode)}
                                    onResetLayout={resetLayout}
                                    availableWidgets={addableWidgets}
                                    onAddWidget={addWidget}
                                />
                            </div>
                        </div>

                        {/* Grid Layout */}
                        {layoutLoaded && (
                            <ResponsiveGridLayout
                                className="layout"
                                layouts={{ lg: layoutWithConstraints }}
                                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                                cols={{ lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 }}
                                rowHeight={60}
                                isDraggable={editMode}
                                isResizable={editMode}
                                onLayoutChange={handleLayoutChange}
                                draggableHandle=".drag-handle"
                                containerPadding={[0, 0]}
                                margin={[16, 16]}
                                useCSSTransforms={true}
                                compactType="vertical"
                            >
                                {renderedWidgets.map(widget => (
                                    <div key={widget.instanceId}>
                                        <WidgetWrapper
                                            title={widget.resolvedTitle}
                                            icon={widget.resolvedIcon}
                                            editMode={editMode}
                                            onRemove={() => removeWidget(widget.instanceId)}
                                            badge={widget.adminOnly ? 'Admin' : null}
                                            headerActions={widget.id === 'stats' ? statsHeaderActions : null}
                                        >
                                            {widget.id === 'financeChart' ? (
                                                <DynamicFinanceWidget config={widget.config} authFetch={authenticatedFetch} apiUrl={API_URL} />
                                            ) : WIDGET_RENDERERS[widget.id]?.()}
                                        </WidgetWrapper>
                                    </div>
                                ))}
                            </ResponsiveGridLayout>
                        )}
                    </div>
                )}
            </main>

            {renderFinanceModal()}

            {/* Global Search Modal */}
            <SearchModal
                isOpen={showSearch}
                onClose={() => setShowSearch(false)}
                onSelectPage={(pageId) => navigate(`/dashboard?view=pages&page=${pageId}`)}
                onSelectTask={(task) => navigate('/dashboard?view=tasks')}
                defaultScope="all"
            />
        </div>
    );
}

export default Home;

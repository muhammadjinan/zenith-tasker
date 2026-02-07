import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ParticleBackground from '../components/ParticleBackground';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Strip HTML tags for preview
const stripHtml = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').slice(0, 80);
};

function Home() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [pages, setPages] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    const authenticatedFetch = useCallback(async (url, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`,
            ...options.headers
        };
        return fetch(url, { ...options, headers });
    }, [user?.token]);

    // Fetch data on load
    useEffect(() => {
        if (!user?.token) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch pages
                const pagesRes = await authenticatedFetch(`${API_URL}/pages`);
                if (pagesRes.ok) {
                    const pagesData = await pagesRes.json();
                    if (Array.isArray(pagesData)) setPages(pagesData);
                }

                // Fetch tasks
                const tasksRes = await authenticatedFetch(`${API_URL}/tasks`);
                if (tasksRes.ok) {
                    const tasksData = await tasksRes.json();
                    if (Array.isArray(tasksData)) setTasks(tasksData);
                }
            } catch (err) {
                console.error('Failed to fetch data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user?.token, authenticatedFetch]);

    // Calculate stats
    const totalPages = pages.length;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed' || t.is_completed).length;
    const pendingTasks = totalTasks - completedTasks;

    // Get recent pages (last 5, sorted by updated_at)
    const recentPages = [...pages]
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(0, 5);

    // Get upcoming/pending tasks (last 5)
    const upcomingTasks = tasks
        .filter(t => t.status !== 'completed' && !t.is_completed)
        .slice(0, 5);

    // Navigation handlers
    const handleNavigateToPages = () => navigate('/dashboard?view=pages');
    const handleNavigateToTasks = () => navigate('/dashboard?view=tasks');
    const handleCreatePage = async () => {
        try {
            const res = await authenticatedFetch(`${API_URL}/pages`, { method: 'POST' });
            if (res.ok) {
                const newPage = await res.json();
                navigate(`/dashboard?view=pages&page=${newPage.id}&edit=true`);
            }
        } catch (err) {
            console.error('Failed to create page:', err);
        }
    };

    // Time-based greeting
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const userName = user?.username || user?.email?.split('@')[0] || 'there';

    return (
        <div className="flex min-h-screen w-full bg-slate-950 text-slate-100 overflow-hidden relative">
            <ParticleBackground />

            <Sidebar
                pages={pages}
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
                }}
                onTaskFilterChange={(filter) => navigate(`/dashboard?view=tasks&filter=${filter}`)}
                onPagesFilterChange={(filter) => navigate(`/dashboard?view=pages&pagesFilter=${filter}`)}
                tasks={tasks}
            />

            <main className="flex-1 flex flex-col h-screen overflow-y-auto relative z-10 p-6">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="max-w-6xl mx-auto w-full space-y-8">
                        {/* Welcome Section */}
                        <div className="pt-4">
                            <h1 className="text-4xl font-bold text-white mb-2">
                                {getGreeting()}, <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">{userName}</span>!
                            </h1>
                            <p className="text-slate-400 text-lg">Here's what's happening with your workspace today.</p>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Total Pages */}
                            <div className="p-5 rounded-2xl bg-slate-900/80 backdrop-blur border border-white/10 hover:border-cyan-500/30 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/30">
                                        <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-3xl font-bold text-white">{totalPages}</p>
                                        <p className="text-sm text-slate-400">Total Pages</p>
                                    </div>
                                </div>
                            </div>

                            {/* Total Tasks */}
                            <div className="p-5 rounded-2xl bg-slate-900/80 backdrop-blur border border-white/10 hover:border-purple-500/30 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-purple-500/30">
                                        <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-3xl font-bold text-white">{totalTasks}</p>
                                        <p className="text-sm text-slate-400">Total Tasks</p>
                                    </div>
                                </div>
                            </div>

                            {/* Completed Tasks */}
                            <div className="p-5 rounded-2xl bg-slate-900/80 backdrop-blur border border-white/10 hover:border-green-500/30 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center border border-green-500/30">
                                        <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-3xl font-bold text-white">{completedTasks}</p>
                                        <p className="text-sm text-slate-400">Completed</p>
                                    </div>
                                </div>
                            </div>

                            {/* Pending Tasks */}
                            <div className="p-5 rounded-2xl bg-slate-900/80 backdrop-blur border border-white/10 hover:border-amber-500/30 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/30">
                                        <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-3xl font-bold text-white">{pendingTasks}</p>
                                        <p className="text-sm text-slate-400">Pending</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex flex-wrap gap-4">
                            <button
                                onClick={handleCreatePage}
                                className="px-5 py-3 rounded-xl font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Create New Page
                            </button>
                            <button
                                onClick={handleNavigateToPages}
                                className="px-5 py-3 rounded-xl font-medium bg-slate-800/80 hover:bg-slate-700/80 text-white border border-white/10 hover:border-cyan-500/30 transition-all flex items-center gap-2"
                            >
                                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                View All Pages
                            </button>
                            <button
                                onClick={handleNavigateToTasks}
                                className="px-5 py-3 rounded-xl font-medium bg-slate-800/80 hover:bg-slate-700/80 text-white border border-white/10 hover:border-purple-500/30 transition-all flex items-center gap-2"
                            >
                                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                View All Tasks
                            </button>
                        </div>

                        {/* Two Column Layout: Recent Pages & Upcoming Tasks */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Recent Pages */}
                            <div className="p-6 rounded-2xl bg-slate-900/80 backdrop-blur border border-white/10">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                        <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Recent Pages
                                    </h2>
                                    <button
                                        onClick={handleNavigateToPages}
                                        className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                                    >
                                        View all →
                                    </button>
                                </div>
                                {recentPages.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500">
                                        <p>No pages yet. Create your first one!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {recentPages.map(page => (
                                            <div
                                                key={page.id}
                                                onClick={() => navigate(`/dashboard?view=pages&page=${page.id}`)}
                                                className="group flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-transparent hover:border-cyan-500/20 cursor-pointer transition-all"
                                            >
                                                <div className="w-9 h-9 rounded-lg bg-slate-700/50 flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-white group-hover:text-cyan-400 transition-colors truncate">
                                                        {page.title || 'Untitled'}
                                                    </p>
                                                    <p className="text-xs text-slate-500 truncate">
                                                        {stripHtml(page.content) || 'No content'}
                                                    </p>
                                                </div>
                                                <span className="text-xs text-slate-500">
                                                    {new Date(page.updated_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Upcoming Tasks */}
                            <div className="p-6 rounded-2xl bg-slate-900/80 backdrop-blur border border-white/10">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                        <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        Pending Tasks
                                    </h2>
                                    <button
                                        onClick={handleNavigateToTasks}
                                        className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                                    >
                                        View all →
                                    </button>
                                </div>
                                {upcomingTasks.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500">
                                        <p>No pending tasks. You're all caught up! 🎉</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {upcomingTasks.map(task => (
                                            <div
                                                key={task.id}
                                                onClick={handleNavigateToTasks}
                                                className="group flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-transparent hover:border-purple-500/20 cursor-pointer transition-all"
                                            >
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${task.priority === 'high'
                                                    ? 'bg-red-500/20 border border-red-500/30'
                                                    : task.priority === 'medium'
                                                        ? 'bg-amber-500/20 border border-amber-500/30'
                                                        : 'bg-slate-700/50'
                                                    }`}>
                                                    <svg className={`w-4 h-4 ${task.priority === 'high' ? 'text-red-400'
                                                        : task.priority === 'medium' ? 'text-amber-400'
                                                            : 'text-slate-400'
                                                        }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-white group-hover:text-purple-400 transition-colors truncate">
                                                        {task.title || 'Untitled Task'}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {task.due_date ? `Due: ${new Date(task.due_date).toLocaleDateString()}` : 'No due date'}
                                                    </p>
                                                </div>
                                                {task.priority && (
                                                    <span className={`px-2 py-0.5 text-xs rounded-full ${task.priority === 'high'
                                                        ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                                                        : task.priority === 'medium'
                                                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                                            : 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                                                        }`}>
                                                        {task.priority}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default Home;

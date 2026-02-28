import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import ArticleViewer from './ArticleViewer';
import ArticleEditor from './ArticleEditor';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CATEGORIES = [
    { id: 'all', label: 'All', icon: '📁' },
    { id: 'pages', label: 'Pages', icon: '📄' },
    { id: 'tasks', label: 'Tasks', icon: '✅' },
    { id: 'finance', label: 'Finance', icon: '💰' }
];

const TYPES = [
    { id: 'all', label: 'All' },
    { id: 'how_to', label: 'How to use' },
    { id: 'feature', label: 'Features' },
    { id: 'new_feature', label: 'New Features' },
    { id: 'upcoming', label: 'Upcoming features' }
];

const KnowledgeBase = ({ onUpdateCounts }) => {
    const { user } = useAuth();
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'view' | 'edit'
    const [activeArticle, setActiveArticle] = useState(null);

    // Filters
    const [typeFilter, setTypeFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');

    // Permissions
    const canManage = user?.is_admin || user?.is_author;

    const authenticatedFetch = useCallback(async (url, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user?.token}`,
            ...options.headers
        };
        return fetch(url, { ...options, headers });
    }, [user?.token]);

    const fetchArticles = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (typeFilter !== 'all') params.append('type', typeFilter);
            if (categoryFilter !== 'all') params.append('category', categoryFilter);

            const res = await authenticatedFetch(`${API_URL}/articles?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setArticles(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Failed to fetch articles:', err);
        } finally {
            setLoading(false);
        }
    }, [typeFilter, categoryFilter, authenticatedFetch]);

    useEffect(() => {
        if (user?.token && viewMode === 'list') {
            fetchArticles();
        }
    }, [user?.token, typeFilter, categoryFilter, viewMode, fetchArticles]);

    const handleCreateNew = () => {
        setActiveArticle(null);
        setViewMode('edit');
    };

    const handleEdit = (article) => {
        setActiveArticle(article);
        setViewMode('edit');
    };

    const handleView = (article) => {
        setActiveArticle(article);
        setViewMode('view');
    };

    const handleSave = async (articleData) => {
        try {
            const method = articleData.id ? 'PUT' : 'POST';
            const url = articleData.id
                ? `${API_URL}/articles/${articleData.id}`
                : `${API_URL}/articles`;

            const res = await authenticatedFetch(url, {
                method,
                body: JSON.stringify(articleData)
            });

            if (res.ok) {
                setViewMode('list');
                fetchArticles();
            } else {
                const err = await res.json();
                alert(`Error saving article: ${err.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('Failed to save article:', err);
            alert('Failed to save article. View console for details.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this article?')) return;
        try {
            const res = await authenticatedFetch(`${API_URL}/articles/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setViewMode('list');
                fetchArticles();
            } else {
                const err = await res.json();
                alert(`Error deleting article: ${err.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('Failed to delete article:', err);
        }
    };

    // Sub-views
    if (viewMode === 'view' && activeArticle) {
        return (
            <ArticleViewer
                article={activeArticle}
                onBack={() => setViewMode('list')}
                onEdit={canManage && (user?.is_admin || activeArticle.author_id === user?.id) ? () => handleEdit(activeArticle) : null}
                onDelete={canManage && (user?.is_admin || activeArticle.author_id === user?.id) ? () => handleDelete(activeArticle.id) : null}
            />
        );
    }

    if (viewMode === 'edit') {
        return (
            <ArticleEditor
                article={activeArticle}
                onSave={handleSave}
                onCancel={() => setViewMode('list')}
                categories={CATEGORIES.filter(c => c.id !== 'all')}
                types={TYPES.filter(t => t.id !== 'all')}
            />
        );
    }

    // Main List View Setup
    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 pl-12 lg:pl-0 px-4 sm:px-8 pt-4 sm:pt-8 w-full shrink-0">
                <div>
                    <h1 className="text-3xl font-semibold text-white">Knowledge Base</h1>
                    <p className="text-slate-400 mt-1">Guides, features, and updates for your workspace.</p>
                </div>
                {canManage && (
                    <button
                        onClick={handleCreateNew}
                        className="px-4 py-2 rounded-xl font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Article
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="px-4 sm:px-8 shrink-0 flex flex-col gap-4 mb-6">
                <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                    <span className="text-sm text-slate-500 font-medium whitespace-nowrap hidden sm:block">Category:</span>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide flex-1">
                        {CATEGORIES.map(c => (
                            <button
                                key={c.id}
                                onClick={() => setCategoryFilter(c.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${categoryFilter === c.id
                                        ? 'bg-slate-700/80 text-white border border-slate-600 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                                    }`}
                            >
                                <span>{c.icon}</span> {c.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-500 font-medium whitespace-nowrap hidden sm:block">Type:</span>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide flex-1">
                        {TYPES.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setTypeFilter(t.id)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${typeFilter === t.id
                                        ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-sm shadow-indigo-500/10'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                                    }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-8">
                {loading ? (
                    <div className="flex justify-center items-center h-40">
                        <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                    </div>
                ) : articles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-slate-500 gap-4 bg-slate-900/30 border border-white/5 rounded-2xl">
                        <svg className="w-12 h-12 text-slate-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <p className="text-lg">No articles found matching those filters.</p>
                        {canManage && (
                            <button onClick={handleCreateNew} className="text-indigo-400 hover:text-indigo-300 font-medium">
                                Create your first article
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {articles.map(article => {
                            const catLabel = CATEGORIES.find(c => c.id === article.category)?.label || article.category;
                            const typeLabel = TYPES.find(t => t.id === article.type)?.label || article.type;
                            const catIcon = CATEGORIES.find(c => c.id === article.category)?.icon || '📁';

                            return (
                                <div
                                    key={article.id}
                                    onClick={() => handleView(article)}
                                    className="group p-5 rounded-xl bg-slate-900/80 backdrop-blur border border-white/5 hover:border-indigo-500/30 hover:bg-slate-800/80 cursor-pointer transition-all hover:shadow-lg hover:shadow-indigo-500/5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between"
                                >
                                    <div className="flex flex-col gap-2 min-w-0">
                                        <h3 className="text-lg font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors truncate">
                                            {article.title}
                                        </h3>
                                        <div className="flex items-center gap-3 text-sm text-slate-400">
                                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800 border border-white/5 shadow-inner">
                                                <span>{catIcon}</span>
                                                {catLabel}
                                            </span>
                                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                {typeLabel}
                                            </span>
                                            <span className="hidden sm:inline text-slate-500">&bull;</span>
                                            <span className="truncate hidden sm:inline">By {article.author_name || 'Unknown'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 mt-2 sm:mt-0 pt-3 sm:pt-0 border-t border-white/5 sm:border-0 relative">
                                        <div className="text-xs text-slate-500">
                                            {new Date(article.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                        <div className="text-slate-400 group-hover:text-white transition-colors bg-slate-800 group-hover:bg-indigo-500 w-8 h-8 rounded-full flex items-center justify-center">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default KnowledgeBase;

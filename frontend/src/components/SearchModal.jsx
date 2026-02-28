import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const SCOPES = [
    { id: 'all', label: 'Everything', icon: '🌐' },
    { id: 'pages', label: 'Pages', icon: '📄' },
    { id: 'tasks', label: 'Tasks', icon: '✅' },
];

const SearchModal = ({ isOpen, onClose, onSelectPage, onSelectTask, defaultScope = 'all' }) => {
    const { user } = useAuth();
    const [query, setQuery] = useState('');
    const [scope, setScope] = useState(defaultScope);
    const [results, setResults] = useState({ pages: [], tasks: [] });
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const debounceRef = useRef(null);

    // Reset when opening — apply new defaultScope each time
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setScope(defaultScope);
            setResults({ pages: [], tasks: [] });
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, defaultScope]);

    // Search with debounce + scope
    const search = useCallback(async (searchQuery, searchScope) => {
        if (!searchQuery || searchQuery.trim().length < 2) {
            setResults({ pages: [], tasks: [] });
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(
                `${API_URL}/search?q=${encodeURIComponent(searchQuery)}&scope=${searchScope}`,
                { headers: { 'Authorization': `Bearer ${user.token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                setResults(data);
                setSelectedIndex(0);
            }
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setLoading(false);
        }
    }, [user?.token]);

    // Debounced search — reacts to query AND scope changes
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(query, scope), 250);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query, scope, search]);

    // Combine results for keyboard navigation
    const allResults = [
        ...results.pages.map(p => ({ ...p, type: 'page' })),
        ...results.tasks.map(t => ({ ...t, type: 'task' })),
    ];

    // Keyboard navigation
    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, allResults.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && allResults[selectedIndex]) {
            const item = allResults[selectedIndex];
            if (item.type === 'page') onSelectPage(item.id);
            else onSelectTask(item);
            onClose();
        } else if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'Tab') {
            // Tab cycles through scopes
            e.preventDefault();
            const currentIdx = SCOPES.findIndex(s => s.id === scope);
            const nextIdx = (currentIdx + 1) % SCOPES.length;
            setScope(SCOPES[nextIdx].id);
        }
    };

    // Highlight matching text
    const highlight = (text, q) => {
        if (!text || !q) return text;
        const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
        return parts.map((part, i) =>
            part.toLowerCase() === q.toLowerCase()
                ? <mark key={i} className="bg-cyan-500/30 text-cyan-300 rounded px-0.5">{part}</mark>
                : part
        );
    };

    const currentScope = SCOPES.find(s => s.id === scope);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />

            {/* Modal */}
            <div className="fixed top-[12%] left-1/2 -translate-x-1/2 w-full max-w-xl z-50 px-4">
                <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">

                    {/* Scope Selector */}
                    <div className="flex items-center gap-1 px-4 pt-3 pb-1">
                        {SCOPES.map(s => (
                            <button
                                key={s.id}
                                onClick={() => setScope(s.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${scope === s.id
                                        ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'
                                    }`}
                            >
                                <span>{s.icon}</span>
                                {s.label}
                            </button>
                        ))}
                        <span className="ml-auto text-[10px] text-slate-600">
                            <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-white/10">Tab</kbd> to switch
                        </span>
                    </div>

                    {/* Search Input */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                        <svg className="w-5 h-5 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={`Search ${currentScope?.label.toLowerCase() || 'everything'}...`}
                            className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-sm"
                        />
                        {loading && (
                            <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
                        )}
                        <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-500 border border-white/10">
                            ESC
                        </kbd>
                    </div>

                    {/* Results */}
                    <div className="max-h-[400px] overflow-y-auto">
                        {query.trim().length < 2 ? (
                            <div className="px-4 py-8 text-center text-sm text-slate-500">
                                <p>Type at least 2 characters to search</p>
                                <p className="text-xs text-slate-600 mt-1">
                                    {scope === 'all' ? 'Searching across all pages and tasks' :
                                        scope === 'pages' ? 'Searching in pages only' : 'Searching in tasks only'}
                                </p>
                            </div>
                        ) : allResults.length === 0 && !loading ? (
                            <div className="px-4 py-8 text-center text-sm text-slate-500">
                                No results found for "{query}" in {currentScope?.label.toLowerCase()}
                            </div>
                        ) : (
                            <div className="py-2">
                                {/* Pages */}
                                {results.pages.length > 0 && (
                                    <div>
                                        <div className="px-4 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                                            📄 Pages
                                        </div>
                                        {results.pages.map((page, i) => {
                                            const globalIndex = i;
                                            return (
                                                <button
                                                    key={`page-${page.id}`}
                                                    onClick={() => { onSelectPage(page.id); onClose(); }}
                                                    className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition-all ${selectedIndex === globalIndex
                                                            ? 'bg-cyan-500/10 text-white'
                                                            : 'text-slate-300 hover:bg-white/5'
                                                        }`}
                                                >
                                                    <span className="text-base flex-shrink-0 mt-0.5">{page.icon || '📄'}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium truncate">
                                                            {highlight(page.title || 'Untitled', query)}
                                                        </div>
                                                        {page.preview && (
                                                            <p className="text-xs text-slate-500 truncate mt-0.5">
                                                                {highlight(page.preview, query)}
                                                            </p>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Tasks */}
                                {results.tasks.length > 0 && (
                                    <div>
                                        <div className="px-4 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-1">
                                            ✅ Tasks
                                        </div>
                                        {results.tasks.map((task, i) => {
                                            const globalIndex = results.pages.length + i;
                                            const statusColors = {
                                                'todo': 'bg-blue-500/20 text-blue-400',
                                                'in_progress': 'bg-amber-500/20 text-amber-400',
                                                'completed': 'bg-green-500/20 text-green-400',
                                                'done': 'bg-green-500/20 text-green-400',
                                            };
                                            return (
                                                <button
                                                    key={`task-${task.id}`}
                                                    onClick={() => { onSelectTask(task); onClose(); }}
                                                    className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition-all ${selectedIndex === globalIndex
                                                            ? 'bg-cyan-500/10 text-white'
                                                            : 'text-slate-300 hover:bg-white/5'
                                                        }`}
                                                >
                                                    <svg className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium truncate">
                                                            {highlight(task.title, query)}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusColors[task.status] || 'bg-slate-700 text-slate-400'}`}>
                                                                {task.status?.replace('_', ' ')}
                                                            </span>
                                                            {task.priority && (
                                                                <span className="text-[10px] text-slate-500">{task.priority}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-600">
                        <span>
                            <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-white/10 mr-1">↑↓</kbd>
                            Navigate
                            <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-white/10 ml-2 mr-1">↵</kbd>
                            Open
                            <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-white/10 ml-2 mr-1">Tab</kbd>
                            Scope
                        </span>
                        <span>{allResults.length} results</span>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SearchModal;

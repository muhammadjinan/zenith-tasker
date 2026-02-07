import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import Sidebar from '../components/Sidebar';
import ParticleBackground from '../components/ParticleBackground';
import TaskList from '../components/TaskList';
import { useAuth } from '../context/AuthContext';
import DOMPurify from 'dompurify';
import html2pdf from 'html2pdf.js';


const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Strip HTML tags and decode entities for preview
const stripHtml = (html) => {
    if (!html) return '';
    // Create a temporary element to decode HTML entities
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return (temp.textContent || temp.innerText || '').slice(0, 100);
};

function Dashboard() {
    const [pages, setPages] = useState([]);
    const [activePageId, setActivePageId] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'page'
    const [displayMode, setDisplayMode] = useState('cards'); // 'cards' | 'rows'
    const [editMode, setEditMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false); // Track unsaved changes
    const [saveSuccess, setSaveSuccess] = useState(false); // Show save feedback
    const [activeView, setActiveView] = useState('pages'); // 'pages' | 'tasks'
    const [taskFilter, setTaskFilter] = useState('all'); // 'all' | 'todo' | 'inprogress' | 'done' | 'overdue'
    const [pagesFilter, setPagesFilter] = useState('all'); // 'all' | 'recent' | 'favorites'
    const [tasks, setTasks] = useState([]); // For sidebar counts
    const [showUnsavedModal, setShowUnsavedModal] = useState(false); // Unsaved changes warning
    const [pendingNavigation, setPendingNavigation] = useState(null); // Store pending navigation action
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Handle URL parameters on mount
    useEffect(() => {
        const view = searchParams.get('view');
        const pageId = searchParams.get('page');
        const edit = searchParams.get('edit');
        const filter = searchParams.get('filter');
        const pagesFilterParam = searchParams.get('pagesFilter');

        if (view === 'tasks') {
            setActiveView('tasks');
            if (filter) setTaskFilter(filter);
        } else if (view === 'pages' || pageId) {
            setActiveView('pages');
            if (pagesFilterParam) setPagesFilter(pagesFilterParam);
            if (pageId) {
                const numericPageId = parseInt(pageId, 10);
                setActivePageId(numericPageId);
                setViewMode('page');
                if (edit === 'true') setEditMode(true);
            }
        }
    }, [searchParams]);

    const authenticatedFetch = useCallback(async (url, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`,
            ...options.headers
        };
        return fetch(url, { ...options, headers });
    }, [user?.token]);

    // Save page to server
    const savePageToServer = useCallback(async (pageId, title, content) => {
        if (!pageId) return false;

        setIsSaving(true);
        setSaveSuccess(false);
        try {
            const response = await authenticatedFetch(`${API_URL}/pages/${pageId}`, {
                method: 'PUT',
                body: JSON.stringify({ title, content }),
            });
            if (response.ok) {
                setHasChanges(false);
                setSaveSuccess(true);
                // Auto-hide success message after 2 seconds
                setTimeout(() => setSaveSuccess(false), 2000);
            }
            return response.ok;
        } catch (err) {
            console.error('Failed to save page:', err);
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [authenticatedFetch]);

    // Fetch pages and tasks on load
    useEffect(() => {
        if (!user?.token) return;

        // Fetch pages
        authenticatedFetch(`${API_URL}/pages`)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch pages');
                return res.json();
            })
            .then(data => {
                if (Array.isArray(data)) {
                    setPages(data);
                }
            })
            .catch(err => console.error('Failed to fetch pages:', err));

        // Fetch tasks for sidebar counts
        authenticatedFetch(`${API_URL}/tasks`)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch tasks');
                return res.json();
            })
            .then(data => {
                if (Array.isArray(data)) {
                    setTasks(data);
                }
            })
            .catch(err => console.error('Failed to fetch tasks:', err));
    }, [user?.token, authenticatedFetch]);

    const activePage = pages.find(p => p.id === activePageId);

    // Filter pages based on pagesFilter
    const filteredPages = React.useMemo(() => {
        switch (pagesFilter) {
            case 'recent':
                // Sort by updated_at descending and show last 5
                return [...pages]
                    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
                    .slice(0, 5);
            case 'favorites':
                // Filter by is_favorite flag (if exists), otherwise return empty
                return pages.filter(p => p.is_favorite);
            case 'all':
            default:
                return pages;
        }
    }, [pages, pagesFilter]);

    // Get page title based on filter
    const getPageTitle = () => {
        switch (pagesFilter) {
            case 'recent': return 'Recently Edited';
            case 'favorites': return 'Favorite Pages';
            default: return 'My Pages';
        }
    };

    // Open a page in viewing mode
    const openPage = (pageId) => {
        setActivePageId(pageId);
        setViewMode('page');
        setEditMode(false);
    };

    // Go back to list
    const goBackToList = async () => {
        // Save if in edit mode
        if (editMode && activePage) {
            await savePageToServer(activePageId, activePage.title, activePage.content);
        }
        setViewMode('list');
        setActivePageId(null);
        setEditMode(false);
    };

    // Toggle edit mode
    const toggleEditMode = async () => {
        if (editMode && activePage) {
            // Save before exiting edit mode
            await savePageToServer(activePageId, activePage.title, activePage.content);
        }
        setEditMode(!editMode);
    };

    // Create new page
    const createNewPage = async () => {
        try {
            const res = await authenticatedFetch(`${API_URL}/pages`, { method: 'POST' });
            if (!res.ok) throw new Error('Failed to create page');
            const newPage = await res.json();
            setPages(prev => [...prev, newPage]);
            // Open the new page in edit mode
            setActivePageId(newPage.id);
            setViewMode('page');
            setEditMode(true);
        } catch (err) {
            console.error('Failed to create page:', err);
        }
    };

    // Delete page
    const deletePage = async (id) => {
        try {
            const res = await authenticatedFetch(`${API_URL}/pages/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete page');
            setPages(prev => prev.filter(p => p.id !== id));
            if (activePageId === id) {
                setViewMode('list');
                setActivePageId(null);
            }
        } catch (err) {
            console.error('Failed to delete page:', err);
        }
    };

    // Toggle favorite
    const toggleFavorite = async (e, pageId) => {
        e.stopPropagation(); // Prevent opening the page
        try {
            const res = await authenticatedFetch(`${API_URL}/pages/${pageId}/favorite`, { method: 'PATCH' });
            if (res.ok) {
                const updatedPage = await res.json();
                setPages(prev => prev.map(p => p.id === pageId ? updatedPage : p));
            }
        } catch (err) {
            console.error('Failed to toggle favorite:', err);
        }
    };

    // Handle reorder
    const handleReorder = async (newPages) => {
        setPages(newPages);
        const updates = newPages.map((page, index) => ({
            id: page.id,
            order_index: index
        }));

        try {
            await authenticatedFetch(`${API_URL}/pages/reorder`, {
                method: 'PUT',
                body: JSON.stringify({ updates })
            });
        } catch (err) {
            console.error('Failed to reorder pages:', err);
        }
    };

    // Update page in state
    const updatePage = (field, value) => {
        if (!activePageId) return;
        setPages(prev => prev.map(p =>
            p.id === activePageId ? { ...p, [field]: value } : p
        ));
        setHasChanges(true); // Mark that there are unsaved changes
    };

    // Manual save
    const handleSave = async () => {
        if (activePage) {
            await savePageToServer(activePageId, activePage.title, activePage.content);
        }
    };

    // Handle navigation with unsaved changes check
    const handleNavigation = (action) => {
        // If we're editing and have unsaved changes, show warning
        if (editMode && hasChanges) {
            setPendingNavigation(() => action);
            setShowUnsavedModal(true);
            return;
        }
        // Otherwise, execute the navigation
        action();
    };

    // Execute the pending navigation after user confirms
    const executeNavigation = () => {
        setViewMode('list');
        setActivePageId(null);
        setEditMode(false);
        setHasChanges(false);
        if (pendingNavigation) {
            pendingNavigation();
            setPendingNavigation(null);
        }
        setShowUnsavedModal(false);
    };

    // Save and then navigate
    const handleSaveAndNavigate = async () => {
        if (activePage) {
            await savePageToServer(activePageId, activePage.title, activePage.content);
        }
        executeNavigation();
    };

    // Discard changes and navigate
    const handleDiscardAndNavigate = () => {
        setHasChanges(false);
        executeNavigation();
    };

    // Cancel navigation (stay on current page)
    const handleCancelNavigation = () => {
        setShowUnsavedModal(false);
        setPendingNavigation(null);
    };

    // Export PDF
    const handleExportPDF = () => {
        if (!activePage) return;
        const element = document.createElement('div');
        element.innerHTML = `<h1>${activePage.title}</h1>${activePage.content}`;
        const opt = {
            margin: 1,
            filename: `${activePage.title}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    };

    // Export DOCX (Simple HTML Blob method)
    const handleExportDOCX = () => {
        if (!activePage) return;
        const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
            "xmlns:w='urn:schemas-microsoft-com:office:word' " +
            "xmlns='http://www.w3.org/TR/REC-html40'>" +
            "<head><meta charset='utf-8'><title>Export HTML to Word Document with JavaScript</title></head><body>";
        const footer = "</body></html>";
        const sourceHTML = header + `<h1>${activePage.title}</h1>` + activePage.content + footer;

        const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
        const fileDownload = document.createElement("a");
        document.body.appendChild(fileDownload);
        fileDownload.href = source;
        fileDownload.download = `${activePage.title}.doc`; // .doc is more compatible with this simple method
        fileDownload.click();
        document.body.removeChild(fileDownload);
    };

    return (
        <div className="flex min-h-screen w-full bg-slate-950 text-slate-100 overflow-hidden relative">
            <ParticleBackground />

            <Sidebar
                pages={pages}
                onCreatePage={createNewPage}
                activePageId={activePageId}
                onSelectPage={(pageId) => handleNavigation(() => { setActiveView('pages'); openPage(pageId); })}
                onDeletePage={deletePage}
                onReorder={handleReorder}
                user={user}
                onLogout={logout}
                activeView={activeView}
                onViewChange={(view) => handleNavigation(() => {
                    if (view === 'home') { navigate('/'); return; }
                    setActiveView(view);
                    setViewMode('list');
                    setActivePageId(null);
                    setEditMode(false);
                })}
                taskFilter={taskFilter}
                onTaskFilterChange={(filter) => handleNavigation(() => {
                    setActiveView('tasks');
                    setTaskFilter(filter);
                    setViewMode('list');
                    setActivePageId(null);
                    setEditMode(false);
                })}
                pagesFilter={pagesFilter}
                onPagesFilterChange={(filter) => handleNavigation(() => {
                    setActiveView('pages');
                    setPagesFilter(filter);
                    setViewMode('list');
                    setActivePageId(null);
                    setEditMode(false);
                })}
                tasks={tasks}
            />

            <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10 p-6">

                {/* TASKS VIEW */}
                {activeView === 'tasks' && (
                    <TaskList
                        pages={pages}
                        onSelectPage={(pageId) => { setActiveView('pages'); openPage(pageId); }}
                        externalFilter={taskFilter}
                    />
                )}

                {/* LIST VIEW (Pages) */}
                {activeView === 'pages' && viewMode === 'list' && (
                    <div className="flex flex-col h-full">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-6">
                            <h1 className="text-3xl font-semibold text-white">{getPageTitle()}</h1>
                            <div className="flex items-center gap-3">
                                {/* View Toggle */}
                                <div className="flex bg-slate-800/50 rounded-lg p-1 border border-white/10">
                                    <button
                                        onClick={() => setDisplayMode('cards')}
                                        className={`px-3 py-1.5 rounded-md text-sm transition-all ${displayMode === 'cards'
                                            ? 'bg-cyan-500/20 text-cyan-400'
                                            : 'text-slate-400 hover:text-white'
                                            }`}
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => setDisplayMode('rows')}
                                        className={`px-3 py-1.5 rounded-md text-sm transition-all ${displayMode === 'rows'
                                            ? 'bg-cyan-500/20 text-cyan-400'
                                            : 'text-slate-400 hover:text-white'
                                            }`}
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                        </svg>
                                    </button>
                                </div>
                                <button
                                    onClick={createNewPage}
                                    className="px-4 py-2 rounded-xl font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    New Page
                                </button>
                            </div>
                        </div>

                        {/* Pages Grid/List */}
                        <div className="flex-1 overflow-y-auto">
                            {filteredPages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-6">
                                    <div className="w-20 h-20 rounded-2xl bg-slate-800/50 flex items-center justify-center border border-white/5">
                                        <svg className="w-10 h-10 text-cyan-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <p className="text-lg">
                                        {pagesFilter === 'favorites' ? 'No favorite pages yet.' :
                                            pagesFilter === 'recent' ? 'No recent pages.' :
                                                'No pages yet. Create your first one!'}
                                    </p>
                                </div>
                            ) : displayMode === 'cards' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredPages.map(page => (
                                        <div
                                            key={page.id}
                                            onClick={() => openPage(page.id)}
                                            className="group p-5 rounded-xl bg-slate-900/80 backdrop-blur border border-white/10 hover:border-cyan-500/30 cursor-pointer transition-all hover:shadow-lg hover:shadow-cyan-500/5"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors truncate flex-1">
                                                    {page.title || 'Untitled'}
                                                </h3>
                                                <button
                                                    onClick={(e) => toggleFavorite(e, page.id)}
                                                    className={`p-1 rounded-md transition-all hover:bg-yellow-500/10 ${page.is_favorite ? 'text-yellow-400' : 'text-slate-500 hover:text-yellow-400'}`}
                                                    title={page.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                                                >
                                                    <svg className="w-4 h-4" fill={page.is_favorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                                    </svg>
                                                </button>
                                                <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 ml-2">
                                                    DOC
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-400 line-clamp-3">
                                                {stripHtml(page.content) || 'No content yet...'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredPages.map(page => (
                                        <div
                                            key={page.id}
                                            onClick={() => openPage(page.id)}
                                            className="group flex items-center gap-4 p-4 rounded-xl bg-slate-900/80 backdrop-blur border border-white/10 hover:border-cyan-500/30 cursor-pointer transition-all"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                                                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium text-white group-hover:text-cyan-400 transition-colors truncate">
                                                    {page.title || 'Untitled'}
                                                </h3>
                                                <p className="text-sm text-slate-500 truncate">
                                                    {stripHtml(page.content) || 'No content yet...'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => toggleFavorite(e, page.id)}
                                                className={`p-1.5 rounded-md transition-all hover:bg-yellow-500/10 ${page.is_favorite ? 'text-yellow-400' : 'text-slate-500 hover:text-yellow-400'}`}
                                                title={page.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                                            >
                                                <svg className="w-4 h-4" fill={page.is_favorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                                </svg>
                                            </button>
                                            <span className="text-xs text-slate-500">
                                                {new Date(page.updated_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* PAGE VIEW (Viewing/Editing) */}
                {activeView === 'pages' && viewMode === 'page' && activePage && (
                    <div className="flex flex-col h-full max-w-4xl mx-auto w-full bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

                        {/* Header */}
                        <div className="px-8 pt-6 pb-4 flex justify-between items-center border-b border-white/5">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={goBackToList}
                                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                {editMode ? (
                                    <input
                                        type="text"
                                        value={activePage.title || ''}
                                        placeholder="Untitled"
                                        className="text-2xl font-semibold bg-transparent border-none outline-none text-white placeholder-slate-500"
                                        onChange={(e) => updatePage('title', e.target.value)}
                                    />
                                ) : (
                                    <h1 className="text-2xl font-semibold text-white">
                                        {activePage.title || 'Untitled'}
                                    </h1>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                {editMode ? (
                                    <button
                                        onClick={handleSave}
                                        disabled={!hasChanges && !saveSuccess || isSaving}
                                        className={`px-4 py-2 rounded-lg border transition-all font-medium ${saveSuccess
                                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                            : hasChanges
                                                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20'
                                                : 'bg-slate-800/50 text-slate-500 border-slate-700 cursor-not-allowed'
                                            }`}
                                    >
                                        {isSaving ? 'Saving...' : saveSuccess ? '✓ Saved!' : hasChanges ? 'Save Changes' : 'No Changes'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={toggleEditMode}
                                        className="px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all font-medium"
                                    >
                                        Edit Page
                                    </button>
                                )}
                                <button
                                    onClick={(e) => toggleFavorite(e, activePage.id)}
                                    className={`p-2 rounded-lg transition-all border ${activePage.is_favorite
                                        ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20'
                                        : 'bg-slate-800/50 text-slate-400 border-white/10 hover:text-yellow-400 hover:border-yellow-500/30'}`}
                                    title={activePage.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                                >
                                    <svg className="w-5 h-5" fill={activePage.is_favorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                </button>
                                <div className="h-6 w-px bg-white/10 mx-2"></div>
                                <button title="Export to PDF" onClick={handleExportPDF} className="p-2 text-slate-400 hover:text-white transition-colors">
                                    PDF
                                </button>
                                <button title="Export to Word" onClick={handleExportDOCX} className="p-2 text-slate-400 hover:text-white transition-colors">
                                    DOCX
                                </button>
                            </div>
                        </div>

                        {/* Editor / Content */}
                        <div className="flex-1 overflow-y-auto bg-slate-900/50">
                            {editMode ? (
                                <ReactQuill
                                    theme="snow"
                                    value={activePage.content || ''}
                                    onChange={(value) => updatePage('content', value)}
                                    className="h-full"
                                    placeholder="Start writing..."
                                    modules={{
                                        toolbar: [
                                            [{ 'header': [1, 2, 3, false] }],
                                            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                                            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                            ['link', 'image', 'code-block'],
                                            ['clean']
                                        ],
                                    }}
                                />
                            ) : (
                                <div
                                    className="p-8 content-view prose prose-invert max-w-none"
                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(activePage.content || '<p class="text-slate-500">No content yet. Click Edit to start writing.</p>') }}
                                />
                            )}
                        </div>
                    </div>
                )
                }
            </main >

            {/* Unsaved Changes Warning Modal */}
            {showUnsavedModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-white">Unsaved Changes</h3>
                        </div>
                        <p className="text-slate-400 mb-6">
                            You have unsaved changes. Would you like to save them before leaving?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleSaveAndNavigate}
                                className="flex-1 px-4 py-2.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 transition-all font-medium"
                            >
                                Save & Leave
                            </button>
                            <button
                                onClick={handleDiscardAndNavigate}
                                className="flex-1 px-4 py-2.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all font-medium"
                            >
                                Discard
                            </button>
                            <button
                                onClick={handleCancelNavigation}
                                className="flex-1 px-4 py-2.5 rounded-lg bg-slate-800 text-slate-300 border border-white/10 hover:bg-slate-700 transition-all font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}

export default Dashboard;

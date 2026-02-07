import React, { useState, useEffect, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import Sidebar from '../components/Sidebar';
import ParticleBackground from '../components/ParticleBackground';
import TaskList from '../components/TaskList';
import { useAuth } from '../context/AuthContext';
import DOMPurify from 'dompurify';
import html2pdf from 'html2pdf.js';


const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Strip HTML tags for preview
const stripHtml = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').slice(0, 100);
};

function Dashboard() {
    const [pages, setPages] = useState([]);
    const [activePageId, setActivePageId] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'page'
    const [displayMode, setDisplayMode] = useState('cards'); // 'cards' | 'rows'
    const [editMode, setEditMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeView, setActiveView] = useState('pages'); // 'pages' | 'tasks'
    const { logout, user } = useAuth();

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
        try {
            const response = await authenticatedFetch(`${API_URL}/pages/${pageId}`, {
                method: 'PUT',
                body: JSON.stringify({ title, content }),
            });
            return response.ok;
        } catch (err) {
            console.error('Failed to save page:', err);
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [authenticatedFetch]);

    // Fetch pages on load
    useEffect(() => {
        if (!user?.token) return;

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
    }, [user?.token, authenticatedFetch]);

    const activePage = pages.find(p => p.id === activePageId);

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
    };

    // Manual save
    const handleSave = async () => {
        if (activePage) {
            await savePageToServer(activePageId, activePage.title, activePage.content);
        }
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
                onSelectPage={(pageId) => { setActiveView('pages'); openPage(pageId); }}
                onDeletePage={deletePage}
                onReorder={handleReorder}
                user={user}
                onLogout={logout}
                activeView={activeView}
                onViewChange={(view) => { setActiveView(view); if (view === 'tasks') setViewMode('list'); }}
            />

            <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10 p-6">

                {/* TASKS VIEW */}
                {activeView === 'tasks' && (
                    <TaskList pages={pages} onSelectPage={(pageId) => { setActiveView('pages'); openPage(pageId); }} />
                )}

                {/* LIST VIEW (Pages) */}
                {activeView === 'pages' && viewMode === 'list' && (
                    <div className="flex flex-col h-full">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-6">
                            <h1 className="text-3xl font-semibold text-white">My Pages</h1>
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
                            {pages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-6">
                                    <div className="w-20 h-20 rounded-2xl bg-slate-800/50 flex items-center justify-center border border-white/5">
                                        <svg className="w-10 h-10 text-cyan-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <p className="text-lg">No pages yet. Create your first one!</p>
                                </div>
                            ) : displayMode === 'cards' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {pages.map(page => (
                                        <div
                                            key={page.id}
                                            onClick={() => openPage(page.id)}
                                            className="group p-5 rounded-xl bg-slate-900/80 backdrop-blur border border-white/10 hover:border-cyan-500/30 cursor-pointer transition-all hover:shadow-lg hover:shadow-cyan-500/5"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors truncate flex-1">
                                                    {page.title || 'Untitled'}
                                                </h3>
                                                <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
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
                                    {pages.map(page => (
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
                                <button
                                    onClick={activePageId && editMode ? handleSave : toggleEditMode}
                                    className="px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all font-medium"
                                >
                                    {editMode ? 'Save Changes' : 'Edit Page'}
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
                )}
            </main>
        </div>
    );
}

export default Dashboard;

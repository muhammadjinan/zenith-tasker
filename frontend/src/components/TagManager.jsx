import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const TAG_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
    '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

const TagManager = ({ pageId, taskId }) => {
    const { user } = useAuth();
    const [allTags, setAllTags] = useState([]);
    const [assignedTags, setAssignedTags] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('#6366f1');
    const [showCreate, setShowCreate] = useState(false);

    const authFetch = useCallback(async (url, options = {}) => {
        return fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.token}`,
                ...options.headers,
            },
        });
    }, [user?.token]);

    // Fetch all user tags and assigned tags
    const fetchTags = useCallback(async () => {
        try {
            const [allRes, assignedRes] = await Promise.all([
                authFetch(`${API_URL}/tags`),
                pageId
                    ? authFetch(`${API_URL}/tags/page/${pageId}`)
                    : taskId
                        ? authFetch(`${API_URL}/tags/task/${taskId}`)
                        : Promise.resolve({ ok: true, json: () => [] }),
            ]);
            if (allRes.ok) setAllTags(await allRes.json());
            if (assignedRes.ok) {
                const data = typeof assignedRes.json === 'function' ? await assignedRes.json() : assignedRes;
                setAssignedTags(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Failed to fetch tags:', err);
        }
    }, [pageId, taskId, authFetch]);

    useEffect(() => { fetchTags(); }, [fetchTags]);

    // Create new tag
    const createTag = async () => {
        if (!newTagName.trim()) return;
        try {
            const res = await authFetch(`${API_URL}/tags`, {
                method: 'POST',
                body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
            });
            if (res.ok) {
                const tag = await res.json();
                setAllTags(prev => [...prev, tag]);
                setNewTagName('');
                setShowCreate(false);
                // Auto-assign the new tag
                await assignTag(tag.id);
            }
        } catch (err) {
            console.error('Failed to create tag:', err);
        }
    };

    // Assign tag
    const assignTag = async (tagId) => {
        const endpoint = pageId ? `page/${pageId}` : `task/${taskId}`;
        try {
            await authFetch(`${API_URL}/tags/${endpoint}`, {
                method: 'POST',
                body: JSON.stringify({ tagId }),
            });
            fetchTags();
        } catch (err) {
            console.error('Failed to assign tag:', err);
        }
    };

    // Remove tag
    const removeTag = async (tagId) => {
        const endpoint = pageId ? `page/${pageId}/${tagId}` : `task/${taskId}/${tagId}`;
        try {
            await authFetch(`${API_URL}/tags/${endpoint}`, { method: 'DELETE' });
            setAssignedTags(prev => prev.filter(t => t.id !== tagId));
        } catch (err) {
            console.error('Failed to remove tag:', err);
        }
    };

    // Delete tag entirely
    const deleteTag = async (tagId) => {
        try {
            await authFetch(`${API_URL}/tags/${tagId}`, { method: 'DELETE' });
            setAllTags(prev => prev.filter(t => t.id !== tagId));
            setAssignedTags(prev => prev.filter(t => t.id !== tagId));
        } catch (err) {
            console.error('Failed to delete tag:', err);
        }
    };

    const unassignedTags = allTags.filter(t => !assignedTags.find(a => a.id === t.id));

    return (
        <div className="relative">
            {/* Assigned Tags */}
            <div className="flex flex-wrap items-center gap-1.5">
                {assignedTags.map(tag => (
                    <span
                        key={tag.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border cursor-default group"
                        style={{
                            backgroundColor: `${tag.color}20`,
                            color: tag.color,
                            borderColor: `${tag.color}40`,
                        }}
                    >
                        {tag.name}
                        <button
                            onClick={() => removeTag(tag.id)}
                            className="opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded-full p-0.5 transition-opacity"
                        >
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </span>
                ))}
                <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 border border-dashed border-slate-700 hover:border-cyan-500/30 transition-all"
                >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Tag
                </button>
            </div>

            {/* Dropdown */}
            {showDropdown && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-slate-900 border border-white/10 rounded-xl shadow-2xl shadow-black/50 z-50 overflow-hidden">
                    {/* Existing Tags */}
                    <div className="max-h-40 overflow-y-auto py-1">
                        {unassignedTags.length === 0 && !showCreate && (
                            <div className="px-3 py-2 text-xs text-slate-500">No more tags to add</div>
                        )}
                        {unassignedTags.map(tag => (
                            <button
                                key={tag.id}
                                onClick={() => { assignTag(tag.id); setShowDropdown(false); }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5 transition-all group"
                            >
                                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }}></span>
                                <span className="flex-1 text-left truncate">{tag.name}</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteTag(tag.id); }}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-600 hover:text-red-400 transition-all"
                                >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </button>
                        ))}
                    </div>

                    {/* Create New Tag */}
                    <div className="border-t border-white/5 p-2">
                        {showCreate ? (
                            <div className="space-y-2">
                                <input
                                    autoFocus
                                    value={newTagName}
                                    onChange={(e) => setNewTagName(e.target.value)}
                                    placeholder="Tag name"
                                    className="w-full bg-slate-800/50 text-sm text-white rounded-lg px-2.5 py-1.5 border border-white/10 outline-none focus:border-cyan-500/30"
                                    onKeyDown={(e) => { if (e.key === 'Enter') createTag(); }}
                                />
                                <div className="flex gap-1">
                                    {TAG_COLORS.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setNewTagColor(c)}
                                            className={`w-5 h-5 rounded-full transition-all ${newTagColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900' : ''}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={createTag} className="flex-1 px-2 py-1 text-xs rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30">
                                        Create
                                    </button>
                                    <button onClick={() => setShowCreate(false)} className="px-2 py-1 text-xs rounded-lg text-slate-500 hover:text-white">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowCreate(true)}
                                className="w-full text-left text-xs text-slate-500 hover:text-cyan-400 px-1 py-1 transition-colors"
                            >
                                + Create new tag
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TagManager;

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CommentsSection = ({ pageId }) => {
    const { user, getProfilePicUrl } = useAuth();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState('');
    const [loading, setLoading] = useState(true);

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

    // Fetch comments
    const fetchComments = useCallback(async () => {
        if (!pageId) return;
        try {
            const res = await authFetch(`${API_URL}/comments/${pageId}`);
            if (res.ok) {
                const data = await res.json();
                setComments(data);
            }
        } catch (err) {
            console.error('Failed to fetch comments:', err);
        } finally {
            setLoading(false);
        }
    }, [pageId, authFetch]);

    useEffect(() => { fetchComments(); }, [fetchComments]);

    // Add comment
    const addComment = async () => {
        if (!newComment.trim()) return;
        try {
            const res = await authFetch(`${API_URL}/comments`, {
                method: 'POST',
                body: JSON.stringify({ page_id: pageId, content: newComment.trim() }),
            });
            if (res.ok) {
                const comment = await res.json();
                setComments(prev => [...prev, comment]);
                setNewComment('');
            }
        } catch (err) {
            console.error('Failed to add comment:', err);
        }
    };

    // Edit comment
    const saveEdit = async (commentId) => {
        if (!editText.trim()) return;
        try {
            const res = await authFetch(`${API_URL}/comments/${commentId}`, {
                method: 'PUT',
                body: JSON.stringify({ content: editText.trim() }),
            });
            if (res.ok) {
                setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: editText.trim(), updated_at: new Date().toISOString() } : c));
                setEditingId(null);
                setEditText('');
            }
        } catch (err) {
            console.error('Failed to edit comment:', err);
        }
    };

    // Delete comment
    const deleteComment = async (commentId) => {
        if (!window.confirm('Delete this comment?')) return;
        try {
            await authFetch(`${API_URL}/comments/${commentId}`, { method: 'DELETE' });
            setComments(prev => prev.filter(c => c.id !== commentId));
        } catch (err) {
            console.error('Failed to delete comment:', err);
        }
    };

    // Time ago
    const timeAgo = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    return (
        <div className="mt-6 border-t border-white/5 pt-6">
            <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <h3 className="text-sm font-semibold text-slate-300">
                    Comments {comments.length > 0 && <span className="text-slate-500 font-normal">({comments.length})</span>}
                </h3>
            </div>

            {/* Comment List */}
            <div className="space-y-4 mb-4">
                {comments.map(comment => (
                    <div key={comment.id} className="flex gap-3 group">
                        {/* Avatar */}
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300 flex-shrink-0 mt-0.5">
                            {comment.profile_pic ? (
                                <img src={getProfilePicUrl(comment.profile_pic)} alt="" className="w-full h-full object-cover" />
                            ) : (
                                comment.username?.charAt(0)?.toUpperCase() || 'U'
                            )}
                        </div>

                        {/* Comment Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-200">{comment.username}</span>
                                <span className="text-xs text-slate-600">{timeAgo(comment.created_at)}</span>
                                {comment.created_at !== comment.updated_at && (
                                    <span className="text-xs text-slate-600 italic">(edited)</span>
                                )}
                            </div>

                            {editingId === comment.id ? (
                                <div className="mt-1 space-y-1">
                                    <textarea
                                        autoFocus
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        className="w-full bg-slate-800/50 text-sm text-white rounded-lg px-3 py-2 border border-white/10 outline-none focus:border-cyan-500/30 resize-none"
                                        rows={2}
                                    />
                                    <div className="flex gap-1">
                                        <button onClick={() => saveEdit(comment.id)} className="px-2 py-0.5 text-xs rounded bg-cyan-500/20 text-cyan-400">Save</button>
                                        <button onClick={() => setEditingId(null)} className="px-2 py-0.5 text-xs rounded text-slate-500">Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 mt-0.5 whitespace-pre-wrap">{comment.content}</p>
                            )}

                            {/* Actions (own comments only) */}
                            {comment.user_id === user?.id && editingId !== comment.id && (
                                <div className="flex gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => { setEditingId(comment.id); setEditText(comment.content); }}
                                        className="text-xs text-slate-600 hover:text-cyan-400 transition-colors"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => deleteComment(comment.id)}
                                        className="text-xs text-slate-600 hover:text-red-400 transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Comment */}
            <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300 flex-shrink-0">
                    {user?.profile_pic ? (
                        <img src={getProfilePicUrl(user.profile_pic)} alt="" className="w-full h-full object-cover" />
                    ) : (
                        user?.username?.charAt(0)?.toUpperCase() || 'U'
                    )}
                </div>
                <div className="flex-1 flex gap-2">
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(); } }}
                        placeholder="Add a comment..."
                        className="flex-1 bg-slate-800/30 text-sm text-white rounded-lg px-3 py-2 border border-white/10 outline-none focus:border-cyan-500/30 placeholder-slate-600"
                    />
                    <button
                        onClick={addComment}
                        disabled={!newComment.trim()}
                        className="px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
                    >
                        Post
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CommentsSection;

import React from 'react';
import DOMPurify from 'dompurify';
import 'react-quill/dist/quill.snow.css';

const CATEGORIES = {
    'general': { label: 'General', icon: '📁' },
    'pages': { label: 'Pages', icon: '📄' },
    'tasks': { label: 'Tasks', icon: '✅' },
    'finance': { label: 'Finance', icon: '💰' }
};

const TYPES = {
    'how_to': { label: 'How to use' },
    'feature': { label: 'Features' },
    'new_feature': { label: 'New Features' },
    'upcoming': { label: 'Upcoming features' }
};

const ArticleViewer = ({ article, onBack, onEdit, onDelete }) => {
    if (!article) return null;

    const catInfo = CATEGORIES[article.category] || { label: article.category, icon: '📁' };
    const typeInfo = TYPES[article.type] || { label: article.type };

    const formattedDate = new Date(article.updated_at || article.created_at).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="flex flex-col h-full bg-slate-900 overflow-hidden relative">
            {/* Header Area */}
            <div className="w-full max-w-4xl mx-auto px-6 pt-6 pb-4 shrink-0 border-b border-white/10">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors mb-6"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Knowledge Base
                </button>

                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-white/5 shadow-inner text-sm font-medium text-slate-300">
                                <span>{catInfo.icon}</span>
                                {catInfo.label}
                            </span>
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-sm font-medium">
                                {typeInfo.label}
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                            {article.title}
                        </h1>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            By <span className="font-medium text-slate-300">{article.author_name || 'Unknown'}</span>
                            <span className="mx-2">&bull;</span>
                            {formattedDate}
                        </div>
                    </div>

                    {(onEdit || onDelete) && (
                        <div className="flex items-center gap-3 shrink-0">
                            {onEdit && (
                                <button
                                    onClick={onEdit}
                                    className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-white border border-white/10 transition-all flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit
                                </button>
                            )}
                            {onDelete && (
                                <button
                                    onClick={onDelete}
                                    className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-all flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Reading Pane */}
            <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
                <div className="max-w-4xl mx-auto p-6 md:p-8 pb-32">
                    <div className="ql-snow">
                        <div
                            className="ql-editor text-slate-300 text-lg leading-relaxed
                                [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mb-6 [&_h1]:mt-8
                                [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mb-5 [&_h2]:mt-8 [&_h2]:border-b [&_h2]:border-white/10 [&_h2]:pb-2
                                [&_h3]:text-2xl [&_h3]:font-semibold [&_h3]:text-slate-100 [&_h3]:mb-4 [&_h3]:mt-6
                                [&_p]:mb-4
                                [&_a]:text-indigo-400 [&_a]:underline hover:[&_a]:text-indigo-300
                                [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-500/50 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-400 [&_blockquote]:my-6
                                [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-white/10 [&_pre]:text-sm [&_pre]:mb-6 [&_pre]:text-slate-300
                                [&_code]:bg-slate-800/50 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-indigo-300 [&_code]:text-sm
                                [&_img]:max-w-full [&_img]:rounded-xl [&_img]:border [&_img]:border-white/10 [&_img]:my-6
                                [&_li]:mb-1
                            "
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content || '<p class="text-slate-500 italic">No content written yet.</p>') }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ArticleViewer;

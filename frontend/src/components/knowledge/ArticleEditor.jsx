import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const ArticleEditor = ({ article, onSave, onCancel, categories, types }) => {
    const [title, setTitle] = useState(article?.title || '');
    const [content, setContent] = useState(article?.content || '');
    const [type, setType] = useState(article?.type || 'how_to');
    const [category, setCategory] = useState(article?.category || 'general');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!title.trim()) {
            alert('Please enter a title for the article.');
            return;
        }

        setIsSaving(true);
        try {
            await onSave({
                id: article?.id,
                title: title.trim(),
                content,
                type,
                category
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 overflow-hidden relative">
            <div className="w-full max-w-4xl mx-auto flex flex-col h-full p-6">

                {/* Header Actions */}
                <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/10 shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-white">
                            {article ? 'Edit Article' : 'New Article'}
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">
                            Publish updates or documentation to the Knowledge Base.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onCancel}
                            disabled={isSaving}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-5 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                        >
                            {isSaving ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                            {article ? 'Save Changes' : 'Publish Article'}
                        </button>
                    </div>
                </div>

                {/* Form Body */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="space-y-6 pb-20">
                        {/* Title Input */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Article Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="E.g., How to set up a new project..."
                                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-lg font-medium"
                            />
                        </div>

                        {/* Metadata Row */}
                        <div className="flex flex-col sm:flex-row gap-6">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-400 mb-2">Category</label>
                                <div className="relative">
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="general">General</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.label}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                        </svg>
                                    </div>
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-400 mb-2">Article Type</label>
                                <div className="relative">
                                    <select
                                        value={type}
                                        onChange={(e) => setType(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all appearance-none cursor-pointer"
                                    >
                                        {types.map(t => (
                                            <option key={t.id} value={t.id}>{t.label}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-indigo-400">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                        </svg>
                                    </div>
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Rich Text Editor */}
                        <div className="h-[500px] flex flex-col bg-slate-800/30 rounded-xl border border-white/10 overflow-hidden">
                            <ReactQuill
                                theme="snow"
                                value={content}
                                onChange={setContent}
                                className="h-full flex-1"
                                placeholder="Start writing your article..."
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
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ArticleEditor;

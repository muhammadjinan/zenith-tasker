import React, { useState, useRef, useEffect } from 'react';

const WidgetToolbar = ({ editMode, onToggleEditMode, onResetLayout, availableWidgets, onAddWidget }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap items-center justify-end gap-2">
                {/* Edit Mode Toggle */}
                <button
                    onClick={onToggleEditMode}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${editMode
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/10'
                        : 'bg-slate-800/80 text-slate-400 hover:text-white border border-white/10 hover:border-white/20'
                        }`}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {editMode ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        )}
                        {!editMode && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />}
                    </svg>
                    {editMode ? 'Done' : 'Customize'}
                </button>

                {/* Add Widget Dropdown */}
                {editMode && availableWidgets.length > 0 && (
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-slate-800/80 text-slate-400 hover:text-white rounded-xl border border-white/10 hover:border-white/20 transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Widget
                            <svg className={`w-3 h-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {dropdownOpen && (
                            <div className="absolute top-full left-0 mt-2 w-56 py-2 bg-slate-800 border border-white/10 rounded-xl shadow-2xl z-50">
                                {availableWidgets.map(w => (
                                    <button
                                        key={w.id}
                                        onClick={() => { onAddWidget(w.id); setDropdownOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        {w.icon}
                                        <span>{w.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Reset Layout */}
                {editMode && (
                    <button
                        onClick={onResetLayout}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-slate-800/80 text-slate-400 hover:text-white rounded-xl border border-white/10 hover:border-white/20 transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reset
                    </button>
                )}
            </div>

            {editMode && (
                <p className="text-xs text-slate-500">
                    Drag to move · Corner handles to resize · ✕ to remove
                </p>
            )}
        </div>
    );
};

export default WidgetToolbar;

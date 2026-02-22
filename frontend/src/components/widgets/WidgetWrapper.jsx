import React from 'react';

const WidgetWrapper = ({ title, icon, editMode, onRemove, children, badge, headerActions }) => {
    return (
        <div className="h-full flex flex-col rounded-2xl bg-slate-900/80 backdrop-blur border border-white/10 group/widget">
            {/* Widget Header */}
            <div className={`flex items-center justify-between px-5 py-3 border-b border-white/5 rounded-t-2xl ${editMode ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                <div className="flex items-center gap-2 min-w-0">
                    {editMode && (
                        <svg className="w-4 h-4 text-slate-500 flex-shrink-0 drag-handle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                    )}
                    {icon}
                    <h3 className="text-sm font-semibold text-white truncate">{title}</h3>
                    {badge && (
                        <span className="text-[10px] font-normal text-indigo-400/60 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 flex-shrink-0">
                            {badge}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {headerActions}
                    {editMode && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
                            className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all flex-shrink-0"
                            title="Remove widget"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Widget Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 rounded-b-2xl">
                {children}
            </div>
        </div>
    );
};

export default WidgetWrapper;

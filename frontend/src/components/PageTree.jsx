import React, { useState, useCallback } from 'react';

/**
 * PageTreeItem - A single page node in the tree with collapsible children.
 */
const PageTreeItem = ({ page, pages, activePageId, onSelectPage, onDeletePage, onCreateSubPage, depth = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    // Get direct children of this page
    const children = pages.filter(p => p.parent_id === page.id);
    const hasChildren = children.length > 0;
    const isActive = activePageId === page.id;

    return (
        <li>
            <div
                onClick={() => onSelectPage(page.id)}
                className={`
          group flex items-center gap-1.5 py-1.5 pr-2 rounded-lg cursor-pointer
          transition-all duration-150 text-sm
          ${isActive
                        ? 'bg-cyan-500/10 text-cyan-400'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}
        `}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
            >
                {/* Expand/Collapse Toggle */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                    }}
                    className={`w-4 h-4 flex items-center justify-center rounded hover:bg-white/10 transition-all flex-shrink-0 ${hasChildren ? 'opacity-100' : 'opacity-0'}`}
                    tabIndex={-1}
                >
                    <svg
                        className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>

                {/* Page Icon */}
                <span className="flex-shrink-0 text-sm">{page.icon || '📄'}</span>

                {/* Page Title */}
                <span className="truncate flex-1 font-medium">{page.title || 'Untitled'}</span>

                {/* Action Buttons - shown on hover */}
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity flex-shrink-0">
                    {/* Add Sub-page */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onCreateSubPage(page.id);
                            setIsExpanded(true);
                        }}
                        className="p-1 rounded hover:bg-cyan-500/20 text-slate-500 hover:text-cyan-400 transition-all"
                        title="Add sub-page"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>

                    {/* Delete */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            const msg = hasChildren
                                ? 'This page has sub-pages. Deleting it will also delete all its sub-pages. Are you sure?'
                                : 'Are you sure you want to delete this page?';
                            if (window.confirm(msg)) {
                                onDeletePage(page.id);
                            }
                        }}
                        className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all"
                        title="Delete page"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Children (recursive) */}
            {hasChildren && isExpanded && (
                <ul className="list-none m-0 p-0">
                    {children
                        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
                        .map(child => (
                            <PageTreeItem
                                key={child.id}
                                page={child}
                                pages={pages}
                                activePageId={activePageId}
                                onSelectPage={onSelectPage}
                                onDeletePage={onDeletePage}
                                onCreateSubPage={onCreateSubPage}
                                depth={depth + 1}
                            />
                        ))}
                </ul>
            )}
        </li>
    );
};

/**
 * PageTree - Renders pages as a collapsible tree structure.
 * Only top-level pages (parent_id === null) are rendered at root,
 * and children are nested recursively.
 */
const PageTree = ({ pages, activePageId, onSelectPage, onDeletePage, onCreateSubPage }) => {
    // Get only root-level pages (no parent)
    const rootPages = pages
        .filter(p => !p.parent_id)
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    if (rootPages.length === 0) {
        return (
            <div className="px-4 py-3 text-xs text-slate-500 italic">
                No pages yet
            </div>
        );
    }

    return (
        <ul className="list-none m-0 p-0 space-y-0.5">
            {rootPages.map(page => (
                <PageTreeItem
                    key={page.id}
                    page={page}
                    pages={pages}
                    activePageId={activePageId}
                    onSelectPage={onSelectPage}
                    onDeletePage={onDeletePage}
                    onCreateSubPage={onCreateSubPage}
                    depth={0}
                />
            ))}
        </ul>
    );
};

export default PageTree;

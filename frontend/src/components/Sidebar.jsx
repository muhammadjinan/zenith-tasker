import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '../context/AuthContext';
import ProfileModal from './ProfileModal';
import AdminPanel from './AdminPanel';

const SortablePageItem = ({ page, activePageId, onSelectPage, onDeletePage }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  const isActive = activePageId === page.id;

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onSelectPage(page.id)}
      className={`
        group flex justify-between items-center px-4 py-3 mb-1 rounded-lg cursor-pointer
        transition-all duration-200
        ${isActive
          ? 'bg-cyan-500/10 text-cyan-400 border-l-[3px] border-cyan-400'
          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}
      `}
    >
      <div className="flex items-center gap-3 overflow-hidden w-full">
        <svg className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>

        <span className="truncate font-medium text-sm flex-1">{page.title || 'Untitled'}</span>

        <span className="opacity-0 group-hover:opacity-40 cursor-grab active:cursor-grabbing p-1 transition-opacity">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </span>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm('Are you sure you want to delete this page?')) {
            onDeletePage(page.id);
          }
        }}
        className="opacity-0 group-hover:opacity-100 ml-2 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all"
        title="Delete Page"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </li>
  );
};

const Sidebar = ({ pages, tasks = [], onCreatePage, activePageId, onSelectPage, onDeletePage, onReorder, user, onLogout, activeView, onViewChange, taskFilter = 'all', onTaskFilterChange, pagesFilter = 'all', onPagesFilterChange }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isPagesExpanded, setIsPagesExpanded] = useState(activeView === 'pages');
  const [isTasksExpanded, setIsTasksExpanded] = useState(activeView === 'tasks');
  const { getProfilePicUrl } = useAuth();

  // Compute counts for subtabs
  const taskCounts = {
    all: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inprogress: tasks.filter(t => t.status === 'in_progress').length,
    done: tasks.filter(t => t.status === 'completed' || t.status === 'done').length,
    overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed' && t.status !== 'done').length,
  };

  const pageCounts = {
    all: pages.length,
    recent: Math.min(pages.length, 5), // Recently edited shows up to 5
    favorites: pages.filter(p => p.is_favorite).length,
  };

  // Keep sections expanded when their view is active (mutually exclusive)
  // Also collapse the other section to prevent both being expanded
  useEffect(() => {
    if (activeView === 'tasks') {
      setIsTasksExpanded(true);
      setIsPagesExpanded(false);
    } else if (activeView === 'pages') {
      setIsPagesExpanded(true);
      setIsTasksExpanded(false);
    }
  }, [activeView]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = pages.findIndex((p) => p.id === active.id);
      const newIndex = pages.findIndex((p) => p.id === over.id);
      onReorder(arrayMove(pages, oldIndex, newIndex));
    }
  };

  const profilePicUrl = getProfilePicUrl(user?.profile_pic);

  return (
    <>
      <div className="w-64 h-screen flex flex-col relative z-20 bg-slate-950/95 border-r border-white/5">
        {/* Brand */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <span className="text-white font-bold text-lg">Z</span>
            </div>
            <h1 className="text-xl font-semibold text-white tracking-tight">
              Zenith
            </h1>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {/* Admin Section (only for admins) */}
          {user?.is_admin && (
            <div className="mb-4">
              <div className="flex items-center gap-2 px-3 py-2 mb-2">
                <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-sm font-medium text-indigo-400">Admin</span>
              </div>
              <button
                onClick={() => setIsAdminOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-400 hover:bg-indigo-500/10 hover:text-indigo-300 transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                <span className="text-sm font-medium">Manage Users</span>
              </button>
            </div>
          )}

          {/* Home Button */}
          <div className="mb-2">
            <button
              onClick={() => onViewChange('home')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${activeView === 'home'
                ? 'bg-cyan-500/10 text-cyan-400 border-l-[3px] border-cyan-400'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-sm font-medium">Home</span>
            </button>
          </div>

          {/* Tasks Section */}
          <div className="mb-1">
            <div className="flex items-center px-3 py-2">
              <button
                onClick={() => setIsTasksExpanded(!isTasksExpanded)}
                className={`flex-1 flex items-center gap-2 cursor-pointer transition-colors rounded-lg hover:bg-white/5 -ml-2 pl-2 py-1 ${activeView === 'tasks' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <svg
                  className={`w-3 h-3 transition-transform duration-200 ${isTasksExpanded ? 'rotate-90' : ''} ${activeView === 'tasks' ? 'text-cyan-400' : 'text-slate-500'
                    }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <svg className={`w-4 h-4 ${activeView === 'tasks' ? 'text-cyan-400' : 'text-cyan-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                </svg>
                <span className={`text-sm font-medium ${activeView === 'tasks' ? 'text-cyan-400' : 'text-slate-400'}`}>Tasks</span>
              </button>
            </div>

            {isTasksExpanded && (
              <div className="space-y-0.5 ml-2">
                <button
                  onClick={() => onTaskFilterChange && onTaskFilterChange('all')}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${activeView === 'tasks' && taskFilter === 'all'
                    ? 'bg-cyan-500/10 text-cyan-400 border-l-[3px] border-cyan-400'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  <span className="text-sm font-medium">All Tasks</span>
                  <span className="ml-auto text-xs text-slate-500">{taskCounts.all}</span>
                </button>

                <button
                  onClick={() => onTaskFilterChange && onTaskFilterChange('todo')}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${activeView === 'tasks' && taskFilter === 'todo'
                    ? 'bg-cyan-500/10 text-cyan-400 border-l-[3px] border-cyan-400'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                >
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="text-sm font-medium">To Do</span>
                  <span className="ml-auto text-xs text-slate-500">{taskCounts.todo}</span>
                </button>

                <button
                  onClick={() => onTaskFilterChange && onTaskFilterChange('inprogress')}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${activeView === 'tasks' && taskFilter === 'inprogress'
                    ? 'bg-cyan-500/10 text-cyan-400 border-l-[3px] border-cyan-400'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                >
                  <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">In Progress</span>
                  <span className="ml-auto text-xs text-slate-500">{taskCounts.inprogress}</span>
                </button>

                <button
                  onClick={() => onTaskFilterChange && onTaskFilterChange('done')}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${activeView === 'tasks' && taskFilter === 'done'
                    ? 'bg-cyan-500/10 text-cyan-400 border-l-[3px] border-cyan-400'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                >
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">Done</span>
                  <span className="ml-auto text-xs text-slate-500">{taskCounts.done}</span>
                </button>

                <button
                  onClick={() => onTaskFilterChange && onTaskFilterChange('overdue')}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${activeView === 'tasks' && taskFilter === 'overdue'
                    ? 'bg-cyan-500/10 text-cyan-400 border-l-[3px] border-cyan-400'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                >
                  <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-sm font-medium">Overdue</span>
                  <span className="ml-auto text-xs text-slate-500">{taskCounts.overdue}</span>
                </button>
              </div>
            )}
          </div>

          {/* Pages Header - Collapsible */}
          <div className="flex items-center px-3 py-2">
            <button
              onClick={() => setIsPagesExpanded(!isPagesExpanded)}
              className={`flex-1 flex items-center gap-2 cursor-pointer transition-colors rounded-lg hover:bg-white/5 -ml-2 pl-2 py-1 ${activeView === 'pages' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <svg
                className={`w-3 h-3 transition-transform duration-200 ${isPagesExpanded ? 'rotate-90' : ''} ${activeView === 'pages' ? 'text-cyan-400' : 'text-slate-500'
                  }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <svg className={`w-4 h-4 ${activeView === 'pages' ? 'text-cyan-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className={`text-sm font-medium ${activeView === 'pages' ? 'text-cyan-400' : 'text-slate-400'}`}>Pages</span>
            </button>
            <button
              onClick={onCreatePage}
              className="w-6 h-6 flex items-center justify-center rounded-md text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all ml-2"
              title="New Page"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* Pages Subtabs - Collapsible */}
          {isPagesExpanded && (
            <div className="space-y-0.5 ml-2">
              <button
                onClick={() => onPagesFilterChange && onPagesFilterChange('all')}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${activeView === 'pages' && pagesFilter === 'all'
                  ? 'bg-cyan-500/10 text-cyan-400 border-l-[3px] border-cyan-400'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="text-sm font-medium">All Pages</span>
                <span className="ml-auto text-xs text-slate-500">{pages.length}</span>
              </button>

              <button
                onClick={() => onPagesFilterChange && onPagesFilterChange('recent')}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${activeView === 'pages' && pagesFilter === 'recent'
                  ? 'bg-cyan-500/10 text-cyan-400 border-l-[3px] border-cyan-400'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
              >
                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">Recently Edited</span>
                <span className="ml-auto text-xs text-slate-500">{pageCounts.recent}</span>
              </button>

              <button
                onClick={() => onPagesFilterChange && onPagesFilterChange('favorites')}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${activeView === 'pages' && pagesFilter === 'favorites'
                  ? 'bg-cyan-500/10 text-cyan-400 border-l-[3px] border-cyan-400'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
              >
                <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <span className="text-sm font-medium">Favorites</span>
                <span className="ml-auto text-xs text-slate-500">{pageCounts.favorites}</span>
              </button>
            </div>
          )}

          {/* Settings Section (for all users) */}
          <div className="mt-4 pt-4 border-t border-white/5">
            <button
              onClick={() => setIsProfileOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm font-medium">Settings</span>
            </button>

            {/* Contact Admin - for non-admin users */}
            {!user?.is_admin && (
              <a
                href="mailto:designbyjinan@gmail.com?subject=Zenith Tasker Support"
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium">Contact Admin</span>
              </a>
            )}
          </div>
        </nav>

        {/* User Profile Footer - Only logout */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            {/* Profile Picture */}
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300">
              {profilePicUrl ? (
                <img src={profilePicUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                user?.username?.charAt(0)?.toUpperCase() || 'U'
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{user?.username || 'User'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email || 'No email'}</p>
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all"
              title="Logout"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      {/* Admin Panel Modal */}
      <AdminPanel isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
    </>
  );
};

export default Sidebar;

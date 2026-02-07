import React, { useState, useRef, useEffect } from 'react';

const TaskCard = ({ task, onUpdate, onDelete, onToggleSubtask, onAddSubtask, onDeleteSubtask, pages, showStatus = true, onDragStart, onDragEnd }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(task.title);
    const [editDescription, setEditDescription] = useState(task.description || '');
    const [editStatus, setEditStatus] = useState(task.status);
    const [editPriority, setEditPriority] = useState(task.priority);
    const [editDueDate, setEditDueDate] = useState(task.due_date ? task.due_date.split('T')[0] : '');
    const [editPageId, setEditPageId] = useState(task.page_id || '');
    const [newSubtask, setNewSubtask] = useState('');
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);

    const statusDropdownRef = useRef(null);
    const priorityDropdownRef = useRef(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
                setShowStatusDropdown(false);
            }
            if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(event.target)) {
                setShowPriorityDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const priorityColors = {
        low: 'bg-green-500/20 text-green-400 border-green-500/30',
        medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        high: 'bg-red-500/20 text-red-400 border-red-500/30'
    };

    const statusColors = {
        todo: 'bg-slate-500/20 text-slate-400',
        in_progress: 'bg-blue-500/20 text-blue-400',
        done: 'bg-green-500/20 text-green-400',
        overdue: 'bg-red-500/20 text-red-400'
    };

    const handleSave = () => {
        onUpdate(task.id, {
            title: editTitle,
            description: editDescription,
            status: editStatus,
            priority: editPriority,
            due_date: editDueDate || null,
            page_id: editPageId || null
        });
        setIsEditing(false);
    };

    const handleAddSubtask = (e) => {
        e.preventDefault();
        if (newSubtask.trim()) {
            onAddSubtask(task.id, newSubtask.trim());
            setNewSubtask('');
        }
    };

    const statusLabels = {
        todo: 'To Do',
        in_progress: 'In Progress',
        done: 'Done',
        overdue: 'Overdue'
    };

    const priorityLabels = {
        low: 'Low',
        medium: 'Medium',
        high: 'High'
    };

    const subtasks = task.subtasks || [];
    const completedCount = subtasks.filter(s => s.completed).length;
    const hasIncompleteSubtasks = subtasks.length > 0 && completedCount < subtasks.length;

    // Status change with validation
    const handleStatusChange = (newStatus) => {
        // Can't mark as Done if there are incomplete subtasks
        if (newStatus === 'done' && hasIncompleteSubtasks) {
            alert('Cannot mark as Done - there are incomplete subtasks.');
            setShowStatusDropdown(false);
            return;
        }
        onUpdate(task.id, { status: newStatus });
        setShowStatusDropdown(false);
    };

    const handlePriorityChange = (newPriority) => {
        onUpdate(task.id, { priority: newPriority });
        setShowPriorityDropdown(false);
    };

    // Drag handlers for Kanban
    const handleDragStart = (e) => {
        e.dataTransfer.setData('taskId', task.id.toString());
        e.dataTransfer.setData('currentStatus', task.status);
        e.dataTransfer.effectAllowed = 'move';
        if (onDragStart) onDragStart(task.id);
    };

    const handleDragEnd = (e) => {
        if (onDragEnd) onDragEnd();
    };

    // Check if task is overdue (past due date and not done)
    const isOverdue = task.due_date &&
        task.status !== 'done' &&
        new Date(task.due_date) < new Date();

    const displayStatus = isOverdue ? 'overdue' : task.status;

    return (
        <div
            className={`bg-slate-800/50 border border-white/10 rounded-xl overflow-hidden transition-all ${isExpanded ? 'shadow-lg' : ''}`}
            draggable={!isEditing}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            {/* Header */}
            <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => !isEditing && setIsExpanded(!isExpanded)}
            >
                {/* Status checkbox */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        // Can't mark as Done if there are incomplete subtasks
                        if (task.status !== 'done' && hasIncompleteSubtasks) {
                            alert('Cannot mark as Done - there are incomplete subtasks.');
                            return;
                        }
                        onUpdate(task.id, { status: task.status === 'done' ? 'todo' : 'done' });
                    }}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                        ${task.status === 'done'
                            ? 'bg-green-500 border-green-500'
                            : 'border-slate-500 hover:border-cyan-400'}`}
                >
                    {task.status === 'done' && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                </button>

                {/* Title & Meta */}
                <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${task.status === 'done' ? 'text-slate-500 line-through' : 'text-white'}`}>
                        {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                        {task.due_date && (
                            <span className="text-xs text-slate-500">
                                📅 {new Date(task.due_date).toLocaleDateString()}
                            </span>
                        )}
                        {task.page_title && (
                            <span className="text-xs text-cyan-400">
                                📄 {task.page_title}
                            </span>
                        )}
                        {subtasks.length > 0 && (
                            <span className="text-xs text-slate-500">
                                ☑ {completedCount}/{subtasks.length}
                            </span>
                        )}
                    </div>
                </div>

                {/* Status dropdown - only show in list view */}
                {showStatus && (
                    <div className="relative" ref={statusDropdownRef}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowStatusDropdown(!showStatusDropdown);
                                setShowPriorityDropdown(false);
                            }}
                            className={`px-2 py-0.5 text-xs rounded-full cursor-pointer hover:ring-2 hover:ring-white/20 transition-all ${statusColors[displayStatus]}`}
                            title="Click to change status"
                        >
                            {statusLabels[displayStatus]} ▼
                        </button>
                        {showStatusDropdown && (
                            <div className="absolute right-0 mt-1 w-32 bg-slate-800 border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                                {['todo', 'in_progress', 'done'].map(status => (
                                    <button
                                        key={status}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleStatusChange(status);
                                        }}
                                        className={`w-full px-3 py-2 text-left text-xs hover:bg-white/10 transition-colors flex items-center gap-2
                                            ${task.status === status ? 'bg-white/5' : ''}`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${status === 'todo' ? 'bg-slate-400' :
                                                status === 'in_progress' ? 'bg-blue-400' : 'bg-green-400'
                                            }`}></span>
                                        <span className="text-slate-300">{statusLabels[status]}</span>
                                        {status === 'done' && hasIncompleteSubtasks && (
                                            <span className="text-red-400 text-[10px]">🔒</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Priority dropdown */}
                <div className="relative" ref={priorityDropdownRef}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowPriorityDropdown(!showPriorityDropdown);
                            setShowStatusDropdown(false);
                        }}
                        className={`px-2 py-0.5 text-xs rounded-full border cursor-pointer hover:ring-2 hover:ring-white/20 transition-all ${priorityColors[task.priority]}`}
                        title="Click to change priority"
                    >
                        {priorityLabels[task.priority]} ▼
                    </button>
                    {showPriorityDropdown && (
                        <div className="absolute right-0 mt-1 w-28 bg-slate-800 border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                            {['low', 'medium', 'high'].map(priority => (
                                <button
                                    key={priority}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handlePriorityChange(priority);
                                    }}
                                    className={`w-full px-3 py-2 text-left text-xs hover:bg-white/10 transition-colors flex items-center gap-2
                                        ${task.priority === priority ? 'bg-white/5' : ''}`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${priority === 'low' ? 'bg-green-400' :
                                            priority === 'medium' ? 'bg-yellow-400' : 'bg-red-400'
                                        }`}></span>
                                    <span className="text-slate-300">{priorityLabels[priority]}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Expand icon */}
                <svg
                    className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="border-t border-white/5 p-4 space-y-4">
                    {isEditing ? (
                        /* Edit Mode */
                        <div className="space-y-3">
                            <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                                placeholder="Task title"
                            />
                            <textarea
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500 resize-none"
                                rows={3}
                                placeholder="Description (optional)"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <select
                                    value={editStatus}
                                    onChange={(e) => setEditStatus(e.target.value)}
                                    className="px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                                >
                                    <option value="todo">To Do</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="done">Done</option>
                                </select>
                                <select
                                    value={editPriority}
                                    onChange={(e) => setEditPriority(e.target.value)}
                                    className="px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="date"
                                    value={editDueDate}
                                    onChange={(e) => setEditDueDate(e.target.value)}
                                    className="px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                                />
                                <select
                                    value={editPageId}
                                    onChange={(e) => setEditPageId(e.target.value)}
                                    className="px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                                >
                                    <option value="">No linked page</option>
                                    {pages.map(p => (
                                        <option key={p.id} value={p.id}>{p.title || 'Untitled'}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSave}
                                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* View Mode */
                        <>
                            {task.description && (
                                <p className="text-slate-400 text-sm">{task.description}</p>
                            )}

                            {/* Subtasks */}
                            <div className="space-y-2">
                                <p className="text-sm text-slate-500 font-medium">Subtasks</p>
                                {subtasks.map(subtask => (
                                    <div key={subtask.id} className="flex items-center gap-2 group">
                                        <button
                                            onClick={() => onToggleSubtask(task.id, subtask.id)}
                                            className={`w-4 h-4 rounded border flex items-center justify-center transition-all
                                                ${subtask.completed
                                                    ? 'bg-green-500 border-green-500'
                                                    : 'border-slate-500 hover:border-cyan-400'}`}
                                        >
                                            {subtask.completed && (
                                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </button>
                                        <span className={`flex-1 text-sm ${subtask.completed ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                                            {subtask.title}
                                        </span>
                                        <button
                                            onClick={() => onDeleteSubtask(task.id, subtask.id)}
                                            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                                <form onSubmit={handleAddSubtask} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newSubtask}
                                        onChange={(e) => setNewSubtask(e.target.value)}
                                        className="flex-1 px-3 py-1.5 bg-slate-900/50 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                                        placeholder="Add subtask..."
                                    />
                                    <button
                                        type="submit"
                                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
                                    >
                                        Add
                                    </button>
                                </form>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-2 border-t border-white/5">
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => {
                                        if (window.confirm('Delete this task?')) {
                                            onDelete(task.id);
                                        }
                                    }}
                                    className="px-3 py-1.5 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default TaskCard;

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TaskCard from './TaskCard';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const TaskList = ({ pages, onSelectPage, externalFilter, autoAdd, onOpenSearch }) => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list'); // 'list' or 'kanban'
    const [filter, setFilter] = useState(externalFilter || 'all'); // 'all', 'todo', 'in_progress', 'done', 'overdue', 'pending'
    const [sortBy, setSortBy] = useState('created_desc'); // default to newest first
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [isAddingTask, setIsAddingTask] = useState(false);
    const [mobileKanbanColumn, setMobileKanbanColumn] = useState(null); // which status popup is open on mobile
    const [activeCardIndex, setActiveCardIndex] = useState(0); // which card is on top in the 3D stack
    const touchStartY = useRef(null);
    const touchDelta = useRef(0);

    // Auto-open add task form if requested
    useEffect(() => {
        if (autoAdd) setIsAddingTask(true);
    }, [autoAdd]);

    // Sync with external filter when it changes
    useEffect(() => {
        if (externalFilter) {
            // Map sidebar filter values to TaskList filter values
            const filterMap = {
                'all': 'all',
                'todo': 'todo',
                'inprogress': 'in_progress',
                'done': 'done',
                'overdue': 'overdue',
                'pending': 'pending'
            };
            setFilter(filterMap[externalFilter] || 'all');
        }
    }, [externalFilter]);

    const fetchTasks = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/tasks`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTasks(data);
            }
        } catch (err) {
            console.error('Error fetching tasks:', err);
        } finally {
            setLoading(false);
        }
    }, [user.token]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const createTask = async (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        try {
            const res = await fetch(`${API_URL}/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ title: newTaskTitle.trim() })
            });
            if (res.ok) {
                const newTask = await res.json();
                setTasks(prev => [newTask, ...prev]);
                setNewTaskTitle('');
                setIsAddingTask(false);
            }
        } catch (err) {
            console.error('Error creating task:', err);
        }
    };

    const updateTask = async (taskId, updates) => {
        try {
            const res = await fetch(`${API_URL}/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                // Refetch all tasks to get updated data with subtasks
                fetchTasks();
            }
        } catch (err) {
            console.error('Error updating task:', err);
        }
    };

    const deleteTask = async (taskId) => {
        try {
            const res = await fetch(`${API_URL}/tasks/${taskId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (res.ok) {
                setTasks(prev => prev.filter(t => t.id !== taskId));
            }
        } catch (err) {
            console.error('Error deleting task:', err);
        }
    };

    const toggleSubtask = async (taskId, subtaskId) => {
        try {
            const res = await fetch(`${API_URL}/tasks/${taskId}/subtasks/${subtaskId}/toggle`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (res.ok) {
                // Find the task and calculate new status based on subtasks
                const task = tasks.find(t => t.id === taskId);
                if (task && task.subtasks && task.subtasks.length > 0) {
                    // Find the toggled subtask and simulate its new state
                    const toggledSubtask = task.subtasks.find(s => s.id === subtaskId);
                    const newCompletedState = !toggledSubtask?.completed;

                    // Calculate completion after this toggle
                    const completedAfterToggle = task.subtasks.filter(s =>
                        s.id === subtaskId ? newCompletedState : s.completed
                    ).length;
                    const totalSubtasks = task.subtasks.length;

                    // Determine new status
                    let newStatus = task.status;
                    if (completedAfterToggle === totalSubtasks) {
                        newStatus = 'done'; // All subtasks complete
                    } else if (completedAfterToggle > 0) {
                        newStatus = 'in_progress'; // Some subtasks complete
                    } else if (task.status === 'done') {
                        newStatus = 'todo'; // Was done but now has incomplete subtasks
                    }

                    // Update task status if changed
                    if (newStatus !== task.status) {
                        await fetch(`${API_URL}/tasks/${taskId}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${user.token}`
                            },
                            body: JSON.stringify({ status: newStatus })
                        });
                    }
                }
                fetchTasks(); // Refresh to get updated subtasks
            }
        } catch (err) {
            console.error('Error toggling subtask:', err);
        }
    };

    const addSubtask = async (taskId, title) => {
        try {
            const res = await fetch(`${API_URL}/tasks/${taskId}/subtasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ title })
            });
            if (res.ok) {
                fetchTasks(); // Refresh to get updated subtasks
            }
        } catch (err) {
            console.error('Error adding subtask:', err);
        }
    };

    const deleteSubtask = async (taskId, subtaskId) => {
        try {
            const res = await fetch(`${API_URL}/tasks/${taskId}/subtasks/${subtaskId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (res.ok) {
                fetchTasks(); // Refresh to get updated subtasks
            }
        } catch (err) {
            console.error('Error deleting subtask:', err);
        }
    };

    // Helper to check if a task is overdue
    const isOverdue = (task) => task.due_date &&
        task.status !== 'done' &&
        new Date(task.due_date) < new Date();

    // Drag and drop state
    const [draggingTaskId, setDraggingTaskId] = useState(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e, targetStatus) => {
        e.preventDefault();
        const taskId = parseInt(e.dataTransfer.getData('taskId'));
        const task = tasks.find(t => t.id === taskId);

        if (!task || task.status === targetStatus) {
            setDraggingTaskId(null);
            return;
        }

        // Check if trying to mark as done with incomplete subtasks
        if (targetStatus === 'done' && task.subtasks && task.subtasks.length > 0) {
            const incompleteCount = task.subtasks.filter(s => !s.completed).length;
            if (incompleteCount > 0) {
                alert(`Cannot mark as Done - there are ${incompleteCount} incomplete subtask(s).`);
                setDraggingTaskId(null);
                return;
            }
        }

        await updateTask(taskId, { status: targetStatus });
        setDraggingTaskId(null);
    };

    let filteredTasks = tasks.filter(t => {
        if (filter === 'all') return true;
        if (filter === 'overdue') return isOverdue(t);
        if (filter === 'pending') return t.status !== 'done' && t.status !== 'completed';
        return t.status === filter;
    });

    // Apply Sorting
    filteredTasks = [...filteredTasks].sort((a, b) => {
        switch (sortBy) {
            case 'created_desc':
                return new Date(b.created_at || Date.now()) - new Date(a.created_at || Date.now());
            case 'created_asc':
                return new Date(a.created_at || Date.now()) - new Date(b.created_at || Date.now());
            case 'due_asc':
                if (!a.due_date) return 1;
                if (!b.due_date) return -1;
                return new Date(a.due_date) - new Date(b.due_date);
            case 'due_desc':
                if (!a.due_date) return 1;
                if (!b.due_date) return -1;
                return new Date(b.due_date) - new Date(a.due_date);
            case 'priority_desc': {
                const pVal = { high: 3, medium: 2, low: 1 };
                return (pVal[b.priority] || 0) - (pVal[a.priority] || 0);
            }
            case 'priority_asc': {
                const pVal = { high: 3, medium: 2, low: 1 };
                return (pVal[a.priority] || 0) - (pVal[b.priority] || 0);
            }
            default:
                return 0;
        }
    });

    // For Kanban view, use ALL tasks (not filtered)
    // Overdue tasks are shown in a separate column
    const overdueTasks = filteredTasks.filter(t => isOverdue(t));
    const tasksByStatus = {
        overdue: overdueTasks,
        todo: filteredTasks.filter(t => t.status === 'todo' && !isOverdue(t)),
        in_progress: filteredTasks.filter(t => t.status === 'in_progress' && !isOverdue(t)),
        done: filteredTasks.filter(t => t.status === 'done')
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            </div>
        );
    }

    const getHeaderTitle = () => {
        if (view === 'kanban') return 'Kanban Board';
        switch (filter) {
            case 'all': return 'All Tasks';
            case 'pending': return 'Pending Tasks';
            case 'todo': return 'Tasks to Do';
            case 'in_progress': return 'In Progress Tasks';
            case 'done': return 'Completed Tasks';
            case 'overdue': return 'Overdue Tasks';
            default: return 'Tasks';
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header Line */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pl-12 lg:pl-0">
                <h1 className="text-3xl font-semibold text-white">{getHeaderTitle()}</h1>

                <div className="flex items-center gap-3">
                    {/* Search Button */}
                    {onOpenSearch && (
                        <button
                            onClick={onOpenSearch}
                            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/50 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all cursor-pointer"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <span className="text-sm">Search Tasks...</span>
                            <kbd className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-slate-700/50 text-slate-500 border border-white/10">Ctrl+K</kbd>
                        </button>
                    )}

                    {/* View Toggle */}
                    <div className="flex bg-slate-800/50 rounded-lg p-1 border border-white/10">
                        <button
                            onClick={() => setView('list')}
                            className={`px-3 py-1.5 rounded-md text-sm transition-all ${view === 'list'
                                ? 'bg-cyan-500/20 text-cyan-400'
                                : 'text-slate-400 hover:text-white'
                                }`}
                            title="List View"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setView('kanban')}
                            className={`px-3 py-1.5 rounded-md text-sm transition-all ${view === 'kanban'
                                ? 'bg-cyan-500/20 text-cyan-400'
                                : 'text-slate-400 hover:text-white'
                                }`}
                            title="Kanban View"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h4a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h4a2 2 0 012 2v10a2 2 0 01-2 2h-4a2 2 0 01-2-2V6z" />
                            </svg>
                        </button>
                    </div>

                    {/* Add Task Button */}
                    <button
                        onClick={() => setIsAddingTask(true)}
                        className="px-4 py-2 rounded-xl font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Task
                    </button>
                </div>
            </div>

            {/* Filter Pills and Sorting */}
            {view === 'list' && (
                <div className="flex justify-between items-center mb-6 pl-12 lg:pl-0 w-full flex-wrap gap-4">
                    <div className="flex gap-1 overflow-x-auto pb-1 flex-1 min-w-0 pr-4 styled-scrollbar">
                        {[
                            { id: 'all', label: 'All', icon: '📋', count: tasks.length },
                            { id: 'pending', label: 'Pending', icon: '⏳', count: tasks.filter(t => t.status !== 'done' && t.status !== 'completed').length },
                            { id: 'todo', label: 'To Do', icon: '📝', count: tasks.filter(t => t.status === 'todo').length },
                            { id: 'in_progress', label: 'In Progress', icon: '▶️', count: tasks.filter(t => t.status === 'in_progress').length },
                            { id: 'done', label: 'Done', icon: '✅', count: tasks.filter(t => t.status === 'done' || t.status === 'completed').length },
                            { id: 'overdue', label: 'Overdue', icon: '⚠️', count: tasks.filter(t => isOverdue(t)).length },
                        ].map(f => (
                            <button key={f.id} onClick={() => setFilter(f.id)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${filter === f.id ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
                                <span>{f.icon}</span>
                                {f.label}
                                <span className={`text-[10px] ${filter === f.id ? 'text-cyan-400/70' : 'text-slate-600'}`}>{f.count}</span>
                            </button>
                        ))}
                    </div>

                    {/* Sorting Dropdown */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-medium text-slate-400">Sort by:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="bg-slate-800/80 border border-white/10 text-slate-300 text-sm rounded-lg px-3 py-2 cursor-pointer focus:outline-none focus:border-cyan-500 transition-colors"
                        >
                            <option value="created_desc">Newest First</option>
                            <option value="created_asc">Oldest First</option>
                            <option value="due_asc">Due Date: Earliest</option>
                            <option value="due_desc">Due Date: Latest</option>
                            <option value="priority_desc">Priority: High to Low</option>
                            <option value="priority_asc">Priority: Low to High</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Quick Add Form */}
            {isAddingTask && (
                <form onSubmit={createTask} className="mb-4 flex gap-2">
                    <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        className="flex-1 px-4 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                        placeholder="What needs to be done?"
                        autoFocus
                    />
                    <button
                        type="submit"
                        className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
                    >
                        Create
                    </button>
                    <button
                        type="button"
                        onClick={() => { setIsAddingTask(false); setNewTaskTitle(''); }}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                </form>
            )}

            {/* Content */}
            <div className="flex-1 overflow-auto">
                {view === 'list' ? (
                    /* List View */
                    <div className="space-y-3">
                        {filteredTasks.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <p>No tasks yet. Create one to get started!</p>
                            </div>
                        ) : (
                            filteredTasks.map(task => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    onUpdate={updateTask}
                                    onDelete={deleteTask}
                                    onToggleSubtask={toggleSubtask}
                                    onAddSubtask={addSubtask}
                                    onDeleteSubtask={deleteSubtask}
                                    pages={pages}
                                />
                            ))
                        )}
                    </div>
                ) : (
                    /* Kanban View */
                    <>
                        {/* ===== Desktop Kanban (lg+): existing 4-column grid ===== */}
                        <div className="hidden lg:grid grid-cols-4 gap-4 h-full">
                            {/* Overdue Column */}
                            <div className="bg-red-500/10 rounded-xl p-4 flex flex-col">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                                    <h3 className="font-medium text-red-300">Overdue</h3>
                                    <span className="ml-auto text-sm text-red-400">{tasksByStatus.overdue.length}</span>
                                </div>
                                <div className="flex-1 space-y-3 overflow-auto"
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, 'todo')}
                                >
                                    {tasksByStatus.overdue.map(task => (
                                        <TaskCard key={task.id} task={task} onUpdate={updateTask} onDelete={deleteTask}
                                            onToggleSubtask={toggleSubtask} onAddSubtask={addSubtask} onDeleteSubtask={deleteSubtask}
                                            pages={pages} showStatus={false} />
                                    ))}
                                </div>
                            </div>
                            {/* To Do Column */}
                            <div className="bg-slate-800/30 rounded-xl p-4 flex flex-col"
                                onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'todo')}
                            >
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="w-3 h-3 rounded-full bg-slate-500"></span>
                                    <h3 className="font-medium text-slate-300">To Do</h3>
                                    <span className="ml-auto text-sm text-slate-500">{tasksByStatus.todo.length}</span>
                                </div>
                                <div className="flex-1 space-y-3 overflow-auto">
                                    {tasksByStatus.todo.map(task => (
                                        <TaskCard key={task.id} task={task} onUpdate={updateTask} onDelete={deleteTask}
                                            onToggleSubtask={toggleSubtask} onAddSubtask={addSubtask} onDeleteSubtask={deleteSubtask}
                                            pages={pages} showStatus={false} />
                                    ))}
                                </div>
                            </div>
                            {/* In Progress Column */}
                            <div className="bg-blue-500/10 rounded-xl p-4 flex flex-col"
                                onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'in_progress')}
                            >
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                                    <h3 className="font-medium text-blue-300">In Progress</h3>
                                    <span className="ml-auto text-sm text-blue-400">{tasksByStatus.in_progress.length}</span>
                                </div>
                                <div className="flex-1 space-y-3 overflow-auto">
                                    {tasksByStatus.in_progress.map(task => (
                                        <TaskCard key={task.id} task={task} onUpdate={updateTask} onDelete={deleteTask}
                                            onToggleSubtask={toggleSubtask} onAddSubtask={addSubtask} onDeleteSubtask={deleteSubtask}
                                            pages={pages} showStatus={false} />
                                    ))}
                                </div>
                            </div>
                            {/* Done Column */}
                            <div className="bg-green-500/10 rounded-xl p-4 flex flex-col"
                                onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'done')}
                            >
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                    <h3 className="font-medium text-green-300">Done</h3>
                                    <span className="ml-auto text-sm text-green-400">{tasksByStatus.done.length}</span>
                                </div>
                                <div className="flex-1 space-y-3 overflow-auto">
                                    {tasksByStatus.done.map(task => (
                                        <TaskCard key={task.id} task={task} onUpdate={updateTask} onDelete={deleteTask}
                                            onToggleSubtask={toggleSubtask} onAddSubtask={addSubtask} onDeleteSubtask={deleteSubtask}
                                            pages={pages} showStatus={false} />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ===== Mobile Kanban (< lg): 3D Card Stack ===== */}
                        {(() => {
                            const columns = [
                                { key: 'overdue', label: 'Overdue', tasks: tasksByStatus.overdue, dotColor: 'bg-red-500', bgGradient: 'from-red-500/20 to-red-900/10', borderColor: 'border-red-500/30', textColor: 'text-red-300', countColor: 'text-red-400', previewColor: 'text-red-200/60', activeDot: 'bg-red-400' },
                                { key: 'todo', label: 'To Do', tasks: tasksByStatus.todo, dotColor: 'bg-slate-400', bgGradient: 'from-slate-700/40 to-slate-800/30', borderColor: 'border-slate-500/30', textColor: 'text-slate-200', countColor: 'text-slate-400', previewColor: 'text-slate-300/60', activeDot: 'bg-slate-300' },
                                { key: 'in_progress', label: 'In Progress', tasks: tasksByStatus.in_progress, dotColor: 'bg-blue-500', bgGradient: 'from-blue-500/20 to-blue-900/10', borderColor: 'border-blue-500/30', textColor: 'text-blue-200', countColor: 'text-blue-400', previewColor: 'text-blue-200/60', activeDot: 'bg-blue-400' },
                                { key: 'done', label: 'Done', tasks: tasksByStatus.done, dotColor: 'bg-green-500', bgGradient: 'from-green-500/20 to-green-900/10', borderColor: 'border-green-500/30', textColor: 'text-green-200', countColor: 'text-green-400', previewColor: 'text-green-200/60', activeDot: 'bg-green-400' },
                            ];
                            const total = columns.length;

                            const handleTouchStart = (e) => {
                                touchStartY.current = e.touches[0].clientY;
                                touchDelta.current = 0;
                            };
                            const handleTouchMove = (e) => {
                                if (touchStartY.current === null) return;
                                touchDelta.current = e.touches[0].clientY - touchStartY.current;
                            };
                            const handleTouchEnd = () => {
                                if (Math.abs(touchDelta.current) > 50) {
                                    if (touchDelta.current < 0) {
                                        // Swipe up → next card
                                        setActiveCardIndex(prev => Math.min(prev + 1, total - 1));
                                    } else {
                                        // Swipe down → previous card
                                        setActiveCardIndex(prev => Math.max(prev - 1, 0));
                                    }
                                }
                                touchStartY.current = null;
                                touchDelta.current = 0;
                            };

                            return (
                                <div className="lg:hidden">
                                    {/* 3D Card Stack */}
                                    <div
                                        className="relative mx-auto"
                                        style={{ height: '320px', perspective: '1000px' }}
                                        onTouchStart={handleTouchStart}
                                        onTouchMove={handleTouchMove}
                                        onTouchEnd={handleTouchEnd}
                                    >
                                        {columns.map((col, i) => {
                                            // Calculate position relative to active card
                                            const offset = i - activeCardIndex;
                                            // Cards behind: shift down and scale smaller
                                            const translateY = offset * 18;
                                            const scale = 1 - Math.abs(offset) * 0.05;
                                            const zIndex = total - Math.abs(offset);
                                            const opacity = 1;
                                            const blur = Math.abs(offset) > 0 ? Math.abs(offset) * 0.5 : 0;

                                            return (
                                                <div
                                                    key={col.key}
                                                    onClick={() => {
                                                        if (offset === 0) setMobileKanbanColumn(col.key);
                                                        else setActiveCardIndex(i);
                                                    }}
                                                    className={`
                                                        absolute inset-x-0 mx-auto
                                                        bg-gradient-to-br ${col.bgGradient} border ${col.borderColor}
                                                        bg-slate-900/80 backdrop-blur-xl backdrop-saturate-150
                                                        rounded-2xl p-5 cursor-pointer flex flex-col
                                                        ${offset === 0 ? 'shadow-2xl ring-1 ring-white/10' : 'shadow-lg'}
                                                    `}
                                                    style={{
                                                        height: '260px',
                                                        zIndex,
                                                        transform: `translateY(${translateY}px) scale(${scale})`,
                                                        opacity,
                                                        filter: blur > 0 ? `blur(${blur}px)` : 'none',
                                                        transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease, filter 0.4s ease',
                                                        pointerEvents: Math.abs(offset) > 1 ? 'none' : 'auto',
                                                    }}
                                                >
                                                    {/* Status Header */}
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <span className={`w-3.5 h-3.5 rounded-full ${col.dotColor} shadow-lg`}></span>
                                                        <h3 className={`font-semibold text-lg ${col.textColor}`}>{col.label}</h3>
                                                        <span className={`ml-auto text-2xl font-bold ${col.countColor}`}>{col.tasks.length}</span>
                                                    </div>

                                                    {/* Task Previews */}
                                                    <div className="space-y-2 flex-1">
                                                        {col.tasks.slice(0, 3).map(task => (
                                                            <div key={task.id} className="flex items-center gap-2">
                                                                <span className={`w-1.5 h-1.5 rounded-full ${col.dotColor} opacity-60`}></span>
                                                                <span className={`text-sm truncate ${col.previewColor}`}>{task.title}</span>
                                                            </div>
                                                        ))}
                                                        {col.tasks.length > 3 && (
                                                            <p className={`text-xs ${col.countColor} opacity-70 pl-3.5`}>
                                                                +{col.tasks.length - 3} more...
                                                            </p>
                                                        )}
                                                        {col.tasks.length === 0 && (
                                                            <p className={`text-sm ${col.previewColor} italic`}>No tasks</p>
                                                        )}
                                                    </div>

                                                    {/* Tap hint — only on active card */}
                                                    {offset === 0 && (
                                                        <div className={`flex items-center justify-center gap-1.5 text-xs ${col.countColor} opacity-60 pt-2 border-t border-white/5`}>
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                            Tap to view
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Navigation dots + swipe hint */}
                                    <div className="flex flex-col items-center gap-3 mt-4">
                                        <div className="flex gap-2">
                                            {columns.map((col, i) => (
                                                <button
                                                    key={col.key}
                                                    onClick={() => setActiveCardIndex(i)}
                                                    className={`w-2 h-2 rounded-full transition-all duration-300 ${i === activeCardIndex
                                                        ? `${col.activeDot} scale-125`
                                                        : 'bg-slate-600 hover:bg-slate-500'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-xs text-slate-500">Swipe up / down</p>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* ===== Mobile Kanban Popup ===== */}
                        {mobileKanbanColumn && (() => {
                            const colMeta = {
                                overdue: { label: 'Overdue', tasks: tasksByStatus.overdue, dotColor: 'bg-red-500', textColor: 'text-red-300', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
                                todo: { label: 'To Do', tasks: tasksByStatus.todo, dotColor: 'bg-slate-400', textColor: 'text-slate-200', bgColor: 'bg-slate-800/50', borderColor: 'border-slate-500/30' },
                                in_progress: { label: 'In Progress', tasks: tasksByStatus.in_progress, dotColor: 'bg-blue-500', textColor: 'text-blue-200', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
                                done: { label: 'Done', tasks: tasksByStatus.done, dotColor: 'bg-green-500', textColor: 'text-green-200', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30' },
                            };
                            const col = colMeta[mobileKanbanColumn];
                            return (
                                <div
                                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
                                    onClick={() => setMobileKanbanColumn(null)}
                                >
                                    {/* Backdrop */}
                                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>

                                    {/* Popup Panel */}
                                    <div
                                        className="relative z-10 w-full sm:max-w-lg max-h-[85vh] bg-slate-900/85 backdrop-blur-xl backdrop-saturate-150 border-t sm:border border-white/10 sm:rounded-2xl rounded-t-2xl shadow-2xl ring-1 ring-white/10 flex flex-col kanban-popup-enter"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {/* Popup Header */}
                                        <div className={`flex items-center gap-3 px-5 py-4 border-b ${col.borderColor}`}>
                                            <span className={`w-3 h-3 rounded-full ${col.dotColor}`}></span>
                                            <h3 className={`font-semibold text-lg ${col.textColor} flex-1`}>{col.label}</h3>
                                            <span className="text-sm text-slate-500">{col.tasks.length} tasks</span>
                                            <button
                                                onClick={() => setMobileKanbanColumn(null)}
                                                className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>

                                        {/* Popup Task List */}
                                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                            {col.tasks.length === 0 ? (
                                                <div className="text-center py-12 text-slate-500">
                                                    <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                    </svg>
                                                    <p className="text-sm">No tasks in this column</p>
                                                </div>
                                            ) : (
                                                col.tasks.map(task => (
                                                    <TaskCard
                                                        key={task.id} task={task} onUpdate={updateTask} onDelete={deleteTask}
                                                        onToggleSubtask={toggleSubtask} onAddSubtask={addSubtask} onDeleteSubtask={deleteSubtask}
                                                        pages={pages} showStatus={false}
                                                    />
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </>
                )}
            </div>
        </div>
    );
};

export default TaskList;

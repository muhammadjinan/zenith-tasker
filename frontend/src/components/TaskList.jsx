import React, { useState, useEffect, useCallback } from 'react';
import TaskCard from './TaskCard';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const TaskList = ({ pages, onSelectPage, externalFilter }) => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list'); // 'list' or 'kanban'
    const [filter, setFilter] = useState(externalFilter || 'all'); // 'all', 'todo', 'in_progress', 'done', 'overdue'
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [isAddingTask, setIsAddingTask] = useState(false);

    // Sync with external filter when it changes
    useEffect(() => {
        if (externalFilter) {
            // Map sidebar filter values to TaskList filter values
            const filterMap = {
                'all': 'all',
                'todo': 'todo',
                'inprogress': 'in_progress',
                'done': 'done',
                'overdue': 'overdue'
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

    const filteredTasks = tasks.filter(t => {
        if (filter === 'all') return true;
        if (filter === 'overdue') return isOverdue(t);
        return t.status === filter;
    });

    // For Kanban view, use ALL tasks (not filtered)
    // Overdue tasks are shown in a separate column
    const overdueTasks = tasks.filter(t => isOverdue(t));
    const tasksByStatus = {
        overdue: overdueTasks,
        todo: tasks.filter(t => t.status === 'todo' && !isOverdue(t)),
        in_progress: tasks.filter(t => t.status === 'in_progress' && !isOverdue(t)),
        done: tasks.filter(t => t.status === 'done')
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-white">Tasks</h2>
                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className="flex bg-slate-800/50 rounded-lg p-1">
                        <button
                            onClick={() => setView('list')}
                            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${view === 'list' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            List
                        </button>
                        <button
                            onClick={() => setView('kanban')}
                            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${view === 'kanban' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Kanban
                        </button>
                    </div>

                    {/* Filter (list view only) */}
                    {view === 'list' && (
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="px-3 py-1.5 bg-slate-800/50 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                        >
                            <option value="all">All Tasks</option>
                            <option value="overdue">Overdue</option>
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="done">Done</option>
                        </select>
                    )}

                    {/* Add Task Button */}
                    <button
                        onClick={() => setIsAddingTask(true)}
                        className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Task
                    </button>
                </div>
            </div>

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
                    <div className="grid grid-cols-4 gap-4 h-full">
                        {/* Overdue Column */}
                        <div className="bg-red-500/10 rounded-xl p-4 flex flex-col">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                                <h3 className="font-medium text-red-300">Overdue</h3>
                                <span className="ml-auto text-sm text-red-400">{tasksByStatus.overdue.length}</span>
                            </div>
                            <div className="flex-1 space-y-3 overflow-auto">
                                {tasksByStatus.overdue.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onUpdate={updateTask}
                                        onDelete={deleteTask}
                                        onToggleSubtask={toggleSubtask}
                                        onAddSubtask={addSubtask}
                                        onDeleteSubtask={deleteSubtask}
                                        pages={pages}
                                        showStatus={false}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* To Do Column */}
                        <div className="bg-slate-800/30 rounded-xl p-4 flex flex-col">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="w-3 h-3 rounded-full bg-slate-500"></span>
                                <h3 className="font-medium text-slate-300">To Do</h3>
                                <span className="ml-auto text-sm text-slate-500">{tasksByStatus.todo.length}</span>
                            </div>
                            <div className="flex-1 space-y-3 overflow-auto">
                                {tasksByStatus.todo.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onUpdate={updateTask}
                                        onDelete={deleteTask}
                                        onToggleSubtask={toggleSubtask}
                                        onAddSubtask={addSubtask}
                                        onDeleteSubtask={deleteSubtask}
                                        pages={pages}
                                        showStatus={false}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* In Progress Column */}
                        <div className="bg-blue-500/10 rounded-xl p-4 flex flex-col">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                                <h3 className="font-medium text-blue-300">In Progress</h3>
                                <span className="ml-auto text-sm text-blue-400">{tasksByStatus.in_progress.length}</span>
                            </div>
                            <div className="flex-1 space-y-3 overflow-auto">
                                {tasksByStatus.in_progress.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onUpdate={updateTask}
                                        onDelete={deleteTask}
                                        onToggleSubtask={toggleSubtask}
                                        onAddSubtask={addSubtask}
                                        onDeleteSubtask={deleteSubtask}
                                        pages={pages}
                                        showStatus={false}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Done Column */}
                        <div className="bg-green-500/10 rounded-xl p-4 flex flex-col">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                <h3 className="font-medium text-green-300">Done</h3>
                                <span className="ml-auto text-sm text-green-400">{tasksByStatus.done.length}</span>
                            </div>
                            <div className="flex-1 space-y-3 overflow-auto">
                                {tasksByStatus.done.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onUpdate={updateTask}
                                        onDelete={deleteTask}
                                        onToggleSubtask={toggleSubtask}
                                        onAddSubtask={addSubtask}
                                        onDeleteSubtask={deleteSubtask}
                                        pages={pages}
                                        showStatus={false}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaskList;

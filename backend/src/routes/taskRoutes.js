const express = require('express');
const router = express.Router();
const taskModel = require('../models/taskModel');
const verifyToken = require('../middleware/authMiddleware');

// All routes require authentication
router.use(verifyToken);

// ============ Task Routes ============

// Get all tasks for user
router.get('/', async (req, res) => {
    try {
        const tasks = await taskModel.getAllTasks(req.user.user_id);
        res.json(tasks);
    } catch (err) {
        console.error('Error fetching tasks:', err);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// Get tasks for a specific page
router.get('/page/:pageId', async (req, res) => {
    try {
        const tasks = await taskModel.getTasksByPage(req.params.pageId, req.user.user_id);
        res.json(tasks);
    } catch (err) {
        console.error('Error fetching page tasks:', err);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// Get single task
router.get('/:id', async (req, res) => {
    try {
        const task = await taskModel.getTaskById(req.params.id, req.user.user_id);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(task);
    } catch (err) {
        console.error('Error fetching task:', err);
        res.status(500).json({ error: 'Failed to fetch task' });
    }
});

// Create task
router.post('/', async (req, res) => {
    try {
        const { title, description, status, priority, due_date, category, page_id } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const task = await taskModel.createTask(req.user.user_id, {
            title: title.trim(),
            description,
            status,
            priority,
            due_date,
            category,
            page_id
        });
        res.status(201).json(task);
    } catch (err) {
        console.error('Error creating task:', err);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// Update task
router.put('/:id', async (req, res) => {
    try {
        const task = await taskModel.updateTask(req.params.id, req.user.user_id, req.body);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(task);
    } catch (err) {
        console.error('Error updating task:', err);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// Delete task
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await taskModel.deleteTask(req.params.id, req.user.user_id);
        if (!deleted) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json({ message: 'Task deleted' });
    } catch (err) {
        console.error('Error deleting task:', err);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// Reorder tasks
router.put('/batch/reorder', async (req, res) => {
    try {
        const { taskOrders } = req.body;
        if (!Array.isArray(taskOrders)) {
            return res.status(400).json({ error: 'taskOrders must be an array' });
        }
        await taskModel.reorderTasks(req.user.user_id, taskOrders);
        res.json({ message: 'Tasks reordered' });
    } catch (err) {
        console.error('Error reordering tasks:', err);
        res.status(500).json({ error: 'Failed to reorder tasks' });
    }
});

// ============ Subtask Routes ============

// Add subtask to task
router.post('/:taskId/subtasks', async (req, res) => {
    try {
        const { title } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Title is required' });
        }

        // Verify task belongs to user
        const task = await taskModel.getTaskById(req.params.taskId, req.user.user_id);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const subtask = await taskModel.createSubtask(req.params.taskId, title.trim());
        res.status(201).json(subtask);
    } catch (err) {
        console.error('Error creating subtask:', err);
        res.status(500).json({ error: 'Failed to create subtask' });
    }
});

// Update subtask
router.put('/:taskId/subtasks/:subtaskId', async (req, res) => {
    try {
        // Verify task belongs to user
        const task = await taskModel.getTaskById(req.params.taskId, req.user.user_id);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const subtask = await taskModel.updateSubtask(req.params.subtaskId, req.body);
        if (!subtask) {
            return res.status(404).json({ error: 'Subtask not found' });
        }
        res.json(subtask);
    } catch (err) {
        console.error('Error updating subtask:', err);
        res.status(500).json({ error: 'Failed to update subtask' });
    }
});

// Toggle subtask completion
router.patch('/:taskId/subtasks/:subtaskId/toggle', async (req, res) => {
    try {
        // Verify task belongs to user
        const task = await taskModel.getTaskById(req.params.taskId, req.user.user_id);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const subtask = await taskModel.toggleSubtask(req.params.subtaskId);
        if (!subtask) {
            return res.status(404).json({ error: 'Subtask not found' });
        }
        res.json(subtask);
    } catch (err) {
        console.error('Error toggling subtask:', err);
        res.status(500).json({ error: 'Failed to toggle subtask' });
    }
});

// Delete subtask
router.delete('/:taskId/subtasks/:subtaskId', async (req, res) => {
    try {
        // Verify task belongs to user
        const task = await taskModel.getTaskById(req.params.taskId, req.user.user_id);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const deleted = await taskModel.deleteSubtask(req.params.subtaskId);
        if (!deleted) {
            return res.status(404).json({ error: 'Subtask not found' });
        }
        res.json({ message: 'Subtask deleted' });
    } catch (err) {
        console.error('Error deleting subtask:', err);
        res.status(500).json({ error: 'Failed to delete subtask' });
    }
});

module.exports = router;

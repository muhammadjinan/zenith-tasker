const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/authMiddleware');

// ============ Tags CRUD ============

// GET all tags for user
router.get('/', verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM tags WHERE user_id = $1 ORDER BY name ASC',
            [req.user.user_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create tag
router.post('/', verifyToken, async (req, res) => {
    try {
        const { name, color } = req.body;
        if (!name?.trim()) return res.status(400).json({ error: 'Tag name is required' });
        const result = await db.query(
            'INSERT INTO tags (user_id, name, color) VALUES ($1, $2, $3) RETURNING *',
            [req.user.user_id, name.trim(), color || '#6366f1']
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update tag
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { name, color } = req.body;
        const result = await db.query(
            'UPDATE tags SET name = COALESCE($1, name), color = COALESCE($2, color) WHERE id = $3 AND user_id = $4 RETURNING *',
            [name, color, req.params.id, req.user.user_id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Tag not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE tag
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM tags WHERE id = $1 AND user_id = $2 RETURNING id',
            [req.params.id, req.user.user_id]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Tag not found' });
        res.json({ message: 'Tag deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ Page Tags ============

// GET tags for a page
router.get('/page/:pageId', verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT t.* FROM tags t 
       JOIN page_tags pt ON t.id = pt.tag_id
       WHERE pt.page_id = $1 AND t.user_id = $2`,
            [req.params.pageId, req.user.user_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST assign tag to page
router.post('/page/:pageId', verifyToken, async (req, res) => {
    try {
        const { tagId } = req.body;
        await db.query(
            'INSERT INTO page_tags (page_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [req.params.pageId, tagId]
        );
        res.json({ message: 'Tag assigned' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE remove tag from page
router.delete('/page/:pageId/:tagId', verifyToken, async (req, res) => {
    try {
        await db.query(
            'DELETE FROM page_tags WHERE page_id = $1 AND tag_id = $2',
            [req.params.pageId, req.params.tagId]
        );
        res.json({ message: 'Tag removed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ Task Tags ============

// GET tags for a task
router.get('/task/:taskId', verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT t.* FROM tags t 
       JOIN task_tags tt ON t.id = tt.tag_id
       WHERE tt.task_id = $1 AND t.user_id = $2`,
            [req.params.taskId, req.user.user_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST assign tag to task
router.post('/task/:taskId', verifyToken, async (req, res) => {
    try {
        const { tagId } = req.body;
        await db.query(
            'INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [req.params.taskId, tagId]
        );
        res.json({ message: 'Tag assigned' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE remove tag from task
router.delete('/task/:taskId/:tagId', verifyToken, async (req, res) => {
    try {
        await db.query(
            'DELETE FROM task_tags WHERE task_id = $1 AND tag_id = $2',
            [req.params.taskId, req.params.tagId]
        );
        res.json({ message: 'Tag removed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

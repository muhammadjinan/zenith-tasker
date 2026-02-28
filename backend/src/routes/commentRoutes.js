const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/authMiddleware');

// GET comments for a page (with user info)
router.get('/:pageId', verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT c.*, u.username, u.profile_pic
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.page_id = $1
       ORDER BY c.created_at ASC`,
            [req.params.pageId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST add comment
router.post('/', verifyToken, async (req, res) => {
    try {
        const { page_id, content } = req.body;
        if (!content?.trim()) return res.status(400).json({ error: 'Comment content is required' });
        const result = await db.query(
            `INSERT INTO comments (page_id, user_id, content) VALUES ($1, $2, $3) RETURNING *`,
            [page_id, req.user.user_id, content.trim()]
        );
        // Fetch with user info
        const fullComment = await db.query(
            `SELECT c.*, u.username, u.profile_pic FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = $1`,
            [result.rows[0].id]
        );
        res.json(fullComment.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT edit comment (own comments only)
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { content } = req.body;
        const result = await db.query(
            'UPDATE comments SET content = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
            [content, req.params.id, req.user.user_id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Comment not found or unauthorized' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE comment (own comments only)
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING id',
            [req.params.id, req.user.user_id]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Comment not found or unauthorized' });
        res.json({ message: 'Comment deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

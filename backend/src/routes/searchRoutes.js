const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/authMiddleware');

// GET /search?q=query&scope=all|pages|tasks — Scoped full-text search
router.get('/', verifyToken, async (req, res) => {
    const { q, scope = 'all' } = req.query;
    if (!q || q.trim().length < 2) {
        return res.json({ pages: [], tasks: [] });
    }

    const searchTerm = `%${q.trim().toLowerCase()}%`;

    try {
        let pages = [];
        let tasks = [];

        // Search pages (if scope is 'all' or 'pages')
        if (scope === 'all' || scope === 'pages') {
            const pagesResult = await db.query(
                `SELECT id, title, content, icon, parent_id, updated_at 
         FROM pages 
         WHERE user_id = $1 AND (LOWER(title) LIKE $2 OR LOWER(content) LIKE $2)
         ORDER BY updated_at DESC
         LIMIT 10`,
                [req.user.user_id, searchTerm]
            );
            pages = pagesResult.rows.map(p => ({
                ...p,
                preview: (p.content || '').replace(/<[^>]*>/g, '').substring(0, 120),
            }));
        }

        // Search tasks (if scope is 'all' or 'tasks')
        if (scope === 'all' || scope === 'tasks') {
            const tasksResult = await db.query(
                `SELECT id, title, description, status, priority, due_date, page_id, updated_at
         FROM tasks
         WHERE user_id = $1 AND (LOWER(title) LIKE $2 OR LOWER(description) LIKE $2)
         ORDER BY updated_at DESC
         LIMIT 10`,
                [req.user.user_id, searchTerm]
            );
            tasks = tasksResult.rows;
        }

        res.json({ pages, tasks });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

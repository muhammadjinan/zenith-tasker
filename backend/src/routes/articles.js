const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/authMiddleware');

// Helper to check permissions (Admin or Author)
const checkPermission = async (userId) => {
    const result = await db.query(
        'SELECT is_admin, is_author FROM users WHERE id = $1',
        [userId]
    );
    if (result.rows.length === 0) return { isAdmin: false, isAuthor: false };
    return {
        isAdmin: result.rows[0].is_admin,
        isAuthor: result.rows[0].is_author
    };
};

// GET all articles (with optional filtering)
router.get('/', verifyToken, async (req, res) => {
    try {
        const { type, category } = req.query;
        let query = `
            SELECT a.*, u.username as author_name 
            FROM articles a 
            LEFT JOIN users u ON a.author_id = u.id 
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (type && type !== 'all') {
            query += ` AND a.type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }

        if (category && category !== 'all') {
            query += ` AND a.category = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }

        query += ` ORDER BY a.created_at DESC`;

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching articles:', err);
        res.status(500).json({ error: 'Failed to fetch articles' });
    }
});

// GET single article by ID
router.get('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            `SELECT a.*, u.username as author_name 
             FROM articles a 
             LEFT JOIN users u ON a.author_id = u.id 
             WHERE a.id = $1`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Article not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching article:', err);
        res.status(500).json({ error: 'Failed to fetch article' });
    }
});

// POST new article (Admin or Author only)
router.post('/', verifyToken, async (req, res) => {
    const userId = req.user.user_id; // From verifyToken payload
    const { title, content, type, category } = req.body;

    if (!title) return res.status(400).json({ error: 'Title is required' });

    try {
        // Check permissions
        const perms = await checkPermission(userId);
        if (!perms.isAdmin && !perms.isAuthor) {
            return res.status(403).json({ error: 'You do not have permission to publish articles.' });
        }

        const result = await db.query(
            `INSERT INTO articles (title, content, type, category, author_id)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [title, content || '', type || 'how_to', category || 'general', userId]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating article:', err);
        res.status(500).json({ error: 'Failed to create article' });
    }
});

// PUT update article (Admin can edit any, Author can edit their own)
router.put('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { title, content, type, category } = req.body;
    const userId = req.user.user_id;

    try {
        const perms = await checkPermission(userId);

        // Check if article exists to verify ownership
        const articleResult = await db.query('SELECT author_id FROM articles WHERE id = $1', [id]);
        if (articleResult.rows.length === 0) {
            return res.status(404).json({ error: 'Article not found' });
        }

        const article = articleResult.rows[0];

        // Authorization logic
        if (!perms.isAdmin) {
            if (!perms.isAuthor || article.author_id !== userId) {
                return res.status(403).json({ error: 'You can only edit your own articles.' });
            }
        }

        const updateResult = await db.query(
            `UPDATE articles SET 
             title = COALESCE($1, title), 
             content = COALESCE($2, content), 
             type = COALESCE($3, type), 
             category = COALESCE($4, category), 
             updated_at = NOW() 
             WHERE id = $5 RETURNING *`,
            [title, content, type, category, id]
        );

        res.json(updateResult.rows[0]);
    } catch (err) {
        console.error('Error updating article:', err);
        res.status(500).json({ error: 'Failed to update article' });
    }
});

// DELETE article (Admin can delete any, Author can delete their own)
router.delete('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.user_id;

    try {
        const perms = await checkPermission(userId);

        // Check if article exists to verify ownership
        const articleResult = await db.query('SELECT author_id FROM articles WHERE id = $1', [id]);
        if (articleResult.rows.length === 0) {
            return res.status(404).json({ error: 'Article not found' });
        }

        const article = articleResult.rows[0];

        // Authorization logic
        if (!perms.isAdmin) {
            if (!perms.isAuthor || article.author_id !== userId) {
                return res.status(403).json({ error: 'You can only delete your own articles.' });
            }
        }

        await db.query('DELETE FROM articles WHERE id = $1', [id]);
        res.json({ message: 'Article deleted successfully' });
    } catch (err) {
        console.error('Error deleting article:', err);
        res.status(500).json({ error: 'Failed to delete article' });
    }
});

module.exports = router;

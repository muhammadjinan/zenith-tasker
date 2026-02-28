const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/authMiddleware');

// ============ Databases CRUD ============

// GET databases for a page
router.get('/page/:pageId', verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM databases WHERE page_id = $1 AND user_id = $2 ORDER BY created_at ASC',
            [req.params.pageId, req.user.user_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single database with its rows
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const dbResult = await db.query(
            'SELECT * FROM databases WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.user_id]
        );
        if (dbResult.rows.length === 0) {
            return res.status(404).json({ error: 'Database not found' });
        }
        const rowsResult = await db.query(
            'SELECT * FROM database_rows WHERE database_id = $1 ORDER BY order_index ASC, created_at ASC',
            [req.params.id]
        );
        res.json({ ...dbResult.rows[0], rows: rowsResult.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create database
router.post('/', verifyToken, async (req, res) => {
    try {
        const { page_id, name } = req.body;
        // Default columns
        const defaultColumns = [
            { id: 'col_1', name: 'Name', type: 'text' },
            { id: 'col_2', name: 'Status', type: 'select', options: ['To Do', 'In Progress', 'Done'] },
            { id: 'col_3', name: 'Date', type: 'date' }
        ];
        const result = await db.query(
            `INSERT INTO databases (page_id, user_id, name, columns) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
            [page_id, req.user.user_id, name || 'Untitled Database', JSON.stringify(defaultColumns)]
        );
        res.json({ ...result.rows[0], rows: [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update database (name, columns)
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { name, columns } = req.body;
        const result = await db.query(
            `UPDATE databases SET 
        name = COALESCE($1, name), 
        columns = COALESCE($2, columns),
        updated_at = NOW()
       WHERE id = $3 AND user_id = $4 RETURNING *`,
            [name, columns ? JSON.stringify(columns) : null, req.params.id, req.user.user_id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Database not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE database
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM databases WHERE id = $1 AND user_id = $2 RETURNING id',
            [req.params.id, req.user.user_id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Database not found' });
        }
        res.json({ message: 'Database deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ Database Rows CRUD ============

// GET all rows for a database
router.get('/:id/rows', verifyToken, async (req, res) => {
    try {
        // Verify ownership
        const dbCheck = await db.query('SELECT id FROM databases WHERE id = $1 AND user_id = $2', [req.params.id, req.user.user_id]);
        if (dbCheck.rows.length === 0) return res.status(404).json({ error: 'Database not found' });

        const result = await db.query(
            'SELECT * FROM database_rows WHERE database_id = $1 ORDER BY order_index ASC, created_at ASC',
            [req.params.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST add row
router.post('/:id/rows', verifyToken, async (req, res) => {
    try {
        const { data } = req.body;
        // Get max order_index
        const maxOrder = await db.query(
            'SELECT MAX(order_index) as max_val FROM database_rows WHERE database_id = $1',
            [req.params.id]
        );
        const nextOrder = (maxOrder.rows[0].max_val || 0) + 1;
        const result = await db.query(
            'INSERT INTO database_rows (database_id, data, order_index) VALUES ($1, $2, $3) RETURNING *',
            [req.params.id, JSON.stringify(data || {}), nextOrder]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update row
router.put('/:dbId/rows/:rowId', verifyToken, async (req, res) => {
    try {
        const { data } = req.body;
        const result = await db.query(
            'UPDATE database_rows SET data = $1 WHERE id = $2 AND database_id = $3 RETURNING *',
            [JSON.stringify(data), req.params.rowId, req.params.dbId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Row not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE row
router.delete('/:dbId/rows/:rowId', verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM database_rows WHERE id = $1 AND database_id = $2 RETURNING id',
            [req.params.rowId, req.params.dbId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Row not found' });
        }
        res.json({ message: 'Row deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

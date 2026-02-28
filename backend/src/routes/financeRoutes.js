const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/authMiddleware');

// ============ DEFAULT CATEGORIES ============
const DEFAULT_CATEGORIES = [
    // Income
    { name: 'Salary', icon: '💰', color: '#22c55e', type: 'income' },
    { name: 'Freelance', icon: '💻', color: '#10b981', type: 'income' },
    { name: 'Business', icon: '🏢', color: '#14b8a6', type: 'income' },
    { name: 'Investments', icon: '📈', color: '#06b6d4', type: 'income' },
    { name: 'Gifts Received', icon: '🎁', color: '#8b5cf6', type: 'income' },
    { name: 'Other Income', icon: '💵', color: '#6366f1', type: 'income' },
    // Expense
    {
        name: 'Food & Dining', icon: '🍕', color: '#ef4444', type: 'expense',
        sub: [
            { name: 'Groceries', icon: '🛒', color: '#f87171' },
            { name: 'Restaurants', icon: '🍽️', color: '#fb923c' },
            { name: 'Coffee & Tea', icon: '☕', color: '#f59e0b' },
        ]
    },
    {
        name: 'Transport', icon: '🚗', color: '#f97316', type: 'expense',
        sub: [
            { name: 'Fuel', icon: '⛽', color: '#fb923c' },
            { name: 'Public Transit', icon: '🚌', color: '#fdba74' },
            { name: 'Cab/Ride', icon: '🚕', color: '#fbbf24' },
        ]
    },
    {
        name: 'Housing', icon: '🏠', color: '#a855f7', type: 'expense',
        sub: [
            { name: 'Rent', icon: '🔑', color: '#c084fc' },
            { name: 'Maintenance', icon: '🔧', color: '#d8b4fe' },
            { name: 'Utilities', icon: '💡', color: '#e9d5ff' },
        ]
    },
    { name: 'Shopping', icon: '🛍️', color: '#ec4899', type: 'expense' },
    { name: 'Healthcare', icon: '🏥', color: '#14b8a6', type: 'expense' },
    { name: 'Education', icon: '📚', color: '#3b82f6', type: 'expense' },
    { name: 'Entertainment', icon: '🎬', color: '#f43f5e', type: 'expense' },
    {
        name: 'Bills & EMI', icon: '📄', color: '#64748b', type: 'expense',
        sub: [
            { name: 'Phone/Internet', icon: '📱', color: '#94a3b8' },
            { name: 'Insurance', icon: '🛡️', color: '#475569' },
            { name: 'Subscriptions', icon: '📺', color: '#6b7280' },
            { name: 'Loan EMI', icon: '🏦', color: '#78716c' },
        ]
    },
    { name: 'Personal Care', icon: '💇', color: '#d946ef', type: 'expense' },
    { name: 'Gifts & Donations', icon: '🎗️', color: '#f472b6', type: 'expense' },
    { name: 'Travel', icon: '✈️', color: '#0ea5e9', type: 'expense' },
    { name: 'Other Expense', icon: '📦', color: '#71717a', type: 'expense' },
];

// ============ MIDDLEWARE: check membership + permissions ============
const checkMembership = (requiredPerm) => async (req, res, next) => {
    const trackerId = req.params.id || req.params.trackerId;
    if (!trackerId) return res.status(400).json({ error: 'Tracker ID required' });

    try {
        const result = await db.query(
            'SELECT * FROM finance_members WHERE tracker_id = $1 AND user_id = $2',
            [trackerId, req.user.user_id]
        );
        if (result.rows.length === 0) {
            return res.status(403).json({ error: 'Not a member of this tracker' });
        }
        const member = result.rows[0];
        req.membership = member;

        // Owner bypasses all permission checks
        if (member.is_owner) return next();

        // Check specific permission
        if (requiredPerm && !member[requiredPerm]) {
            return res.status(403).json({ error: `Missing permission: ${requiredPerm}` });
        }
        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Seed default categories for a new tracker
const seedDefaultCategories = async (trackerId) => {
    for (const cat of DEFAULT_CATEGORIES) {
        const result = await db.query(
            `INSERT INTO finance_categories (tracker_id, name, icon, color, type, is_default)
       VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING id`,
            [trackerId, cat.name, cat.icon, cat.color, cat.type]
        );
        // Insert sub-categories
        if (cat.sub) {
            for (const sub of cat.sub) {
                await db.query(
                    `INSERT INTO finance_categories (tracker_id, parent_id, name, icon, color, type, is_default)
           VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
                    [trackerId, result.rows[0].id, sub.name, sub.icon, sub.color, cat.type]
                );
            }
        }
    }
};

// ============ TRACKER CRUD ============

// POST /finance — Create tracker
router.post('/', verifyToken, async (req, res) => {
    const { name, type = 'personal', currency = 'INR', description, enabled_sections } = req.body;
    try {
        const sections = enabled_sections || ['overview', 'transactions', 'investments', 'loans', 'categories', 'members'];
        const result = await db.query(
            `INSERT INTO finance_trackers (user_id, name, type, currency, description, enabled_sections)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [req.user.user_id, name || 'My Finances', type, currency, description || '', JSON.stringify(sections)]
        );
        const tracker = result.rows[0];

        // Add owner as member with all permissions
        await db.query(
            `INSERT INTO finance_members (tracker_id, user_id, is_owner, can_read, can_write, can_delete,
        can_manage_members, can_manage_categories, can_manage_investments, can_manage_loans, can_export)
       VALUES ($1, $2, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)`,
            [tracker.id, req.user.user_id]
        );

        // Seed default categories
        await seedDefaultCategories(tracker.id);

        res.status(201).json(tracker);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /finance — List trackers the user owns or is a member of
router.get('/', verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT ft.*, fm.is_owner, fm.can_read, fm.can_write, fm.can_delete,
              fm.can_manage_members, fm.can_manage_categories,
              fm.can_manage_investments, fm.can_manage_loans, fm.can_export,
              (SELECT COUNT(*) FROM finance_members WHERE tracker_id = ft.id) AS member_count,
              u.username AS owner_name
       FROM finance_trackers ft
       JOIN finance_members fm ON fm.tracker_id = ft.id AND fm.user_id = $1
       JOIN users u ON u.id = ft.user_id
       ORDER BY ft.updated_at DESC`,
            [req.user.user_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /finance/overview — Get total income and expenses across all active trackers for the user
router.get('/overview', verifyToken, async (req, res) => {
    try {
        const stats = await db.query(
            `SELECT
                COALESCE(SUM(CASE WHEN ft.type='income' THEN ft.amount ELSE 0 END), 0) AS total_income,
                COALESCE(SUM(CASE WHEN ft.type='expense' THEN ft.amount ELSE 0 END), 0) AS total_expense
             FROM finance_transactions ft
             JOIN finance_members fm ON fm.tracker_id = ft.tracker_id AND fm.user_id = $1`,
            [req.user.user_id]
        );
        res.json({
            total_income: parseFloat(stats.rows[0].total_income),
            total_expense: parseFloat(stats.rows[0].total_expense)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /finance/:id — Get single tracker with summary stats
router.get('/:id', verifyToken, checkMembership('can_read'), async (req, res) => {
    try {
        const tracker = await db.query('SELECT * FROM finance_trackers WHERE id = $1', [req.params.id]);
        if (tracker.rows.length === 0) return res.status(404).json({ error: 'Tracker not found' });

        // Summary stats
        const stats = await db.query(
            `SELECT
        COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS total_expense,
        COUNT(*) AS transaction_count
       FROM finance_transactions WHERE tracker_id = $1`,
            [req.params.id]
        );

        const loansStats = await db.query(
            `SELECT
        COALESCE(SUM(CASE WHEN type='borrowed' AND status='active' THEN amount ELSE 0 END), 0) AS total_borrowed,
        COALESCE(SUM(CASE WHEN type='given' AND status='active' THEN amount ELSE 0 END), 0) AS total_given
       FROM finance_loans WHERE tracker_id = $1`,
            [req.params.id]
        );

        res.json({
            ...tracker.rows[0],
            permissions: req.membership,
            stats: {
                ...stats.rows[0],
                balance: parseFloat(stats.rows[0].total_income) - parseFloat(stats.rows[0].total_expense),
                ...loansStats.rows[0],
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /finance/:id — Update tracker
router.put('/:id', verifyToken, checkMembership('can_write'), async (req, res) => {
    const { name, type, currency, description, enabled_sections } = req.body;
    // Only owner can change type/currency/sections
    if (!req.membership.is_owner && (type || currency || enabled_sections)) {
        return res.status(403).json({ error: 'Only the owner can change tracker type, currency, or sections' });
    }
    try {
        const result = await db.query(
            `UPDATE finance_trackers SET
        name = COALESCE($1, name), type = COALESCE($2, type),
        currency = COALESCE($3, currency), description = COALESCE($4, description),
        enabled_sections = COALESCE($5, enabled_sections),
        updated_at = NOW()
       WHERE id = $6 RETURNING *`,
            [name, type, currency, description, enabled_sections ? JSON.stringify(enabled_sections) : null, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /finance/:id — Delete tracker (owner only)
router.delete('/:id', verifyToken, checkMembership('can_read'), async (req, res) => {
    if (!req.membership.is_owner) {
        return res.status(403).json({ error: 'Only the owner can delete a tracker' });
    }
    try {
        await db.query('DELETE FROM finance_trackers WHERE id = $1', [req.params.id]);
        res.json({ message: 'Tracker deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ MEMBER MANAGEMENT ============

// POST /finance/:id/members — Invite member by username
router.post('/:id/members', verifyToken, checkMembership('can_manage_members'), async (req, res) => {
    const { username, permissions = {} } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });

    try {
        // Find user by username
        const userResult = await db.query('SELECT id, username FROM users WHERE username = $1', [username]);
        if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });

        const targetUser = userResult.rows[0];
        if (targetUser.id === req.user.user_id) return res.status(400).json({ error: 'Cannot invite yourself' });

        // Check not already a member
        const existing = await db.query(
            'SELECT id FROM finance_members WHERE tracker_id = $1 AND user_id = $2',
            [req.params.id, targetUser.id]
        );
        if (existing.rows.length > 0) return res.status(400).json({ error: 'User is already a member' });

        const result = await db.query(
            `INSERT INTO finance_members (tracker_id, user_id, is_owner,
        can_read, can_write, can_delete, can_manage_members,
        can_manage_categories, can_manage_investments, can_manage_loans, can_export, invited_by)
       VALUES ($1, $2, FALSE, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [
                req.params.id, targetUser.id,
                permissions.can_read !== false,       // default true
                permissions.can_write || false,
                permissions.can_delete || false,
                permissions.can_manage_members || false,
                permissions.can_manage_categories || false,
                permissions.can_manage_investments || false,
                permissions.can_manage_loans || false,
                permissions.can_export !== false,      // default true
                req.user.user_id,
            ]
        );

        res.status(201).json({ ...result.rows[0], username: targetUser.username });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /finance/:id/members — List members
router.get('/:id/members', verifyToken, checkMembership('can_read'), async (req, res) => {
    try {
        const result = await db.query(
            `SELECT fm.*, u.username, u.email, u.profile_pic,
              inv.username AS invited_by_name
       FROM finance_members fm
       JOIN users u ON u.id = fm.user_id
       LEFT JOIN users inv ON inv.id = fm.invited_by
       WHERE fm.tracker_id = $1
       ORDER BY fm.is_owner DESC, fm.joined_at ASC`,
            [req.params.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /finance/:id/members/:userId — Update member permissions
router.put('/:id/members/:userId', verifyToken, checkMembership('can_manage_members'), async (req, res) => {
    const { permissions } = req.body;
    const targetUserId = parseInt(req.params.userId);

    try {
        // Prevent modifying owner
        const target = await db.query(
            'SELECT is_owner FROM finance_members WHERE tracker_id = $1 AND user_id = $2',
            [req.params.id, targetUserId]
        );
        if (target.rows.length === 0) return res.status(404).json({ error: 'Member not found' });
        if (target.rows[0].is_owner) return res.status(403).json({ error: 'Cannot modify owner permissions' });

        // Non-owner managers cannot grant can_manage_members to others
        if (!req.membership.is_owner && permissions.can_manage_members) {
            return res.status(403).json({ error: 'Only the owner can delegate member management' });
        }

        const result = await db.query(
            `UPDATE finance_members SET
        can_read = COALESCE($1, can_read),
        can_write = COALESCE($2, can_write),
        can_delete = COALESCE($3, can_delete),
        can_manage_members = COALESCE($4, can_manage_members),
        can_manage_categories = COALESCE($5, can_manage_categories),
        can_manage_investments = COALESCE($6, can_manage_investments),
        can_manage_loans = COALESCE($7, can_manage_loans),
        can_export = COALESCE($8, can_export)
       WHERE tracker_id = $9 AND user_id = $10 RETURNING *`,
            [
                permissions.can_read, permissions.can_write, permissions.can_delete,
                permissions.can_manage_members, permissions.can_manage_categories,
                permissions.can_manage_investments, permissions.can_manage_loans,
                permissions.can_export,
                req.params.id, targetUserId,
            ]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /finance/:id/members/:userId — Remove member
router.delete('/:id/members/:userId', verifyToken, checkMembership('can_manage_members'), async (req, res) => {
    const targetUserId = parseInt(req.params.userId);
    try {
        const target = await db.query(
            'SELECT is_owner FROM finance_members WHERE tracker_id = $1 AND user_id = $2',
            [req.params.id, targetUserId]
        );
        if (target.rows.length === 0) return res.status(404).json({ error: 'Member not found' });
        if (target.rows[0].is_owner) return res.status(403).json({ error: 'Cannot remove the owner' });

        await db.query(
            'DELETE FROM finance_members WHERE tracker_id = $1 AND user_id = $2',
            [req.params.id, targetUserId]
        );
        res.json({ message: 'Member removed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ CATEGORIES ============

// GET /finance/:id/categories — List categories (tree)
router.get('/:id/categories', verifyToken, checkMembership('can_read'), async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM finance_categories WHERE tracker_id = $1 ORDER BY is_default DESC, name ASC',
            [req.params.id]
        );
        // Build tree structure
        const categories = result.rows;
        const topLevel = categories.filter(c => !c.parent_id);
        const tree = topLevel.map(cat => ({
            ...cat,
            children: categories.filter(c => c.parent_id === cat.id),
        }));
        res.json(tree);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /finance/:id/categories — Create category
router.post('/:id/categories', verifyToken, checkMembership('can_manage_categories'), async (req, res) => {
    const { name, parent_id, icon = '📂', color = '#6366f1', type = 'expense' } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name required' });

    try {
        const result = await db.query(
            `INSERT INTO finance_categories (tracker_id, parent_id, name, icon, color, type)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [req.params.id, parent_id || null, name, icon, color, type]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /finance/categories/:catId — Update category
router.put('/categories/:catId', verifyToken, async (req, res) => {
    const { name, icon, color, type, parent_id } = req.body;
    try {
        // Get tracker_id from category
        const cat = await db.query('SELECT tracker_id FROM finance_categories WHERE id = $1', [req.params.catId]);
        if (cat.rows.length === 0) return res.status(404).json({ error: 'Category not found' });

        // Check membership
        const mem = await db.query(
            'SELECT * FROM finance_members WHERE tracker_id = $1 AND user_id = $2',
            [cat.rows[0].tracker_id, req.user.user_id]
        );
        if (mem.rows.length === 0 || (!mem.rows[0].is_owner && !mem.rows[0].can_manage_categories)) {
            return res.status(403).json({ error: 'No permission to manage categories' });
        }

        // If parent_id is provided, validate it belongs to the same tracker
        if (parent_id !== undefined && parent_id !== null) {
            const parentCat = await db.query(
                'SELECT id FROM finance_categories WHERE id = $1 AND tracker_id = $2',
                [parent_id, cat.rows[0].tracker_id]
            );
            if (parentCat.rows.length === 0) return res.status(400).json({ error: 'Parent category not found in this tracker' });
            // Prevent setting self as parent
            if (parseInt(parent_id) === parseInt(req.params.catId)) {
                return res.status(400).json({ error: 'Cannot set category as its own parent' });
            }
        }

        const result = await db.query(
            `UPDATE finance_categories SET
        name = COALESCE($1, name), icon = COALESCE($2, icon),
        color = COALESCE($3, color), type = COALESCE($4, type),
        parent_id = $5
       WHERE id = $6 RETURNING *`,
            [name, icon, color, type, parent_id !== undefined ? (parent_id || null) : cat.rows[0].parent_id, req.params.catId]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /finance/categories/:catId
router.delete('/categories/:catId', verifyToken, async (req, res) => {
    try {
        const cat = await db.query('SELECT tracker_id, is_default FROM finance_categories WHERE id = $1', [req.params.catId]);
        if (cat.rows.length === 0) return res.status(404).json({ error: 'Category not found' });

        const mem = await db.query(
            'SELECT * FROM finance_members WHERE tracker_id = $1 AND user_id = $2',
            [cat.rows[0].tracker_id, req.user.user_id]
        );
        if (mem.rows.length === 0 || (!mem.rows[0].is_owner && !mem.rows[0].can_manage_categories)) {
            return res.status(403).json({ error: 'No permission to manage categories' });
        }

        await db.query('DELETE FROM finance_categories WHERE id = $1', [req.params.catId]);
        res.json({ message: 'Category deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ BALANCE SOURCES ============

// GET /finance/:id/balance-sources
router.get('/:id/balance-sources', verifyToken, checkMembership('can_read'), async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM finance_balance_sources WHERE tracker_id = $1 ORDER BY created_at ASC',
            [req.params.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /finance/:id/balance-sources
router.post('/:id/balance-sources', verifyToken, checkMembership('can_write'), async (req, res) => {
    const { name, icon = '🏦', initial_balance = 0 } = req.body;
    if (!name) return res.status(400).json({ error: 'Source name required' });
    try {
        const result = await db.query(
            'INSERT INTO finance_balance_sources (tracker_id, name, icon, initial_balance) VALUES ($1, $2, $3, $4) RETURNING *',
            [req.params.id, name, icon, initial_balance]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /finance/balance-sources/:srcId
router.put('/balance-sources/:srcId', verifyToken, async (req, res) => {
    const { name, icon, initial_balance } = req.body;
    try {
        const src = await db.query('SELECT tracker_id FROM finance_balance_sources WHERE id = $1', [req.params.srcId]);
        if (src.rows.length === 0) return res.status(404).json({ error: 'Source not found' });

        const mem = await db.query(
            'SELECT * FROM finance_members WHERE tracker_id = $1 AND user_id = $2',
            [src.rows[0].tracker_id, req.user.user_id]
        );
        if (mem.rows.length === 0 || (!mem.rows[0].is_owner && !mem.rows[0].can_write)) {
            return res.status(403).json({ error: 'No permission' });
        }

        const result = await db.query(
            `UPDATE finance_balance_sources SET
        name = COALESCE($1, name), icon = COALESCE($2, icon),
        initial_balance = COALESCE($3, initial_balance)
       WHERE id = $4 RETURNING *`,
            [name, icon, initial_balance, req.params.srcId]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /finance/balance-sources/:srcId
router.delete('/balance-sources/:srcId', verifyToken, async (req, res) => {
    try {
        const src = await db.query('SELECT tracker_id FROM finance_balance_sources WHERE id = $1', [req.params.srcId]);
        if (src.rows.length === 0) return res.status(404).json({ error: 'Source not found' });

        const mem = await db.query(
            'SELECT * FROM finance_members WHERE tracker_id = $1 AND user_id = $2',
            [src.rows[0].tracker_id, req.user.user_id]
        );
        if (mem.rows.length === 0 || (!mem.rows[0].is_owner && !mem.rows[0].can_write)) {
            return res.status(403).json({ error: 'No permission' });
        }

        await db.query('DELETE FROM finance_balance_sources WHERE id = $1', [req.params.srcId]);
        res.json({ message: 'Source deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ TRANSACTIONS ============

// GET /finance/:id/transactions — List with filters
router.get('/:id/transactions', verifyToken, checkMembership('can_read'), async (req, res) => {
    const { from, to, category_id, type, limit = 50, offset = 0 } = req.query;

    let query = `
    SELECT ft.*, fc.name AS category_name, fc.icon AS category_icon, fc.color AS category_color,
           u.username AS entered_by
    FROM finance_transactions ft
    LEFT JOIN finance_categories fc ON fc.id = ft.category_id
    LEFT JOIN users u ON u.id = ft.user_id
    WHERE ft.tracker_id = $1`;
    const params = [req.params.id];
    let i = 2;

    if (from) { query += ` AND ft.date >= $${i}`; params.push(from); i++; }
    if (to) { query += ` AND ft.date <= $${i}`; params.push(to); i++; }
    if (category_id) { query += ` AND ft.category_id = $${i}`; params.push(category_id); i++; }
    if (type) { query += ` AND ft.type = $${i}`; params.push(type); i++; }

    query += ` ORDER BY ft.date DESC, ft.created_at DESC LIMIT $${i} OFFSET $${i + 1}`;
    params.push(limit, offset);

    try {
        const result = await db.query(query, params);

        // Also get total count for pagination
        let countQuery = 'SELECT COUNT(*) FROM finance_transactions WHERE tracker_id = $1';
        const countParams = [req.params.id];
        let ci = 2;
        if (from) { countQuery += ` AND date >= $${ci}`; countParams.push(from); ci++; }
        if (to) { countQuery += ` AND date <= $${ci}`; countParams.push(to); ci++; }
        if (category_id) { countQuery += ` AND category_id = $${ci}`; countParams.push(category_id); ci++; }
        if (type) { countQuery += ` AND type = $${ci}`; countParams.push(type); ci++; }

        const countResult = await db.query(countQuery, countParams);

        res.json({
            transactions: result.rows,
            total: parseInt(countResult.rows[0].count),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /finance/:id/transactions — Create transaction
router.post('/:id/transactions', verifyToken, checkMembership('can_write'), async (req, res) => {
    const { category_id, type = 'expense', amount, date, description, recurring = 'none' } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount required' });

    try {
        const result = await db.query(
            `INSERT INTO finance_transactions (tracker_id, user_id, category_id, type, amount, date, description, recurring)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [req.params.id, req.user.user_id, category_id || null, type, amount, date || new Date(), description || '', recurring]
        );

        // Update tracker timestamp
        await db.query('UPDATE finance_trackers SET updated_at = NOW() WHERE id = $1', [req.params.id]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /finance/transactions/:txId — Update transaction
router.put('/transactions/:txId', verifyToken, async (req, res) => {
    const { category_id, type, amount, date, description, recurring } = req.body;
    try {
        const tx = await db.query('SELECT tracker_id FROM finance_transactions WHERE id = $1', [req.params.txId]);
        if (tx.rows.length === 0) return res.status(404).json({ error: 'Transaction not found' });

        const mem = await db.query(
            'SELECT * FROM finance_members WHERE tracker_id = $1 AND user_id = $2',
            [tx.rows[0].tracker_id, req.user.user_id]
        );
        if (mem.rows.length === 0 || (!mem.rows[0].is_owner && !mem.rows[0].can_write)) {
            return res.status(403).json({ error: 'No write permission' });
        }

        const result = await db.query(
            `UPDATE finance_transactions SET
        category_id = COALESCE($1, category_id), type = COALESCE($2, type),
        amount = COALESCE($3, amount), date = COALESCE($4, date),
        description = COALESCE($5, description), recurring = COALESCE($6, recurring),
        updated_at = NOW()
       WHERE id = $7 RETURNING *`,
            [category_id, type, amount, date, description, recurring, req.params.txId]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /finance/transactions/:txId
router.delete('/transactions/:txId', verifyToken, async (req, res) => {
    try {
        const tx = await db.query('SELECT tracker_id FROM finance_transactions WHERE id = $1', [req.params.txId]);
        if (tx.rows.length === 0) return res.status(404).json({ error: 'Transaction not found' });

        const mem = await db.query(
            'SELECT * FROM finance_members WHERE tracker_id = $1 AND user_id = $2',
            [tx.rows[0].tracker_id, req.user.user_id]
        );
        if (mem.rows.length === 0 || (!mem.rows[0].is_owner && !mem.rows[0].can_delete)) {
            return res.status(403).json({ error: 'No delete permission' });
        }

        await db.query('DELETE FROM finance_transactions WHERE id = $1', [req.params.txId]);
        res.json({ message: 'Transaction deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ STATS (aggregated) ============

// GET /finance/:id/stats?period=monthly&from=&to=
router.get('/:id/stats', verifyToken, checkMembership('can_read'), async (req, res) => {
    const { period = 'monthly', from, to } = req.query;

    // Date truncation for grouping
    const truncMap = {
        daily: 'day', weekly: 'week', monthly: 'month', quarterly: 'quarter', yearly: 'year'
    };
    const trunc = truncMap[period] || 'month';

    let dateFilter = '';
    const params = [req.params.id];
    let i = 2;
    if (from) { dateFilter += ` AND date >= $${i}`; params.push(from); i++; }
    if (to) { dateFilter += ` AND date <= $${i}`; params.push(to); i++; }

    try {
        // Trend data
        const trend = await db.query(
            `SELECT DATE_TRUNC('${trunc}', date) AS period,
              type,
              SUM(amount) AS total
       FROM finance_transactions
       WHERE tracker_id = $1 ${dateFilter}
       GROUP BY period, type
       ORDER BY period ASC`,
            params
        );

        // Category breakdown
        const catBreakdown = await db.query(
            `SELECT fc.name, fc.icon, fc.color, ft.type,
              SUM(ft.amount) AS total
       FROM finance_transactions ft
       LEFT JOIN finance_categories fc ON fc.id = ft.category_id
       WHERE ft.tracker_id = $1 ${dateFilter}
       GROUP BY fc.name, fc.icon, fc.color, ft.type
       ORDER BY total DESC`,
            params
        );

        // Restructure trend into { period, income, expense } rows
        const periodMap = {};
        for (const row of trend.rows) {
            const key = row.period.toISOString().split('T')[0];
            if (!periodMap[key]) periodMap[key] = { period: key, income: 0, expense: 0 };
            periodMap[key][row.type] = parseFloat(row.total);
        }

        res.json({
            trend: Object.values(periodMap),
            categoryBreakdown: catBreakdown.rows.map(r => ({ ...r, total: parseFloat(r.total) })),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ INVESTMENTS ============

// GET /finance/:id/investments
router.get('/:id/investments', verifyToken, checkMembership('can_read'), async (req, res) => {
    try {
        const result = await db.query(
            `SELECT fi.*,
              COALESCE((SELECT SUM(fd.amount) FROM finance_dividends fd WHERE fd.investment_id = fi.id), 0) AS total_dividends
       FROM finance_investments fi
       WHERE fi.tracker_id = $1
       ORDER BY fi.created_at DESC`,
            [req.params.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /finance/:id/investments
router.post('/:id/investments', verifyToken, checkMembership('can_manage_investments'), async (req, res) => {
    const { name, type = 'stock', symbol, units, buy_price, current_price, buy_date, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Investment name required' });

    try {
        const result = await db.query(
            `INSERT INTO finance_investments (tracker_id, name, type, symbol, units, buy_price, current_price, buy_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [req.params.id, name, type, symbol || '', units || 0, buy_price || 0, current_price || 0, buy_date || null, notes || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /finance/investments/:invId
router.put('/investments/:invId', verifyToken, async (req, res) => {
    const { name, type, symbol, units, buy_price, current_price, buy_date, notes } = req.body;
    try {
        const inv = await db.query('SELECT tracker_id FROM finance_investments WHERE id = $1', [req.params.invId]);
        if (inv.rows.length === 0) return res.status(404).json({ error: 'Investment not found' });

        const mem = await db.query(
            'SELECT * FROM finance_members WHERE tracker_id = $1 AND user_id = $2',
            [inv.rows[0].tracker_id, req.user.user_id]
        );
        if (mem.rows.length === 0 || (!mem.rows[0].is_owner && !mem.rows[0].can_manage_investments)) {
            return res.status(403).json({ error: 'No permission to manage investments' });
        }

        const result = await db.query(
            `UPDATE finance_investments SET
        name = COALESCE($1, name), type = COALESCE($2, type), symbol = COALESCE($3, symbol),
        units = COALESCE($4, units), buy_price = COALESCE($5, buy_price),
        current_price = COALESCE($6, current_price), buy_date = COALESCE($7, buy_date),
        notes = COALESCE($8, notes), updated_at = NOW()
       WHERE id = $9 RETURNING *`,
            [name, type, symbol, units, buy_price, current_price, buy_date, notes, req.params.invId]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /finance/investments/:invId
router.delete('/investments/:invId', verifyToken, async (req, res) => {
    try {
        const inv = await db.query('SELECT tracker_id FROM finance_investments WHERE id = $1', [req.params.invId]);
        if (inv.rows.length === 0) return res.status(404).json({ error: 'Investment not found' });

        const mem = await db.query(
            'SELECT * FROM finance_members WHERE tracker_id = $1 AND user_id = $2',
            [inv.rows[0].tracker_id, req.user.user_id]
        );
        if (mem.rows.length === 0 || (!mem.rows[0].is_owner && !mem.rows[0].can_manage_investments)) {
            return res.status(403).json({ error: 'No permission' });
        }

        await db.query('DELETE FROM finance_investments WHERE id = $1', [req.params.invId]);
        res.json({ message: 'Investment deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ DIVIDENDS ============

// GET /finance/investments/:invId/dividends
router.get('/investments/:invId/dividends', verifyToken, async (req, res) => {
    try {
        const inv = await db.query('SELECT tracker_id FROM finance_investments WHERE id = $1', [req.params.invId]);
        if (inv.rows.length === 0) return res.status(404).json({ error: 'Investment not found' });

        const mem = await db.query(
            'SELECT * FROM finance_members WHERE tracker_id = $1 AND user_id = $2',
            [inv.rows[0].tracker_id, req.user.user_id]
        );
        if (mem.rows.length === 0 || (!mem.rows[0].is_owner && !mem.rows[0].can_read)) {
            return res.status(403).json({ error: 'No read permission' });
        }

        const result = await db.query(
            'SELECT * FROM finance_dividends WHERE investment_id = $1 ORDER BY date DESC',
            [req.params.invId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /finance/investments/:invId/dividends
router.post('/investments/:invId/dividends', verifyToken, async (req, res) => {
    const { amount, date, notes } = req.body;
    if (!amount) return res.status(400).json({ error: 'Dividend amount required' });

    try {
        const inv = await db.query('SELECT tracker_id FROM finance_investments WHERE id = $1', [req.params.invId]);
        if (inv.rows.length === 0) return res.status(404).json({ error: 'Investment not found' });

        const mem = await db.query(
            'SELECT * FROM finance_members WHERE tracker_id = $1 AND user_id = $2',
            [inv.rows[0].tracker_id, req.user.user_id]
        );
        if (mem.rows.length === 0 || (!mem.rows[0].is_owner && !mem.rows[0].can_manage_investments)) {
            return res.status(403).json({ error: 'No permission' });
        }

        const result = await db.query(
            'INSERT INTO finance_dividends (investment_id, amount, date, notes) VALUES ($1, $2, $3, $4) RETURNING *',
            [req.params.invId, amount, date || new Date(), notes || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ LOANS ============

// GET /finance/:id/loans
router.get('/:id/loans', verifyToken, checkMembership('can_read'), async (req, res) => {
    const { type, status } = req.query;
    let query = 'SELECT * FROM finance_loans WHERE tracker_id = $1';
    const params = [req.params.id];
    let i = 2;
    if (type) { query += ` AND type = $${i}`; params.push(type); i++; }
    if (status) { query += ` AND status = $${i}`; params.push(status); i++; }
    query += ' ORDER BY loan_date DESC';

    try {
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /finance/:id/loans
router.post('/:id/loans', verifyToken, checkMembership('can_manage_loans'), async (req, res) => {
    const { type = 'borrowed', person_name, amount, purpose, loan_date, expected_payback_date, notes } = req.body;
    if (!person_name || !amount) return res.status(400).json({ error: 'Person name and amount required' });

    try {
        const result = await db.query(
            `INSERT INTO finance_loans (tracker_id, type, person_name, amount, purpose, loan_date, expected_payback_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [req.params.id, type, person_name, amount, purpose || '', loan_date || new Date(), expected_payback_date || null, notes || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /finance/loans/:loanId
router.put('/loans/:loanId', verifyToken, async (req, res) => {
    const { type, person_name, amount, purpose, loan_date, expected_payback_date, actual_payback_date, status, notes } = req.body;
    try {
        const loan = await db.query('SELECT tracker_id FROM finance_loans WHERE id = $1', [req.params.loanId]);
        if (loan.rows.length === 0) return res.status(404).json({ error: 'Loan not found' });

        const mem = await db.query(
            'SELECT * FROM finance_members WHERE tracker_id = $1 AND user_id = $2',
            [loan.rows[0].tracker_id, req.user.user_id]
        );
        if (mem.rows.length === 0 || (!mem.rows[0].is_owner && !mem.rows[0].can_manage_loans)) {
            return res.status(403).json({ error: 'No permission to manage loans' });
        }

        const result = await db.query(
            `UPDATE finance_loans SET
        type = COALESCE($1, type), person_name = COALESCE($2, person_name),
        amount = COALESCE($3, amount), purpose = COALESCE($4, purpose),
        loan_date = COALESCE($5, loan_date), expected_payback_date = COALESCE($6, expected_payback_date),
        actual_payback_date = COALESCE($7, actual_payback_date), status = COALESCE($8, status),
        notes = COALESCE($9, notes), updated_at = NOW()
       WHERE id = $10 RETURNING *`,
            [type, person_name, amount, purpose, loan_date, expected_payback_date, actual_payback_date, status, notes, req.params.loanId]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /finance/loans/:loanId
router.delete('/loans/:loanId', verifyToken, async (req, res) => {
    try {
        const loan = await db.query('SELECT tracker_id FROM finance_loans WHERE id = $1', [req.params.loanId]);
        if (loan.rows.length === 0) return res.status(404).json({ error: 'Loan not found' });

        const mem = await db.query(
            'SELECT * FROM finance_members WHERE tracker_id = $1 AND user_id = $2',
            [loan.rows[0].tracker_id, req.user.user_id]
        );
        if (mem.rows.length === 0 || (!mem.rows[0].is_owner && !mem.rows[0].can_delete)) {
            return res.status(403).json({ error: 'No delete permission' });
        }

        await db.query('DELETE FROM finance_loans WHERE id = $1', [req.params.loanId]);
        res.json({ message: 'Loan deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ EXPORT ============

// GET /finance/:id/export?section=transactions|investments|loans&format=csv&from=&to=&category_id=
router.get('/:id/export', verifyToken, checkMembership('can_export'), async (req, res) => {
    const { section = 'transactions', from, to, category_id } = req.query;

    try {
        let rows = [];
        let headers = [];

        if (section === 'transactions') {
            headers = ['Date', 'Type', 'Category', 'Amount', 'Description', 'Entered By'];
            let query = `
        SELECT ft.date, ft.type, COALESCE(fc.name, 'Uncategorized') AS category,
               ft.amount, ft.description, COALESCE(u.username, '') AS entered_by
        FROM finance_transactions ft
        LEFT JOIN finance_categories fc ON fc.id = ft.category_id
        LEFT JOIN users u ON u.id = ft.user_id
        WHERE ft.tracker_id = $1`;
            const params = [req.params.id];
            let i = 2;
            if (from) { query += ` AND ft.date >= $${i}`; params.push(from); i++; }
            if (to) { query += ` AND ft.date <= $${i}`; params.push(to); i++; }
            if (category_id) { query += ` AND ft.category_id = $${i}`; params.push(category_id); i++; }
            query += ' ORDER BY ft.date DESC';
            const result = await db.query(query, params);
            rows = result.rows.map(r => [r.date, r.type, r.category, r.amount, r.description || '', r.entered_by]);

        } else if (section === 'investments') {
            headers = ['Name', 'Type', 'Symbol', 'Units', 'Buy Price', 'Current Price', 'Total Value', 'Gain/Loss', 'Total Dividends'];
            const result = await db.query(
                `SELECT fi.*,
                COALESCE((SELECT SUM(fd.amount) FROM finance_dividends fd WHERE fd.investment_id = fi.id), 0) AS total_dividends
         FROM finance_investments fi WHERE fi.tracker_id = $1 ORDER BY fi.name`,
                [req.params.id]
            );
            rows = result.rows.map(r => {
                const totalVal = parseFloat(r.units) * parseFloat(r.current_price);
                const totalCost = parseFloat(r.units) * parseFloat(r.buy_price);
                return [r.name, r.type, r.symbol || '', r.units, r.buy_price, r.current_price, totalVal.toFixed(2), (totalVal - totalCost).toFixed(2), r.total_dividends];
            });

        } else if (section === 'loans') {
            headers = ['Type', 'Person', 'Amount', 'Purpose', 'Loan Date', 'Expected Payback', 'Actual Payback', 'Status'];
            const result = await db.query(
                'SELECT * FROM finance_loans WHERE tracker_id = $1 ORDER BY loan_date DESC',
                [req.params.id]
            );
            rows = result.rows.map(r => [r.type, r.person_name, r.amount, r.purpose || '', r.loan_date, r.expected_payback_date || '', r.actual_payback_date || '', r.status]);
        }

        // Build CSV
        const escapeCsv = (val) => {
            const str = String(val ?? '');
            return str.includes(',') || str.includes('"') || str.includes('\n')
                ? `"${str.replace(/"/g, '""')}"` : str;
        };

        const csv = [headers.join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=finance_${section}_export.csv`);
        res.send(csv);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

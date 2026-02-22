const express = require('express');
const router = express.Router();
const userModel = require('../models/userModel');
const verifyToken = require('../middleware/authMiddleware');

// GET /dashboard/layout - Get saved layout for the logged-in user
router.get('/layout', verifyToken, async (req, res) => {
    try {
        const result = await userModel.getDashboardLayout(req.user.user_id);
        res.json(result || { layout: [], hidden_widgets: [] });
    } catch (err) {
        console.error('Error fetching dashboard layout:', err);
        res.status(500).json({ error: 'Failed to fetch layout' });
    }
});

// PUT /dashboard/layout - Save layout for the logged-in user
router.put('/layout', verifyToken, async (req, res) => {
    try {
        const { layout, hidden_widgets } = req.body;
        await userModel.saveDashboardLayout(req.user.user_id, layout || [], hidden_widgets || []);
        res.json({ message: 'Layout saved' });
    } catch (err) {
        console.error('Error saving dashboard layout:', err);
        res.status(500).json({ error: 'Failed to save layout' });
    }
});

module.exports = router;

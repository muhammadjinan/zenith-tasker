const express = require('express');
const router = express.Router();
const userModel = require('../models/userModel');
const verifyToken = require('../middleware/authMiddleware');

// Middleware to check admin status
const requireAdmin = async (req, res, next) => {
    try {
        const user = await userModel.findUserById(req.user.user_id);
        if (!user || !user.is_admin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Get all users (Admin only)
router.get('/users', verifyToken, requireAdmin, async (req, res) => {
    try {
        const users = await userModel.getAllUsers();
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Allow password reset for a user (Admin only)
// Sets a 24-hour window for the user to reset without email
router.post('/users/:id/allow-reset', verifyToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { hours } = req.body; // Optional, default 24 hours

    try {
        const user = await userModel.findUserById(parseInt(id));
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const expiresAt = await userModel.setResetAllowed(user.id, hours || 24);
        res.json({
            message: `Password reset enabled for ${user.username} until ${expiresAt.toISOString()}`,
            expiresAt
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Revoke password reset permission (Admin only)
router.delete('/users/:id/allow-reset', verifyToken, requireAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        await userModel.clearResetAllowed(parseInt(id));
        res.json({ message: 'Password reset permission revoked' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;

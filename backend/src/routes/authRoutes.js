const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db');
const userModel = require('../models/userModel');
const verifyToken = require('../middleware/authMiddleware');
const { upload, processProfilePic, deleteProfilePic } = require('../middleware/uploadMiddleware');
const { sendPasswordResetEmail, isEmailConfigured } = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
}
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ============ Auth Endpoints ============

// Register
router.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const existingUser = await userModel.findUserByUsername(username);
        if (existingUser) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        const user = await userModel.createUser(username, password);

        const token = jwt.sign(
            { user_id: user.id, username: username },
            JWT_SECRET,
            { expiresIn: "2h" }
        );

        res.status(201).json({ ...user, token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const user = await userModel.findUserByUsername(username);

        if (user && (await bcrypt.compare(password, user.password))) {
            const token = jwt.sign(
                { user_id: user.id, username: username },
                JWT_SECRET,
                { expiresIn: "2h" }
            );

            // Check if user was inactive and reactivate
            if (user.status === 'inactive') {
                await db.query('UPDATE users SET status = $1 WHERE id = $2', ['active', user.id]);
                console.log(`[Auth] Reactivated user: ${user.username}`);
            }

            return res.status(200).json({
                id: user.id,
                username: user.username,
                email: user.email,
                profile_pic: user.profile_pic,
                is_admin: user.is_admin,
                created_at: user.created_at,
                token
            });
        }
        res.status(400).json({ error: 'Invalid Credentials' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get current user (Protected)
router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await userModel.findUserById(req.user.user_id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ============ Profile Endpoints ============

// Update profile (Protected)
router.put('/profile', verifyToken, async (req, res) => {
    const { username, email } = req.body;

    try {
        // Check if username is taken by another user
        if (username) {
            const existing = await userModel.findUserByUsername(username);
            if (existing && existing.id !== req.user.user_id) {
                return res.status(409).json({ error: 'Username already taken' });
            }
        }

        // Check if email is taken by another user
        if (email) {
            const existing = await userModel.findUserByEmail(email);
            if (existing && existing.id !== req.user.user_id) {
                return res.status(409).json({ error: 'Email already in use' });
            }
        }

        const updatedUser = await userModel.updateProfile(req.user.user_id, { username, email });
        res.json(updatedUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Upload profile picture (Protected)
router.post('/profile/picture', verifyToken, upload.single('picture'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Get current profile pic to delete later
        const currentUser = await userModel.findUserById(req.user.user_id);
        const oldPic = currentUser?.profile_pic;

        // Process and save new picture
        const filename = await processProfilePic(req.file.buffer, req.user.user_id);

        // Update user profile
        const updatedUser = await userModel.updateProfile(req.user.user_id, { profilePic: filename });

        // Delete old picture
        if (oldPic) {
            deleteProfilePic(oldPic);
        }

        res.json(updatedUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || 'Failed to upload picture' });
    }
});

// ============ Password Endpoints ============

// Change password (Protected - requires current password)
router.put('/change-password', verifyToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    try {
        // Verify current password
        const user = await userModel.findUserByUsername(req.user.username);
        if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        await userModel.updatePassword(req.user.user_id, newPassword);
        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Forgot password - request reset (accepts username or email)
router.post('/forgot-password', async (req, res) => {
    const { identifier } = req.body; // Can be username or email

    if (!identifier) {
        return res.status(400).json({ error: 'Username or email is required' });
    }

    try {
        // Try to find by username first, then by email
        let user = await userModel.findUserByUsername(identifier);
        if (!user) {
            user = await userModel.findUserByEmail(identifier);
        }

        if (!user) {
            // Don't reveal if user exists
            return res.json({ message: 'If an account exists, reset instructions have been sent.' });
        }

        // Check if admin has allowed reset (no email required)
        const resetAllowed = await userModel.isResetAllowed(user.id);
        if (resetAllowed) {
            const token = await userModel.createResetToken(user.id);
            // Return redirect URL instead of exposing token directly in response body
            // This follows standard password reset flow - user clicks link to reset
            return res.json({
                message: 'Admin has enabled password reset for your account.',
                resetAvailable: true,
                redirectUrl: `/reset-password?token=${token}`
            });
        }

        // Check if user has email configured
        if (!user.email) {
            return res.status(400).json({
                error: 'No email configured. Contact an administrator for password reset.',
                noEmail: true
            });
        }

        // Check if email service is configured
        if (!isEmailConfigured()) {
            return res.status(500).json({ error: 'Email service not configured. Contact administrator.' });
        }

        // Create reset token and send email
        const token = await userModel.createResetToken(user.id);
        const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;

        const sent = await sendPasswordResetEmail(user.email, resetLink);
        if (!sent) {
            return res.status(500).json({ error: 'Failed to send email. Try again later.' });
        }

        res.json({ message: 'Password reset email sent. Check your inbox.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    try {
        // Find valid reset token
        const resetRecord = await userModel.findByResetToken(token);
        if (!resetRecord) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        // Update password
        await userModel.updatePassword(resetRecord.user_id, newPassword);

        // Delete token and clear admin reset flag
        await userModel.deleteResetToken(token);
        await userModel.clearResetAllowed(resetRecord.user_id);

        res.json({ message: 'Password reset successfully. You can now log in.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Google Registration Route
router.post('/register-google', async (req, res) => {
    try {
        const { username, googleToken } = req.body;

        if (!username || !googleToken) {
            return res.status(400).json({ error: 'Username and signup token are required' });
        }

        // Verify signup token
        let profile;
        try {
            profile = jwt.verify(googleToken, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(400).json({ error: 'Invalid or expired signup session' });
        }

        // Check if username taken
        const existingUser = await userModel.findUserByUsername(username);
        if (existingUser) {
            return res.status(409).json({ error: 'Username already taken' });
        }

        // Create user
        const newUser = await userModel.createGoogleUser(username, profile.email, profile.googleId, profile.profilePic);

        // Generate Login Token
        const token = jwt.sign(
            { user_id: newUser.id, username: newUser.username },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        res.status(201).json({ token, ...newUser });

    } catch (err) {
        console.error('Google registration error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// ============ Account Management Endpoints ============

// Deactivate Account (Protected)
router.put('/deactivate', verifyToken, async (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });

    try {
        // Verify password
        const user = await userModel.findUserById(req.user.user_id);
        // Need to fetch password hash, findUserById doesn't return it
        const userWithPass = await userModel.findUserByUsername(user.username);

        if (!await bcrypt.compare(password, userWithPass.password)) {
            return res.status(401).json({ error: 'Incorrect password' });
        }

        await userModel.deactivateUser(req.user.user_id);
        res.json({ message: 'Account deactivated. You have been logged out.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete Account (Protected)
router.post('/delete-account', verifyToken, async (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });

    try {
        const user = await userModel.findUserById(req.user.user_id);
        const userWithPass = await userModel.findUserByUsername(user.username);

        if (!await bcrypt.compare(password, userWithPass.password)) {
            return res.status(401).json({ error: 'Incorrect password' });
        }

        await userModel.deleteUser(req.user.user_id);
        res.json({ message: 'Account permanently deleted.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;

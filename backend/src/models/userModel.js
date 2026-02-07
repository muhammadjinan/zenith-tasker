const db = require('../db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// ============ User CRUD ============

const createUser = async (username, password) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
        'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username, created_at',
        [username, hashedPassword]
    );
    return result.rows[0];
};

const findUserByUsername = async (username) => {
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0];
};

const findUserById = async (id) => {
    const result = await db.query(
        'SELECT id, username, email, profile_pic, is_admin, created_at FROM users WHERE id = $1',
        [id]
    );
    return result.rows[0];
};

const findUserByEmail = async (email) => {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
};

// ============ Profile Updates ============

const updateProfile = async (userId, { username, email, profilePic }) => {
    const result = await db.query(
        `UPDATE users SET 
            username = COALESCE($1, username),
            email = COALESCE($2, email),
            profile_pic = COALESCE($3, profile_pic)
         WHERE id = $4 
         RETURNING id, username, email, profile_pic, is_admin, created_at`,
        [username, email, profilePic, userId]
    );
    return result.rows[0];
};

const updatePassword = async (userId, newPassword) => {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);
    return true;
};

// ============ Password Reset Tokens ============

const createResetToken = async (userId) => {
    // Delete any existing tokens for this user
    await db.query('DELETE FROM password_resets WHERE user_id = $1', [userId]);

    // Create new token (32 bytes = 64 hex chars)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.query(
        'INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [userId, token, expiresAt]
    );
    return token;
};

const findByResetToken = async (token) => {
    const result = await db.query(
        `SELECT pr.*, u.username, u.email 
         FROM password_resets pr 
         JOIN users u ON pr.user_id = u.id 
         WHERE pr.token = $1 AND pr.expires_at > NOW()`,
        [token]
    );
    return result.rows[0];
};

const deleteResetToken = async (token) => {
    await db.query('DELETE FROM password_resets WHERE token = $1', [token]);
};

// ============ Admin Functions ============

const setResetAllowed = async (userId, hours = 24) => {
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    await db.query('UPDATE users SET reset_allowed_until = $1 WHERE id = $2', [expiresAt, userId]);
    return expiresAt;
};

const clearResetAllowed = async (userId) => {
    await db.query('UPDATE users SET reset_allowed_until = NULL WHERE id = $1', [userId]);
};

const isResetAllowed = async (userId) => {
    const result = await db.query(
        'SELECT reset_allowed_until FROM users WHERE id = $1 AND reset_allowed_until > NOW()',
        [userId]
    );
    return result.rows.length > 0;
};

const getAllUsers = async () => {
    const result = await db.query(
        'SELECT id, username, email, profile_pic, is_admin, reset_allowed_until, created_at FROM users ORDER BY created_at DESC'
    );
    return result.rows;
};

// ============ Google OAuth ============

const findUserByGoogleId = async (googleId) => {
    try {
        console.log(`[DB] Finding user by Google ID: ${googleId}`);
        const result = await db.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
        return result.rows[0];
    } catch (err) {
        console.error('[DB] Error finding user by Google ID:', err);
        throw err;
    }
};

const linkGoogleAccount = async (userId, googleId, profilePic) => {
    const result = await db.query(
        `UPDATE users SET google_id = $1, profile_pic = COALESCE(profile_pic, $2) 
         WHERE id = $3 
         RETURNING id, username, email, profile_pic, is_admin, google_id, created_at`,
        [googleId, profilePic, userId]
    );
    return result.rows[0];
};

const createGoogleUser = async (username, email, googleId, profilePic) => {
    const result = await db.query(
        `INSERT INTO users (username, password, email, profile_pic, google_id) 
         VALUES ($1, '', $2, $3, $4) 
         RETURNING id, username, email, profile_pic, is_admin, google_id, created_at`,
        [username, email, profilePic, googleId]
    );
    return result.rows[0];
};

const deactivateUser = async (userId) => {
    await db.query("UPDATE users SET status = 'inactive' WHERE id = $1", [userId]);
    return true;
};

const deleteUser = async (userId) => {
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
    return true;
};

module.exports = {
    createUser,
    findUserByUsername,
    findUserById,
    findUserByEmail,
    findUserByGoogleId,
    linkGoogleAccount,
    createGoogleUser,
    updateProfile,
    updatePassword,
    createResetToken,
    findByResetToken,
    deleteResetToken,
    setResetAllowed,
    clearResetAllowed,
    isResetAllowed,
    getAllUsers,
    deactivateUser,
    deleteUser,
};

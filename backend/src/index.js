require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 5000;

// Rate limiting for auth endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window (more lenient for normal use)
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});


// Middleware
// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(cors({
  origin: process.env.FRONTEND_URL.split(','),
  credentials: true
}));
app.use(express.json());

// Database connection
const db = require('./db');

// Database connection is now handled in db.js

// Initialize Database
const initDb = async () => {
  try {
    await db.query(`
      -- Users Table (must be created first for FK reference)
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Add new columns for user profile and admin features
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_pic TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_allowed_until TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

      -- Pages Table
      CREATE TABLE IF NOT EXISTS pages (
        id SERIAL PRIMARY KEY,
        title TEXT DEFAULT 'Untitled',
        content TEXT DEFAULT '',
        updated_at TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE pages ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
      ALTER TABLE pages ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
      ALTER TABLE pages ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

      -- Password Reset Tokens Table
      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Tasks Table
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        page_id INTEGER REFERENCES pages(id) ON DELETE SET NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'todo',
        priority VARCHAR(10) DEFAULT 'medium',
        due_date TIMESTAMP,
        category VARCHAR(100),
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Subtasks Table
      CREATE TABLE IF NOT EXISTS subtasks (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Performance Indexes
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
      CREATE INDEX IF NOT EXISTS idx_pages_user_id ON pages(user_id);
      CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
      CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_page_id ON tasks(page_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);
    `);
    console.log('Database initialized: tables ready');
  } catch (err) {
    console.error('Database initialization error', err.stack);
  }
};

db.pool.connect()
  .then(() => {
    console.log('Connected to PostgreSQL');
    initDb();
  })
  .catch(err => console.error('Database connection error', err.stack));

const verifyToken = require('./middleware/authMiddleware');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const googleAuthRoutes = require('./routes/googleAuth');
const taskRoutes = require('./routes/taskRoutes');
const passport = require('passport');
const path = require('path');

// Initialize Passport
app.use(passport.initialize());

// Static file serving for uploads (profile pictures)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/auth', authLimiter, authRoutes);
app.use('/auth', authLimiter, googleAuthRoutes);  // Google OAuth routes under /auth
app.use('/admin', adminRoutes);
app.use('/tasks', taskRoutes);  // Task management routes

app.get('/', (req, res) => {
  res.json({ message: 'Zenith Tasker API is running' });
});

app.get('/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ status: 'ok', db_time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// --- Pages API (Protected) ---

// GET all pages for logged in user
app.get('/pages', verifyToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM pages WHERE user_id = $1 ORDER BY order_index ASC, updated_at DESC',
      [req.user.user_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new page
app.post('/pages', verifyToken, async (req, res) => {
  try {
    // Get max order_index for this user
    const maxOrder = await db.query('SELECT MAX(order_index) as max_val FROM pages WHERE user_id = $1', [req.user.user_id]);
    const nextOrder = (maxOrder.rows[0].max_val || 0) + 1;

    const result = await db.query(
      'INSERT INTO pages (title, content, order_index, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
      ['Untitled', '', nextOrder, req.user.user_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT reorder pages - MUST be before /pages/:id to avoid ":id" matching "reorder"
// PUT reorder pages - Batch optimized
app.put('/pages/reorder', verifyToken, async (req, res) => {
  const { updates } = req.body; // Expect array of { id, order_index }
  if (!Array.isArray(updates) || updates.length === 0) {
    return res.json({ message: 'No updates needed' });
  }

  try {
    // Construct a single helper query for batch update using CASE
    // UPDATE pages SET order_index = CASE id WHEN $1 THEN $2 WHEN $3 THEN $4 END WHERE id IN ($1, $3) AND user_id = $...

    // 1. Build the CASE statement parts
    const caseParts = [];
    const params = [];
    const ids = [];

    updates.forEach((update, index) => {
      // params indexes start at 1
      // For each update we add 2 params: id and order_index
      const idParamIdx = index * 2 + 1;
      const orderParamIdx = index * 2 + 2;

      caseParts.push(`WHEN $${idParamIdx} THEN $${orderParamIdx}`);
      params.push(update.id, update.order_index);
      ids.push(`$${idParamIdx}`);
    });

    // 2. Add user_id as the last param
    const userIdParamIdx = params.length + 1;
    params.push(req.user.user_id);

    const queryHeader = `UPDATE pages SET order_index = CASE id ${caseParts.join(' ')} END`;
    const queryWhere = `WHERE id IN (${ids.join(', ')}) AND user_id = $${userIdParamIdx}`;

    await db.query(`${queryHeader} ${queryWhere}`, params);

    res.json({ message: 'Order updated' });
  } catch (err) {
    console.error('Reorder error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT update page
app.put('/pages/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;
  try {
    const result = await db.query(
      'UPDATE pages SET title = COALESCE($1, title), content = COALESCE($2, content), updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING *',
      [title, content, id, req.user.user_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found or unauthorized' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH toggle favorite
app.patch('/pages/:id/favorite', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'UPDATE pages SET is_favorite = NOT COALESCE(is_favorite, FALSE) WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.user_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found or unauthorized' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE page
app.delete('/pages/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM pages WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.user.user_id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Page not found or unauthorized' });
    }
    res.json({ message: 'Page deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

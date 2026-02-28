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
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_author BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_allowed_until TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
      
      -- Feature specific permission flags
      ALTER TABLE users ADD COLUMN IF NOT EXISTS can_view_pages BOOLEAN DEFAULT TRUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS can_view_tasks BOOLEAN DEFAULT TRUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS can_view_finance BOOLEAN DEFAULT TRUE;

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
      -- Page hierarchy columns
      ALTER TABLE pages ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES pages(id) ON DELETE CASCADE;
      ALTER TABLE pages ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT '📄';
      ALTER TABLE pages ADD COLUMN IF NOT EXISTS page_type VARCHAR(20) DEFAULT 'page';

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

      -- Login History Table
      CREATE TABLE IF NOT EXISTS login_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        logged_in_at TIMESTAMP DEFAULT NOW()
      );

      -- Dashboard Layouts Table
      CREATE TABLE IF NOT EXISTS dashboard_layouts (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        layout JSONB NOT NULL DEFAULT '[]',
        hidden_widgets TEXT[] DEFAULT '{}',
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Tags Table
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        color VARCHAR(7) DEFAULT '#6366f1',
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS page_tags (
        page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
        tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (page_id, tag_id)
      );
      CREATE TABLE IF NOT EXISTS task_tags (
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (task_id, tag_id)
      );

      -- Databases (user-defined spreadsheet tables)
      CREATE TABLE IF NOT EXISTS databases (
        id SERIAL PRIMARY KEY,
        page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) DEFAULT 'Untitled Database',
        columns JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS database_rows (
        id SERIAL PRIMARY KEY,
        database_id INTEGER REFERENCES databases(id) ON DELETE CASCADE,
        data JSONB DEFAULT '{}',
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Comments on Pages
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- AI Conversations
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        page_id INTEGER REFERENCES pages(id) ON DELETE SET NULL,
        title VARCHAR(255) DEFAULT 'New Chat',
        messages JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Knowledge Base (Articles)
      CREATE TABLE IF NOT EXISTS articles (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT DEFAULT '',
        type VARCHAR(50) DEFAULT 'how_to',
        category VARCHAR(50) DEFAULT 'general',
        author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Performance Indexes
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
      CREATE INDEX IF NOT EXISTS idx_pages_user_id ON pages(user_id);
      CREATE INDEX IF NOT EXISTS idx_pages_parent_id ON pages(parent_id);
      CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
      CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_page_id ON tasks(page_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);
      CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_login_history_logged_in_at ON login_history(logged_in_at);
      CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
      CREATE INDEX IF NOT EXISTS idx_databases_page_id ON databases(page_id);
      CREATE INDEX IF NOT EXISTS idx_database_rows_db_id ON database_rows(database_id);
      CREATE INDEX IF NOT EXISTS idx_comments_page_id ON comments(page_id);
      CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
      CREATE INDEX IF NOT EXISTS idx_articles_author_id ON articles(author_id);
      CREATE INDEX IF NOT EXISTS idx_articles_type ON articles(type);
      CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);

      -- ============ FINANCE TRACKER TABLES ============

      -- Finance Trackers (top-level: personal, business, project, family)
      CREATE TABLE IF NOT EXISTS finance_trackers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL DEFAULT 'My Finances',
        type VARCHAR(20) NOT NULL DEFAULT 'personal',
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE finance_trackers ADD COLUMN IF NOT EXISTS enabled_sections JSONB
        DEFAULT '["overview","transactions","investments","loans","categories","members"]';

      -- Finance Members (granular per-user permissions)
      CREATE TABLE IF NOT EXISTS finance_members (
        id SERIAL PRIMARY KEY,
        tracker_id INTEGER REFERENCES finance_trackers(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        is_owner BOOLEAN DEFAULT FALSE,
        can_read BOOLEAN DEFAULT TRUE,
        can_write BOOLEAN DEFAULT FALSE,
        can_delete BOOLEAN DEFAULT FALSE,
        can_manage_members BOOLEAN DEFAULT FALSE,
        can_manage_categories BOOLEAN DEFAULT FALSE,
        can_manage_investments BOOLEAN DEFAULT FALSE,
        can_manage_loans BOOLEAN DEFAULT FALSE,
        can_export BOOLEAN DEFAULT TRUE,
        invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        joined_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tracker_id, user_id)
      );

      -- Finance Categories (hierarchical via parent_id)
      CREATE TABLE IF NOT EXISTS finance_categories (
        id SERIAL PRIMARY KEY,
        tracker_id INTEGER REFERENCES finance_trackers(id) ON DELETE CASCADE,
        parent_id INTEGER REFERENCES finance_categories(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        icon VARCHAR(10) DEFAULT '📂',
        color VARCHAR(7) DEFAULT '#6366f1',
        type VARCHAR(10) NOT NULL DEFAULT 'expense',
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Finance Transactions
      CREATE TABLE IF NOT EXISTS finance_transactions (
        id SERIAL PRIMARY KEY,
        tracker_id INTEGER REFERENCES finance_trackers(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        category_id INTEGER REFERENCES finance_categories(id) ON DELETE SET NULL,
        type VARCHAR(10) NOT NULL DEFAULT 'expense',
        amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        description TEXT,
        recurring VARCHAR(10) DEFAULT 'none',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Finance Investments
      CREATE TABLE IF NOT EXISTS finance_investments (
        id SERIAL PRIMARY KEY,
        tracker_id INTEGER REFERENCES finance_trackers(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(30) DEFAULT 'stock',
        symbol VARCHAR(20),
        units NUMERIC(15,4) DEFAULT 0,
        buy_price NUMERIC(15,2) DEFAULT 0,
        current_price NUMERIC(15,2) DEFAULT 0,
        buy_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Finance Dividends
      CREATE TABLE IF NOT EXISTS finance_dividends (
        id SERIAL PRIMARY KEY,
        investment_id INTEGER REFERENCES finance_investments(id) ON DELETE CASCADE,
        amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Finance Loans (borrowed / given)
      CREATE TABLE IF NOT EXISTS finance_loans (
        id SERIAL PRIMARY KEY,
        tracker_id INTEGER REFERENCES finance_trackers(id) ON DELETE CASCADE,
        type VARCHAR(10) NOT NULL DEFAULT 'borrowed',
        person_name VARCHAR(255) NOT NULL,
        amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        purpose TEXT,
        loan_date DATE NOT NULL DEFAULT CURRENT_DATE,
        expected_payback_date DATE,
        actual_payback_date DATE,
        status VARCHAR(10) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Finance Budgets (future-proofing)
      CREATE TABLE IF NOT EXISTS finance_budgets (
        id SERIAL PRIMARY KEY,
        tracker_id INTEGER REFERENCES finance_trackers(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES finance_categories(id) ON DELETE CASCADE,
        month DATE NOT NULL,
        amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tracker_id, category_id, month)
      );

      -- Finance Balance Sources (bank accounts, cash, etc.)
      CREATE TABLE IF NOT EXISTS finance_balance_sources (
        id SERIAL PRIMARY KEY,
        tracker_id INTEGER REFERENCES finance_trackers(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        icon VARCHAR(10) DEFAULT '🏦',
        initial_balance NUMERIC(15,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Finance Indexes
      CREATE INDEX IF NOT EXISTS idx_finance_trackers_user_id ON finance_trackers(user_id);
      CREATE INDEX IF NOT EXISTS idx_finance_members_tracker_id ON finance_members(tracker_id);
      CREATE INDEX IF NOT EXISTS idx_finance_members_user_id ON finance_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_finance_categories_tracker_id ON finance_categories(tracker_id);
      CREATE INDEX IF NOT EXISTS idx_finance_transactions_tracker_id ON finance_transactions(tracker_id);
      CREATE INDEX IF NOT EXISTS idx_finance_transactions_date ON finance_transactions(date);
      CREATE INDEX IF NOT EXISTS idx_finance_transactions_type ON finance_transactions(type);
      CREATE INDEX IF NOT EXISTS idx_finance_investments_tracker_id ON finance_investments(tracker_id);
      CREATE INDEX IF NOT EXISTS idx_finance_dividends_investment_id ON finance_dividends(investment_id);
      CREATE INDEX IF NOT EXISTS idx_finance_loans_tracker_id ON finance_loans(tracker_id);
      CREATE INDEX IF NOT EXISTS idx_finance_loans_status ON finance_loans(status);
      CREATE INDEX IF NOT EXISTS idx_finance_balance_sources_tracker_id ON finance_balance_sources(tracker_id);
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
const dashboardRoutes = require('./routes/dashboardRoutes');
const databaseRoutes = require('./routes/databaseRoutes');
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
app.use('/dashboard', dashboardRoutes);  // Dashboard layout routes
app.use('/databases', databaseRoutes);  // User-defined databases


const searchRoutes = require('./routes/searchRoutes');
app.use('/search', searchRoutes);  // Global search
const tagRoutes = require('./routes/tagRoutes');
app.use('/tags', tagRoutes);  // Tags/labels management
const commentRoutes = require('./routes/commentRoutes');
app.use('/comments', commentRoutes);  // Page comments
const financeRoutes = require('./routes/financeRoutes');
app.use('/finance', financeRoutes);  // Finance tracker
const articlesRoutes = require('./routes/articles');
app.use('/articles', articlesRoutes); // Knowledge Base

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

// POST new page (supports parent_id for sub-pages)
app.post('/pages', verifyToken, async (req, res) => {
  try {
    const { parent_id, icon, page_type } = req.body;
    // Get max order_index for this user (scoped to same parent)
    const maxOrder = await db.query(
      'SELECT MAX(order_index) as max_val FROM pages WHERE user_id = $1 AND parent_id IS NOT DISTINCT FROM $2',
      [req.user.user_id, parent_id || null]
    );
    const nextOrder = (maxOrder.rows[0].max_val || 0) + 1;

    const result = await db.query(
      `INSERT INTO pages (title, content, order_index, user_id, parent_id, icon, page_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      ['Untitled', '', nextOrder, req.user.user_id, parent_id || null, icon || '📄', page_type || 'page']
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

// PUT update page (supports icon, page_type, parent_id)
app.put('/pages/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { title, content, icon, page_type, parent_id } = req.body;
  try {
    const result = await db.query(
      `UPDATE pages SET 
        title = COALESCE($1, title), 
        content = COALESCE($2, content), 
        icon = COALESCE($3, icon),
        page_type = COALESCE($4, page_type),
        parent_id = $5,
        updated_at = NOW() 
       WHERE id = $6 AND user_id = $7 RETURNING *`,
      [title, content, icon, page_type, parent_id !== undefined ? parent_id : null, id, req.user.user_id]
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

// PATCH move page to new parent
app.patch('/pages/:id/move', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { parent_id } = req.body;
  try {
    // Prevent circular references
    if (parent_id) {
      let current = parent_id;
      while (current) {
        if (String(current) === String(id)) {
          return res.status(400).json({ error: 'Cannot move a page into its own descendant' });
        }
        const parentResult = await db.query('SELECT parent_id FROM pages WHERE id = $1 AND user_id = $2', [current, req.user.user_id]);
        current = parentResult.rows[0]?.parent_id;
      }
    }
    const result = await db.query(
      'UPDATE pages SET parent_id = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
      [parent_id || null, id, req.user.user_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found or unauthorized' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET breadcrumb trail for a page
app.get('/pages/:id/breadcrumb', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `WITH RECURSIVE breadcrumb AS (
        SELECT id, title, icon, parent_id, 0 as depth FROM pages WHERE id = $1 AND user_id = $2
        UNION ALL
        SELECT p.id, p.title, p.icon, p.parent_id, b.depth + 1
        FROM pages p JOIN breadcrumb b ON p.id = b.parent_id WHERE p.user_id = $2
      )
      SELECT id, title, icon FROM breadcrumb ORDER BY depth DESC`,
      [id, req.user.user_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE page (cascade deletes children via FK)
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

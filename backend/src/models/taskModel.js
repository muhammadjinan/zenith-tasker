const db = require('../db');

// ============ Tasks CRUD ============

const getAllTasks = async (userId) => {
    const result = await db.query(
        `SELECT t.*, 
            p.title as page_title,
            COALESCE(
                (SELECT json_agg(s ORDER BY s.order_index) 
                 FROM subtasks s WHERE s.task_id = t.id),
                '[]'::json
            ) as subtasks
         FROM tasks t 
         LEFT JOIN pages p ON t.page_id = p.id
         WHERE t.user_id = $1 
         ORDER BY t.order_index, t.created_at DESC`,
        [userId]
    );
    return result.rows;
};

const getTaskById = async (taskId, userId) => {
    const result = await db.query(
        `SELECT t.*, 
            p.title as page_title,
            COALESCE(
                (SELECT json_agg(s ORDER BY s.order_index) 
                 FROM subtasks s WHERE s.task_id = t.id),
                '[]'::json
            ) as subtasks
         FROM tasks t 
         LEFT JOIN pages p ON t.page_id = p.id
         WHERE t.id = $1 AND t.user_id = $2`,
        [taskId, userId]
    );
    return result.rows[0];
};

const getTasksByPage = async (pageId, userId) => {
    const result = await db.query(
        `SELECT t.*, 
            COALESCE(
                (SELECT json_agg(s ORDER BY s.order_index) 
                 FROM subtasks s WHERE s.task_id = t.id),
                '[]'::json
            ) as subtasks
         FROM tasks t 
         WHERE t.page_id = $1 AND t.user_id = $2 
         ORDER BY t.order_index`,
        [pageId, userId]
    );
    return result.rows;
};

const createTask = async (userId, { title, description, status, priority, due_date, category, page_id }) => {
    const result = await db.query(
        `INSERT INTO tasks (user_id, title, description, status, priority, due_date, category, page_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [userId, title, description || null, status || 'todo', priority || 'medium', due_date || null, category || null, page_id || null]
    );
    return result.rows[0];
};

const updateTask = async (taskId, userId, updates) => {
    const { title, description, status, priority, due_date, category, page_id, order_index } = updates;
    const result = await db.query(
        `UPDATE tasks 
         SET title = COALESCE($1, title),
             description = COALESCE($2, description),
             status = COALESCE($3, status),
             priority = COALESCE($4, priority),
             due_date = $5,
             category = COALESCE($6, category),
             page_id = $7,
             order_index = COALESCE($8, order_index),
             updated_at = NOW()
         WHERE id = $9 AND user_id = $10
         RETURNING *`,
        [title, description, status, priority, due_date, category, page_id, order_index, taskId, userId]
    );
    return result.rows[0];
};

const deleteTask = async (taskId, userId) => {
    const result = await db.query(
        'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id',
        [taskId, userId]
    );
    return result.rows[0];
};

const reorderTasks = async (userId, taskOrders) => {
    // taskOrders is an array of { id, order_index }
    const updates = taskOrders.map((t, i) =>
        db.query('UPDATE tasks SET order_index = $1 WHERE id = $2 AND user_id = $3', [t.order_index, t.id, userId])
    );
    await Promise.all(updates);
    return true;
};

// ============ Subtasks CRUD ============

const getSubtasks = async (taskId) => {
    const result = await db.query(
        'SELECT * FROM subtasks WHERE task_id = $1 ORDER BY order_index',
        [taskId]
    );
    return result.rows;
};

const createSubtask = async (taskId, title) => {
    const result = await db.query(
        `INSERT INTO subtasks (task_id, title)
         VALUES ($1, $2)
         RETURNING *`,
        [taskId, title]
    );
    return result.rows[0];
};

const updateSubtask = async (subtaskId, updates) => {
    const { title, completed, order_index } = updates;
    const result = await db.query(
        `UPDATE subtasks 
         SET title = COALESCE($1, title),
             completed = COALESCE($2, completed),
             order_index = COALESCE($3, order_index)
         WHERE id = $4
         RETURNING *`,
        [title, completed, order_index, subtaskId]
    );
    return result.rows[0];
};

const deleteSubtask = async (subtaskId) => {
    const result = await db.query(
        'DELETE FROM subtasks WHERE id = $1 RETURNING id',
        [subtaskId]
    );
    return result.rows[0];
};

const toggleSubtask = async (subtaskId) => {
    const result = await db.query(
        `UPDATE subtasks SET completed = NOT completed WHERE id = $1 RETURNING *`,
        [subtaskId]
    );
    return result.rows[0];
};

module.exports = {
    getAllTasks,
    getTaskById,
    getTasksByPage,
    createTask,
    updateTask,
    deleteTask,
    reorderTasks,
    getSubtasks,
    createSubtask,
    updateSubtask,
    deleteSubtask,
    toggleSubtask
};

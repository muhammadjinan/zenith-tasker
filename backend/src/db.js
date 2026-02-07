const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,                       // Maximum connections in pool
    idleTimeoutMillis: 30000,      // Close idle connections after 30s
    connectionTimeoutMillis: 5000, // Fail fast if can't connect in 5s
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
};

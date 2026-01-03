const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Set timezone to IST for all connections
pool.on('connect', async (client) => {
    await client.query("SET timezone = 'Asia/Kolkata'");
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};

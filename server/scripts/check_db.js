const { pool } = require('../db/database');

const checkData = async () => {
    try {
        console.log('--- Checking Database Content ---');

        // 1. Check Row Count
        const countQuery = await pool.query('SELECT COUNT(*) FROM price_captures');
        console.log(`Total Rows in price_captures: ${countQuery.rows[0].count}`);

        // 2. Check Latest 5 Rows
        const res = await pool.query('SELECT id, captured_at, nifty, nasdaq FROM price_captures ORDER BY captured_at DESC LIMIT 5');
        console.log('Latest 5 Captures:');
        console.table(res.rows);

    } catch (error) {
        console.error('Check failed:', error);
    } finally {
        await pool.end();
    }
};

checkData();

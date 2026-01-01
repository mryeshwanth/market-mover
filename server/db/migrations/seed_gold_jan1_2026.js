const { pool } = require('../database');

const updateGold = async () => {
    try {
        if (!process.env.DATABASE_URL) {
            throw new Error("DATABASE_URL is missing. Run with 'railway run node ...'");
        }
        console.log('Updating Gold Price for Jan 1, 2026...');

        const query = `
            UPDATE price_captures
            SET gold_24k_per_10g = 13506
            WHERE captured_at::date = '2026-01-01' AND capture_time = 'morning';
        `;

        const res = await pool.query(query);
        console.log(`Updated ${res.rowCount} row(s) with Gold Price.`);

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
    }
};

updateGold();

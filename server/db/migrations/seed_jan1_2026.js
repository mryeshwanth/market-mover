const { pool } = require('../database');

const seedData = async () => {
    try {
        console.log('Starting seed migration for Jan 1, 2026...');

        const query = `
            INSERT INTO price_captures (
                nifty, 
                nasdaq, 
                gold_24k_per_10g, 
                captured_at, 
                capture_time, 
                notes, 
                is_auto_captured,
                nifty_changed,
                nasdaq_changed,
                gold_changed,
                tags,
                scraping_success
            )
            VALUES 
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12),
            ($13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
            RETURNING id;
        `;

        const values = [
            // Row 1: Morning
            26173.30, null, null, '2026-01-01 09:20:00+05:30', 'morning', 'Manual Entry Jan 1 Open', false, false, false, false, null, true,
            // Row 2: Evening
            26197.55, null, null, '2026-01-01 15:35:00+05:30', 'evening', 'Manual Entry Jan 1 Close', false, false, false, false, null, true
        ];

        const res = await pool.query(query, values);
        console.log(`Successfully inserted ${res.rowCount} rows. IDs: ${res.rows.map(r => r.id).join(', ')}`);

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
    }
};

seedData();

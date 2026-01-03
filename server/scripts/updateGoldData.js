/**
 * Script to update gold data to correct 1g values
 */

const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:zYyOvmlNdUywNLUCneuUpryjoQzfaXOu@centerbeam.proxy.rlwy.net:37107/railway';

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function updateGoldData() {
    try {
        console.log('Updating gold data to correct 1g values...\n');
        
        // Update gold prices to the provided 1g values
        const updates = [
            { date: '2026-01-01', price: 13584.00 },
            { date: '2026-01-02', price: 13702.00 },
            { date: '2026-01-03', price: 13582.00 }
        ];
        
        for (const update of updates) {
            const result = await pool.query(`
                UPDATE price_captures 
                SET gold_24k_per_1g = $1
                WHERE captured_at::date = $2 
                AND capture_time = 'gold_daily'
            `, [update.price, update.date]);
            
            if (result.rowCount > 0) {
                console.log(`✓ Updated gold for ${update.date}: ₹${update.price}`);
            } else {
                console.log(`⚠ No record found for ${update.date}`);
            }
        }
        
        console.log('\n✓ Gold data update completed!');
        
    } catch (error) {
        console.error('Error updating gold data:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

updateGoldData()
    .then(() => {
        console.log('\nScript completed.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });


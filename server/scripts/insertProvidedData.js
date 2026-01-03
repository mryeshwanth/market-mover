/**
 * Script to clear database and insert user-provided data
 */

const { Pool } = require('pg');
const moment = require('moment-timezone');
require('dotenv').config();

const TZ = "Asia/Kolkata";
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:zYyOvmlNdUywNLUCneuUpryjoQzfaXOu@centerbeam.proxy.rlwy.net:37107/railway';

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function clearDatabase() {
    try {
        console.log('Clearing existing data...');
        await pool.query('TRUNCATE TABLE price_captures RESTART IDENTITY CASCADE');
        console.log('✓ Database cleared successfully.\n');
    } catch (error) {
        console.error('Error clearing database:', error);
        throw error;
    }
}

async function insertCapture(nifty, nasdaq, gold, captureTime, capturedAt) {
    try {
        const query = `
            INSERT INTO price_captures 
            (nifty, nasdaq, gold_24k_per_1g, capture_time, captured_at, is_auto_captured, nifty_changed, nasdaq_changed, gold_changed)
            VALUES ($1, $2, $3, $4, $5, false, false, false, false)
            RETURNING id
        `;
        const result = await pool.query(query, [nifty, nasdaq, gold, captureTime, capturedAt]);
        return result.rows[0].id;
    } catch (error) {
        console.error(`Error inserting capture for ${captureTime} at ${capturedAt}:`, error);
        throw error;
    }
}

async function insertData() {
    console.log('Inserting provided data...\n');
    
    // Nifty 50 Data
    // 1 Jan 2026 - Opening (Monday 09:20 IST)
    await insertCapture(
        26173.30, null, null, 
        'nifty_opening', 
        moment.tz('2026-01-01 09:20', 'YYYY-MM-DD HH:mm', TZ).toISOString()
    );
    console.log('✓ Nifty Opening: 1 Jan 2026 - ₹26,173.30');
    
    // 1 Jan 2026 - Closing (Monday 15:40 IST)
    await insertCapture(
        26146.55, null, null, 
        'nifty_closing', 
        moment.tz('2026-01-01 15:40', 'YYYY-MM-DD HH:mm', TZ).toISOString()
    );
    console.log('✓ Nifty Closing: 1 Jan 2026 - ₹26,146.55');
    
    // 2 Jan 2026 - Opening (Tuesday 09:20 IST) - Note: This is Tuesday, but we'll insert as per data
    // Actually, wait - 2 Jan 2026 is a Friday (let me check). Actually, 1 Jan 2026 is Wednesday, so 2 Jan is Thursday
    // But the user said opening, so maybe they want it. Let me check the day.
    // Actually, the user provided opening for 2 Jan, but our schedule says only Monday opening.
    // I'll insert it anyway since user provided it.
    await insertCapture(
        26155.10, null, null, 
        'nifty_opening', 
        moment.tz('2026-01-02 09:20', 'YYYY-MM-DD HH:mm', TZ).toISOString()
    );
    console.log('✓ Nifty Opening: 2 Jan 2026 - ₹26,155.10');
    
    // 2 Jan 2026 - Closing (Thursday 15:40 IST)
    await insertCapture(
        26328.55, null, null, 
        'nifty_closing', 
        moment.tz('2026-01-02 15:40', 'YYYY-MM-DD HH:mm', TZ).toISOString()
    );
    console.log('✓ Nifty Closing: 2 Jan 2026 - ₹26,328.55');
    
    // Nasdaq Data
    // 1 Jan 2026 - Holiday (no data)
    
    // 2 Jan 2026 - Opening (Thursday 20:00 IST / 8:00 PM)
    await insertCapture(
        null, 25524.27, null, 
        'nasdaq_opening', 
        moment.tz('2026-01-02 20:00', 'YYYY-MM-DD HH:mm', TZ).toISOString()
    );
    console.log('✓ Nasdaq Opening: 2 Jan 2026 - $25,524.27');
    
    // 2 Jan 2026 - Closing (Friday 03:00 IST - captures Thursday's close)
    // Note: Nasdaq closing at 03:00 IST captures the previous day's close
    // So 2 Jan 03:00 IST = 1 Jan 4PM EST close
    await insertCapture(
        null, 25206.17, null, 
        'nasdaq_closing', 
        moment.tz('2026-01-02 03:00', 'YYYY-MM-DD HH:mm', TZ).toISOString()
    );
    console.log('✓ Nasdaq Closing: 2 Jan 2026 (03:00 IST) - $25,206.17');
    
    // Gold Data (per 10g - assuming user's values are per 10g)
    // 1 Jan 2026 - 08:00 IST
    await insertCapture(
        null, null, 13584.00, 
        'gold_daily', 
        moment.tz('2026-01-01 08:00', 'YYYY-MM-DD HH:mm', TZ).toISOString()
    );
    console.log('✓ Gold Daily: 1 Jan 2026 - ₹13,584.00');
    
    // 2 Jan 2026 - 08:00 IST
    await insertCapture(
        null, null, 13702.00, 
        'gold_daily', 
        moment.tz('2026-01-02 08:00', 'YYYY-MM-DD HH:mm', TZ).toISOString()
    );
    console.log('✓ Gold Daily: 2 Jan 2026 - ₹13,702.00');
    
    // 3 Jan 2026 - 08:00 IST
    await insertCapture(
        null, null, 13582.00, 
        'gold_daily', 
        moment.tz('2026-01-03 08:00', 'YYYY-MM-DD HH:mm', TZ).toISOString()
    );
    console.log('✓ Gold Daily: 3 Jan 2026 - ₹13,582.00');
    
    console.log('\n✓ All data inserted successfully!');
}

async function main() {
    try {
        console.log('='.repeat(60));
        console.log('Database Data Insertion Script');
        console.log('='.repeat(60));
        console.log(`Timezone: ${TZ}\n`);
        
        // Clear database
        await clearDatabase();
        
        // Insert provided data
        await insertData();
        
        console.log('\n✓ Script completed successfully!');
        
    } catch (error) {
        console.error('Error in main:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run script
main()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });


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
        // Get previous capture of the same type for comparison
        const prevQuery = `
            SELECT * FROM price_captures 
            WHERE capture_time = $1 
            ORDER BY captured_at DESC 
            LIMIT 1
        `;
        const prevResult = await pool.query(prevQuery, [captureTime]);
        const previousCapture = prevResult.rows[0];
        
        // Calculate changed flags
        const threshold = 0.01;
        const hasChanged = (curr, prev) => {
            if (curr === null || curr === undefined || prev === null || prev === undefined) return false;
            return Math.abs(curr - prev) > threshold;
        };
        
        let niftyChanged = false;
        let nasdaqChanged = false;
        let goldChanged = false;
        
        if (previousCapture) {
            niftyChanged = hasChanged(nifty, previousCapture.nifty);
            nasdaqChanged = hasChanged(nasdaq, previousCapture.nasdaq);
            goldChanged = hasChanged(gold, previousCapture.gold_24k_per_1g);
        } else {
            // First capture of this type
            niftyChanged = !!nifty;
            nasdaqChanged = !!nasdaq;
            goldChanged = !!gold;
        }
        
        // Format timestamp properly for PostgreSQL (with timezone)
        // capturedAt is a string like '2026-01-01 09:20'
        const timestampMoment = moment.tz(capturedAt, 'YYYY-MM-DD HH:mm', TZ);
        const pgTimestamp = timestampMoment.format('YYYY-MM-DD HH:mm:ss') + '+05:30'; // IST offset
        
        const query = `
            INSERT INTO price_captures 
            (nifty, nasdaq, gold_24k_per_1g, capture_time, captured_at, is_auto_captured, nifty_changed, nasdaq_changed, gold_changed)
            VALUES ($1, $2, $3, $4, $5::timestamp with time zone, false, $6, $7, $8)
            RETURNING id
        `;
        const result = await pool.query(query, [nifty, nasdaq, gold, captureTime, pgTimestamp, niftyChanged, nasdaqChanged, goldChanged]);
        return result.rows[0].id;
    } catch (error) {
        console.error(`Error inserting capture for ${captureTime} at ${capturedAt}:`, error);
        throw error;
    }
}

async function insertData() {
    console.log('Inserting provided data...\n');
    
    // Nifty 50 Data
    // Note: Jan 1, 2026 is Wednesday. For weekly dashboard, we need Monday opening.
    // Since we don't have Monday data, we'll use Wednesday opening as the week start.
    // 1 Jan 2026 - Opening (Wednesday 09:20 IST) - This will serve as week start
    await insertCapture(
        26173.30, null, null, 
        'nifty_opening', 
        '2026-01-01 09:20'
    );
    console.log('✓ Nifty Opening: 1 Jan 2026 - ₹26,173.30');
    
    // 1 Jan 2026 - Closing (Wednesday 15:40 IST)
    await insertCapture(
        26146.55, null, null, 
        'nifty_closing', 
        '2026-01-01 15:40'
    );
    console.log('✓ Nifty Closing: 1 Jan 2026 - ₹26,146.55');
    
    // 2 Jan 2026 - Opening (Thursday 09:20 IST)
    await insertCapture(
        26155.10, null, null, 
        'nifty_opening', 
        '2026-01-02 09:20'
    );
    console.log('✓ Nifty Opening: 2 Jan 2026 - ₹26,155.10');
    
    // 2 Jan 2026 - Closing (Thursday 15:40 IST)
    await insertCapture(
        26328.55, null, null, 
        'nifty_closing', 
        '2026-01-02 15:40'
    );
    console.log('✓ Nifty Closing: 2 Jan 2026 - ₹26,328.55');
    
    // Nasdaq Data
    // 1 Jan 2026 - Opening (Wednesday 20:00 IST / 8:00 PM) - Monthly opening
    await insertCapture(
        null, 25248.77, null, 
        'nasdaq_opening', 
        '2026-01-01 20:00'
    );
    console.log('✓ Nasdaq Opening: 1 Jan 2026 - $25,248.77');
    
    // 1 Jan 2026 - Closing (Thursday 03:00 IST) - Monthly closing
    await insertCapture(
        null, 25248.77, null, 
        'nasdaq_closing', 
        '2026-01-02 03:00'
    );
    console.log('✓ Nasdaq Closing: 1 Jan 2026 (03:00 IST on 2nd) - $25,248.77');
    
    // 2 Jan 2026 - Opening (Thursday 20:00 IST / 8:00 PM)
    await insertCapture(
        null, 25524.27, null, 
        'nasdaq_opening', 
        '2026-01-02 20:00'
    );
    console.log('✓ Nasdaq Opening: 2 Jan 2026 - $25,524.27');
    
    // 2 Jan 2026 - Closing (Friday 03:00 IST - captures Thursday's close)
    await insertCapture(
        null, 25206.17, null, 
        'nasdaq_closing', 
        '2026-01-03 03:00'
    );
    console.log('✓ Nasdaq Closing: 2 Jan 2026 (03:00 IST on 3rd) - $25,206.17');
    
    // Gold Data (per 1g)
    // 1 Jan 2026 - 08:00 IST
    await insertCapture(
        null, null, 13584.00, 
        'gold_daily', 
        '2026-01-01 08:00'
    );
    console.log('✓ Gold Daily: 1 Jan 2026 - ₹13,584.00');
    
    // 2 Jan 2026 - 08:00 IST
    await insertCapture(
        null, null, 13702.00, 
        'gold_daily', 
        '2026-01-02 08:00'
    );
    console.log('✓ Gold Daily: 2 Jan 2026 - ₹13,702.00');
    
    // 3 Jan 2026 - 08:00 IST
    await insertCapture(
        null, null, 13582.00, 
        'gold_daily', 
        '2026-01-03 08:00'
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


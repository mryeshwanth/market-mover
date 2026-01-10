const { pool } = require('../db/database');
const moment = require('moment-timezone');

async function updateNasdaqJan9Closing() {
    try {
        // Jan 9th US trading day closing would be captured on Jan 10th IST early morning
        // But we need to find the record and update it
        // The closing price should be $25,794.898 based on the logs
        
        const newPrice = 25794.898;
        
        console.log('Updating NASDAQ closing price for Jan 9th (US trading day)...\n');
        
        // First, find the record for Jan 9th IST or Jan 10th IST
        const jan9IST = moment.tz('2026-01-09', 'YYYY-MM-DD', 'Asia/Kolkata');
        const jan10IST = moment.tz('2026-01-10', 'YYYY-MM-DD', 'Asia/Kolkata');
        
        // Check for Jan 9th IST date
        const query1 = `
            SELECT * FROM price_captures 
            WHERE capture_time = 'nasdaq_closing'
            AND DATE(timezone('Asia/Kolkata', captured_at)) = $1
            AND nasdaq IS NOT NULL
            ORDER BY captured_at DESC
            LIMIT 1
        `;
        
        let record = null;
        const result1 = await pool.query(query1, [jan9IST.format('YYYY-MM-DD')]);
        if (result1.rows.length > 0) {
            record = result1.rows[0];
            console.log(`Found record for Jan 9th IST:`);
            console.log(`  ID: ${record.id}`);
            console.log(`  Current price: $${record.nasdaq}`);
            console.log(`  Captured at: ${moment(record.captured_at).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')} IST\n`);
        } else {
            // Check for Jan 10th IST date
            const result2 = await pool.query(query1, [jan10IST.format('YYYY-MM-DD')]);
            if (result2.rows.length > 0) {
                record = result2.rows[0];
                console.log(`Found record for Jan 10th IST:`);
                console.log(`  ID: ${record.id}`);
                console.log(`  Current price: $${record.nasdaq}`);
                console.log(`  Captured at: ${moment(record.captured_at).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')} IST\n`);
            }
        }
        
        if (!record) {
            console.log('No NASDAQ closing record found for Jan 9th/10th. Creating new record...\n');
            // Create new record for Jan 10th IST (when Jan 9th ET closing is captured)
            const capturedAt = jan10IST.clone().hour(2).minute(0).second(0).millisecond(0);
            const insertQuery = `
                INSERT INTO price_captures 
                (nasdaq, capture_time, captured_at, nasdaq_changed, is_auto_captured)
                VALUES ($1, 'nasdaq_closing', $2, true, true)
                RETURNING id
            `;
            const insertResult = await pool.query(insertQuery, [newPrice, capturedAt.toISOString()]);
            console.log(`✓ Created new record with ID: ${insertResult.rows[0].id}`);
            console.log(`  Price: $${newPrice}`);
            console.log(`  Captured at: ${capturedAt.format('YYYY-MM-DD HH:mm:ss')} IST\n`);
        } else {
            // Update existing record
            const updateQuery = `
                UPDATE price_captures 
                SET nasdaq = $1, nasdaq_changed = true
                WHERE id = $2
                RETURNING id, nasdaq
            `;
            const updateResult = await pool.query(updateQuery, [newPrice, record.id]);
            console.log(`✓ Updated record ID: ${updateResult.rows[0].id}`);
            console.log(`  Old price: $${record.nasdaq}`);
            console.log(`  New price: $${updateResult.rows[0].nasdaq}\n`);
        }
        
        await pool.end();
        console.log('Done!');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

updateNasdaqJan9Closing();

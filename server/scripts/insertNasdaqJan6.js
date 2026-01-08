const { pool } = require('../db/database');
const moment = require('moment-timezone');
const { getNasdaqOpeningIST } = require('../utils/nasdaqTimeConverter');

const TZ = "Asia/Kolkata";

async function insertNasdaqJan6() {
    try {
        console.log('Inserting NASDAQ opening for Jan 6, 2026...\n');
        
        // Jan 6, 2026 is a Tuesday (US trading day)
        // NASDAQ opening for Jan 6 US trading day is captured on Jan 6 evening IST
        const jan6Date = moment.tz('2026-01-06', 'YYYY-MM-DD', TZ);
        const nasdaqOpeningJan6 = getNasdaqOpeningIST(jan6Date);
        
        const nasdaqPrice = 25462.06;
        
        // Check if it already exists
        const checkQuery = `
            SELECT * FROM price_captures 
            WHERE (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = $1 
            AND capture_time = 'nasdaq_opening'
            AND nasdaq IS NOT NULL
        `;
        const checkRes = await pool.query(checkQuery, ['2026-01-06']);
        
        if (checkRes.rows.length > 0) {
            console.log('⚠ NASDAQ opening for Jan 6, 2026 already exists:');
            console.log(`   Price: $${checkRes.rows[0].nasdaq}`);
            console.log(`   Timestamp: ${checkRes.rows[0].captured_at}`);
            console.log('\nDo you want to update it? (This script will insert a new record)');
        }
        
        // Insert the capture
        const insertQuery = `
            INSERT INTO price_captures 
            (nifty, nasdaq, gold_24k_per_1g, capture_time, captured_at, is_auto_captured, nifty_changed, nasdaq_changed, gold_changed)
            VALUES ($1, $2, $3, $4, $5::timestamp with time zone, false, $6, $7, $8)
            RETURNING id, captured_at
        `;
        
        const result = await pool.query(insertQuery, [
            null, // nifty
            nasdaqPrice, // nasdaq
            null, // gold
            'nasdaq_opening', // capture_time
            nasdaqOpeningJan6.toISOString(), // captured_at
            false, // nifty_changed
            true, // nasdaq_changed
            false // gold_changed
        ]);
        
        const inserted = result.rows[0];
        const istTime = moment(inserted.captured_at).tz('Asia/Kolkata');
        
        console.log('✓ NASDAQ Opening inserted successfully!');
        console.log(`   Date: Jan 6, 2026`);
        console.log(`   Price: $${nasdaqPrice.toFixed(2)}`);
        console.log(`   IST Time: ${istTime.format('YYYY-MM-DD HH:mm:ss')} IST`);
        console.log(`   UTC Time: ${moment(inserted.captured_at).utc().format('YYYY-MM-DD HH:mm:ss')} UTC`);
        console.log(`   Record ID: ${inserted.id}`);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

insertNasdaqJan6();


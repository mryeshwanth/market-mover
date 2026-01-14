const { pool } = require('../db/database');
const moment = require('moment-timezone');

async function fetchNasdaqJan9() {
    try {
        // Jan 9th ET closing would be captured on Jan 10th IST early morning
        // Let's check both Jan 9th IST and Jan 10th IST dates
        
        // Check for Jan 9th IST date (in case it was captured on Jan 9th)
        const jan9IST = moment.tz('2026-01-09', 'YYYY-MM-DD', 'Asia/Kolkata');
        const jan10IST = moment.tz('2026-01-10', 'YYYY-MM-DD', 'Asia/Kolkata');
        
        console.log('Checking for NASDAQ closing on Jan 9th...\n');
        
        // Query for Jan 9th IST date
        const query1 = `
            SELECT * FROM price_captures 
            WHERE capture_time = 'nasdaq_closing'
            AND DATE(timezone('Asia/Kolkata', captured_at)) = $1
            AND nasdaq IS NOT NULL
            ORDER BY captured_at DESC
        `;
        
        const result1 = await pool.query(query1, [jan9IST.format('YYYY-MM-DD')]);
        console.log(`Records found for Jan 9th IST (${jan9IST.format('YYYY-MM-DD')}):`);
        if (result1.rows.length > 0) {
            result1.rows.forEach(row => {
                const capturedAtIST = moment(row.captured_at).tz('Asia/Kolkata');
                const capturedAtET = moment(row.captured_at).tz('America/New_York');
                console.log(`  Price: $${row.nasdaq}`);
                console.log(`  Captured at (IST): ${capturedAtIST.format('YYYY-MM-DD HH:mm:ss')} IST`);
                console.log(`  Captured at (ET): ${capturedAtET.format('YYYY-MM-DD HH:mm:ss')} ET`);
                console.log(`  Captured at (UTC): ${row.captured_at}`);
                console.log(`  ID: ${row.id}\n`);
            });
        } else {
            console.log('  No records found\n');
        }
        
        // Query for Jan 10th IST date (where Jan 9th ET closing would be captured)
        const result2 = await pool.query(query1, [jan10IST.format('YYYY-MM-DD')]);
        console.log(`Records found for Jan 10th IST (${jan10IST.format('YYYY-MM-DD')}):`);
        if (result2.rows.length > 0) {
            result2.rows.forEach(row => {
                const capturedAtIST = moment(row.captured_at).tz('Asia/Kolkata');
                const capturedAtET = moment(row.captured_at).tz('America/New_York');
                console.log(`  Price: $${row.nasdaq}`);
                console.log(`  Captured at (IST): ${capturedAtIST.format('YYYY-MM-DD HH:mm:ss')} IST`);
                console.log(`  Captured at (ET): ${capturedAtET.format('YYYY-MM-DD HH:mm:ss')} ET`);
                console.log(`  Captured at (UTC): ${row.captured_at}`);
                console.log(`  ID: ${row.id}\n`);
            });
        } else {
            console.log('  No records found\n');
        }
        
        // Also check all NASDAQ closing records around Jan 9th
        console.log('All NASDAQ closing records around Jan 9th:');
        const queryAll = `
            SELECT * FROM price_captures 
            WHERE capture_time = 'nasdaq_closing'
            AND nasdaq IS NOT NULL
            AND captured_at >= $1
            AND captured_at <= $2
            ORDER BY captured_at DESC
        `;
        
        const startDate = moment.tz('2026-01-08', 'YYYY-MM-DD', 'Asia/Kolkata').startOf('day').toISOString();
        const endDate = moment.tz('2026-01-11', 'YYYY-MM-DD', 'Asia/Kolkata').endOf('day').toISOString();
        
        const resultAll = await pool.query(queryAll, [startDate, endDate]);
        if (resultAll.rows.length > 0) {
            resultAll.rows.forEach(row => {
                const capturedAtIST = moment(row.captured_at).tz('Asia/Kolkata');
                const capturedAtET = moment(row.captured_at).tz('America/New_York');
                console.log(`  Price: $${row.nasdaq}`);
                console.log(`  Captured at (IST): ${capturedAtIST.format('YYYY-MM-DD HH:mm:ss')} IST`);
                console.log(`  Captured at (ET): ${capturedAtET.format('YYYY-MM-DD HH:mm:ss')} ET`);
                console.log(`  ID: ${row.id}\n`);
            });
        } else {
            console.log('  No records found\n');
        }
        
        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fetchNasdaqJan9();

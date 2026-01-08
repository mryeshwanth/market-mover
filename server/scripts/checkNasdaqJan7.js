const { Pool } = require('pg');
const moment = require('moment-timezone');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:zYyOvmlNdUywNLUCneuUpryjoQzfaXOu@centerbeam.proxy.rlwy.net:37107/railway';

async function checkNasdaqJan7() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Checking NASDAQ data for Jan 7, 2026...\n');
        
        // Check opening for Jan 7 IST
        const openQuery = `
            SELECT 
                nasdaq,
                captured_at,
                capture_time,
                TO_CHAR(captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS') as ist_time,
                TO_CHAR(captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York', 'YYYY-MM-DD HH24:MI:SS') as et_time
            FROM price_captures 
            WHERE (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = '2026-01-07'
            AND capture_time = 'nasdaq_opening'
            AND nasdaq IS NOT NULL
            ORDER BY captured_at
        `;
        
        const openRes = await pool.query(openQuery);
        console.log('NASDAQ Opening for Jan 7 IST:');
        if (openRes.rows.length > 0) {
            openRes.rows.forEach(row => {
                console.log(`  ✓ Found: $${row.nasdaq} at ${row.ist_time} IST (${row.et_time} ET)`);
            });
        } else {
            console.log('  ✗ No opening found for Jan 7 IST');
        }
        
        // Check closing for Jan 8 IST (Jan 7 US trading day closing is captured on Jan 8 IST)
        const closeQuery = `
            SELECT 
                nasdaq,
                captured_at,
                capture_time,
                TO_CHAR(captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS') as ist_time,
                TO_CHAR(captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York', 'YYYY-MM-DD HH24:MI:SS') as et_time
            FROM price_captures 
            WHERE (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = '2026-01-08'
            AND capture_time = 'nasdaq_closing'
            AND nasdaq IS NOT NULL
            ORDER BY captured_at
        `;
        
        const closeRes = await pool.query(closeQuery);
        console.log('\nNASDAQ Closing for Jan 8 IST (should be Jan 7 US trading day closing):');
        if (closeRes.rows.length > 0) {
            closeRes.rows.forEach(row => {
                console.log(`  ✓ Found: $${row.nasdaq} at ${row.ist_time} IST (${row.et_time} ET)`);
            });
        } else {
            console.log('  ✗ No closing found for Jan 8 IST');
        }
        
        // Also check what the code would query
        console.log('\n=== What the code logic would query ===');
        const { getETDateForIST } = require('../utils/nasdaqTimeConverter');
        const now = moment();
        const currentET = getETDateForIST(now);
        const currentETDate = currentET.clone().startOf('day');
        
        console.log(`Current time: ${now.format('YYYY-MM-DD HH:mm:ss')} IST`);
        console.log(`Current ET: ${currentET.format('YYYY-MM-DD HH:mm:ss')} ET`);
        console.log(`Current ET date: ${currentETDate.format('YYYY-MM-DD')}`);
        
        // Simulate the logic
        let startETDate = currentETDate.clone();
        if (currentET.hour() >= 16 || (currentET.hour() === 16 && currentET.minute() >= 0)) {
            while (startETDate.day() === 0 || startETDate.day() === 6) {
                startETDate.subtract(1, 'day');
            }
        } else {
            startETDate.subtract(1, 'day');
            while (startETDate.day() === 0 || startETDate.day() === 6) {
                startETDate.subtract(1, 'day');
            }
        }
        
        console.log(`Start ET date for search: ${startETDate.format('YYYY-MM-DD')}`);
        
        // Check what dates would be queried for Jan 7 US trading day
        const jan7ET = moment.tz('2026-01-07', 'YYYY-MM-DD', 'America/New_York');
        const jan7ETDate = jan7ET.clone().startOf('day');
        console.log(`\nFor Jan 7 US trading day (${jan7ETDate.format('YYYY-MM-DD')} ET):`);
        const openingISTDate = moment.tz(jan7ETDate.format('YYYY-MM-DD'), 'YYYY-MM-DD', 'Asia/Kolkata');
        const closingISTDate = openingISTDate.clone().add(1, 'day');
        console.log(`  Opening IST date to query: ${openingISTDate.format('YYYY-MM-DD')}`);
        console.log(`  Closing IST date to query: ${closingISTDate.format('YYYY-MM-DD')}`);
        
        // Actually query using the helper function logic
        const openingISTDateStr = openingISTDate.format('YYYY-MM-DD');
        const closingISTDateStr = closingISTDate.format('YYYY-MM-DD');
        
        const testOpenQuery = `
            SELECT * FROM price_captures 
            WHERE (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = $1 
            AND capture_time = 'nasdaq_opening'
            AND nasdaq IS NOT NULL
            ORDER BY captured_at ASC 
            LIMIT 1
        `;
        const testOpenRes = await pool.query(testOpenQuery, [openingISTDateStr]);
        console.log(`\nQuery result for opening on ${openingISTDateStr}:`);
        if (testOpenRes.rows.length > 0) {
            console.log(`  ✓ Found: $${testOpenRes.rows[0].nasdaq}`);
        } else {
            console.log(`  ✗ Not found`);
        }
        
        const testCloseQuery = `
            SELECT * FROM price_captures 
            WHERE (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = $1 
            AND capture_time = 'nasdaq_closing'
            AND nasdaq IS NOT NULL
            ORDER BY captured_at DESC 
            LIMIT 1
        `;
        const testCloseRes = await pool.query(testCloseQuery, [closingISTDateStr]);
        console.log(`Query result for closing on ${closingISTDateStr}:`);
        if (testCloseRes.rows.length > 0) {
            console.log(`  ✓ Found: $${testCloseRes.rows[0].nasdaq}`);
        } else {
            console.log(`  ✗ Not found`);
        }
        
        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        await pool.end();
        process.exit(1);
    }
}

checkNasdaqJan7();


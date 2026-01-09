require('dotenv').config();
const captureService = require('../services/captureService');
const db = require('../db/database');
const moment = require('moment-timezone');

const TZ = "Asia/Kolkata";

async function testNasdaqOpening() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Testing NASDAQ Opening Capture');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const now = moment.tz(TZ);
    console.log(`Current time: ${now.format('YYYY-MM-DD HH:mm:ss')} IST\n`);
    
    try {
        console.log('Triggering NASDAQ opening capture...\n');
        const result = await captureService.captureAll('nasdaq_opening');
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✓ Capture completed successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('Result:');
        console.log(`  ID: ${result.id}`);
        console.log(`  NASDAQ Price: $${result.nasdaq}`);
        console.log(`  NASDAQ Changed: ${result.nasdaq_changed}`);
        console.log(`  Source: ${result.source || 'N/A'}\n`);
        
        // Verify the data was inserted correctly
        const verifyQuery = `
            SELECT 
                id,
                nasdaq,
                capture_time,
                captured_at,
                DATE(timezone('Asia/Kolkata', captured_at)) as ist_date,
                TO_CHAR(timezone('Asia/Kolkata', captured_at), 'YYYY-MM-DD HH24:MI:SS') as ist_time
            FROM price_captures 
            WHERE id = $1
        `;
        
        const verifyRes = await db.query(verifyQuery, [result.id]);
        if (verifyRes.rows.length > 0) {
            const record = verifyRes.rows[0];
            console.log('Database Verification:');
            console.log(`  Record ID: ${record.id}`);
            console.log(`  NASDAQ: $${record.nasdaq}`);
            console.log(`  Capture Time: ${record.capture_time}`);
            console.log(`  IST Date: ${record.ist_date}`);
            console.log(`  IST Time: ${record.ist_time}`);
            console.log(`  UTC: ${record.captured_at}\n`);
        }
        
        process.exit(0);
    } catch (error) {
        console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('✗ Capture failed!');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.error('Error:', error.message);
        console.error('\nFull error:', error);
        process.exit(1);
    }
}

testNasdaqOpening();

/**
 * Script to fix timestamps in existing database records
 */

const { Pool } = require('pg');
const moment = require('moment-timezone');
const { getNasdaqOpeningIST, getNasdaqClosingIST } = require('../utils/nasdaqTimeConverter');
require('dotenv').config();

const TZ = "Asia/Kolkata";
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:zYyOvmlNdUywNLUCneuUpryjoQzfaXOu@centerbeam.proxy.rlwy.net:37107/railway';

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function fixTimestamps() {
    try {
        console.log('Fixing timestamps in database...\n');
        
        // Get all records
        const allRecords = await pool.query('SELECT id, capture_time, captured_at FROM price_captures ORDER BY id');
        
        for (const record of allRecords.rows) {
            const { id, capture_time, captured_at } = record;
            const currentDate = moment.tz(captured_at, TZ);
            let newTimestamp;
            
            // Calculate correct timestamp based on capture type and date
            switch (capture_time) {
                case 'nifty_opening':
                    newTimestamp = currentDate.clone().hour(9).minute(20).second(0).millisecond(0);
                    break;
                case 'nifty_closing':
                    newTimestamp = currentDate.clone().hour(15).minute(40).second(0).millisecond(0);
                    break;
                case 'nasdaq_opening':
                    // Use the date from captured_at to determine ET trading day
                    // For opening, the date in captured_at should be the ET trading day
                    const openingETDate = currentDate.clone();
                    newTimestamp = getNasdaqOpeningIST(openingETDate);
                    break;
                case 'nasdaq_closing':
                    // For nasdaq_closing, the captured_at date in IST is the next day after ET trading day
                    // Example: ET trading day Jan 1 closes at 4 PM ET = Jan 2 02:30 IST (EST) or Jan 2 01:30 IST (EDT)
                    // So if captured_at is Jan 2, the ET trading day is Jan 1
                    // We subtract 1 day from the date part to get the ET trading day
                    const closingETDate = currentDate.clone().startOf('day').subtract(1, 'day');
                    newTimestamp = getNasdaqClosingIST(closingETDate);
                    break;
                case 'gold_daily':
                    newTimestamp = currentDate.clone().hour(8).minute(0).second(0).millisecond(0);
                    break;
                default:
                    continue;
            }
            
            const pgTimestamp = newTimestamp.format('YYYY-MM-DD HH:mm:ss') + '+05:30';
            
            await pool.query(`
                UPDATE price_captures 
                SET captured_at = $1::timestamp with time zone
                WHERE id = $2
            `, [pgTimestamp, id]);
            
            console.log(`✓ Fixed ID ${id} (${capture_time}): ${moment.tz(captured_at, TZ).format('YYYY-MM-DD HH:mm:ss')} → ${newTimestamp.format('YYYY-MM-DD HH:mm:ss')}`);
        }
        
        console.log('\n✓ All timestamps fixed!');
        
    } catch (error) {
        console.error('Error fixing timestamps:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

fixTimestamps()
    .then(() => {
        console.log('\nScript completed.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });


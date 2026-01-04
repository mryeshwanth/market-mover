/**
 * Script to check what data exists in the database from 1st Jan 2026
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

// Set timezone to IST for all connections
pool.on('connect', async (client) => {
    await client.query("SET timezone = 'Asia/Kolkata'");
});

async function checkExistingData() {
    try {
        console.log('='.repeat(60));
        console.log('Existing Data from 1st Jan 2026');
        console.log('='.repeat(60));
        console.log(`Timezone: ${TZ}\n`);

        const query = `
            SELECT 
                (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date as capture_date,
                capture_time,
                nifty,
                nasdaq,
                gold_24k_per_1g,
                captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as captured_at_ist
            FROM price_captures
            WHERE (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= '2026-01-01'
            ORDER BY captured_at_ist ASC
        `;

        const res = await pool.query(query);
        
        console.log(`Total records found: ${res.rows.length}\n`);
        
        // Group by date and capture_time
        const grouped = {};
        res.rows.forEach(row => {
            const date = row.capture_date;
            const type = row.capture_time;
            if (!grouped[date]) {
                grouped[date] = {};
            }
            grouped[date][type] = {
                nifty: row.nifty,
                nasdaq: row.nasdaq,
                gold: row.gold_24k_per_1g,
                captured_at: row.captured_at_ist
            };
        });

        // Print grouped data
        const dates = Object.keys(grouped).sort();
        dates.forEach(date => {
            const dayName = moment.tz(date, 'YYYY-MM-DD', TZ).format('dddd');
            console.log(`\n${date} (${dayName}):`);
            const dayData = grouped[date];
            
            if (dayData.nifty_opening) {
                console.log(`  Nifty Opening: ${dayData.nifty_opening.nifty} (${dayData.nifty_opening.captured_at})`);
            } else {
                console.log(`  Nifty Opening: MISSING`);
            }
            
            if (dayData.nifty_closing) {
                console.log(`  Nifty Closing: ${dayData.nifty_closing.nifty} (${dayData.nifty_closing.captured_at})`);
            } else {
                console.log(`  Nifty Closing: MISSING`);
            }
            
            if (dayData.nasdaq_opening) {
                console.log(`  Nasdaq Opening: ${dayData.nasdaq_opening.nasdaq} (${dayData.nasdaq_opening.captured_at})`);
            } else {
                console.log(`  Nasdaq Opening: MISSING`);
            }
            
            if (dayData.nasdaq_closing) {
                console.log(`  Nasdaq Closing: ${dayData.nasdaq_closing.nasdaq} (${dayData.nasdaq_closing.captured_at})`);
            } else {
                console.log(`  Nasdaq Closing: MISSING`);
            }
            
            if (dayData.gold_daily) {
                console.log(`  Gold Daily: ${dayData.gold_daily.gold} (${dayData.gold_daily.captured_at})`);
            } else {
                console.log(`  Gold Daily: MISSING`);
            }
        });

        console.log('\n' + '='.repeat(60));

    } catch (error) {
        console.error('Error checking existing data:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

checkExistingData()
    .then(() => {
        console.log('\nScript completed.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });


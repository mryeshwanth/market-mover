/**
 * Script to check for missing entries in the database from 1st Jan 2026
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

// Set timezone to IST for all connections
pool.on('connect', async (client) => {
    await client.query("SET timezone = 'Asia/Kolkata'");
});

async function checkMissingEntries() {
    try {
        console.log('='.repeat(60));
        console.log('Checking for Missing Entries from 1st Jan 2026');
        console.log('='.repeat(60));
        console.log(`Timezone: ${TZ}\n`);

        const startDate = moment.tz('2026-01-01', 'YYYY-MM-DD', TZ);
        const today = moment.tz(TZ);
        
        const missingEntries = {
            nifty_opening: [],
            nifty_closing: [],
            nasdaq_opening: [],
            nasdaq_closing: [],
            gold_daily: []
        };

        // Check each day from 1st Jan to today
        const current = startDate.clone();
        while (current.isSameOrBefore(today, 'day')) {
            const dateStr = current.format('YYYY-MM-DD');
            const dayOfWeek = current.day(); // 0=Sunday, 1=Monday, ..., 6=Saturday
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            // Check Nifty Opening (weekdays only)
            if (!isWeekend) {
                const niftyOpenQuery = `
                    SELECT * FROM price_captures 
                    WHERE (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = $1 
                    AND capture_time = 'nifty_opening'
                    AND nifty IS NOT NULL
                `;
                const niftyOpenRes = await pool.query(niftyOpenQuery, [dateStr]);
                if (niftyOpenRes.rows.length === 0) {
                    missingEntries.nifty_opening.push(dateStr);
                }
            }

            // Check Nifty Closing (weekdays only)
            if (!isWeekend) {
                const niftyCloseQuery = `
                    SELECT * FROM price_captures 
                    WHERE (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = $1 
                    AND capture_time = 'nifty_closing'
                    AND nifty IS NOT NULL
                `;
                const niftyCloseRes = await pool.query(niftyCloseQuery, [dateStr]);
                if (niftyCloseRes.rows.length === 0) {
                    missingEntries.nifty_closing.push(dateStr);
                }
            }

            // Check Nasdaq Opening (weekdays only)
            if (!isWeekend) {
                // Nasdaq opening is at 20:00 IST, which is the same day in IST
                const nasdaqOpenQuery = `
                    SELECT * FROM price_captures 
                    WHERE (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = $1 
                    AND capture_time = 'nasdaq_opening'
                    AND nasdaq IS NOT NULL
                `;
                const nasdaqOpenRes = await pool.query(nasdaqOpenQuery, [dateStr]);
                if (nasdaqOpenRes.rows.length === 0) {
                    missingEntries.nasdaq_opening.push(dateStr);
                }
            }

            // Check Nasdaq Closing (weekdays only)
            // Nasdaq closing is at 02:30 IST next day, so we check if closing exists for this trading day
            if (!isWeekend) {
                // Nasdaq closing for a weekday is captured the next day at 02:30 IST
                // So for Monday's closing, we look for a record on Tuesday at 02:30 IST
                // We check if there's a closing record that represents this day's closing
                const nextDay = current.clone().add(1, 'day');
                const nasdaqCloseQuery = `
                    SELECT * FROM price_captures 
                    WHERE (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = $1 
                    AND capture_time = 'nasdaq_closing'
                    AND nasdaq IS NOT NULL
                `;
                // The closing for current day is stored on next day at 02:30 IST
                const nasdaqCloseRes = await pool.query(nasdaqCloseQuery, [nextDay.format('YYYY-MM-DD')]);
                if (nasdaqCloseRes.rows.length === 0) {
                    // Also check if it's stored on the same day (edge case)
                    const sameDayRes = await pool.query(nasdaqCloseQuery, [dateStr]);
                    if (sameDayRes.rows.length === 0) {
                        missingEntries.nasdaq_closing.push(dateStr);
                    }
                }
            }

            // Check Gold Daily (all days including weekends)
            const goldQuery = `
                SELECT * FROM price_captures 
                WHERE (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = $1 
                AND capture_time = 'gold_daily'
                AND gold_24k_per_1g IS NOT NULL
            `;
            const goldRes = await pool.query(goldQuery, [dateStr]);
            if (goldRes.rows.length === 0) {
                missingEntries.gold_daily.push(dateStr);
            }

            // Move to next day
            current.add(1, 'day');
        }

        // Print results
        console.log('\nMissing Entries Summary:\n');
        console.log(`Nifty Opening (Weekdays): ${missingEntries.nifty_opening.length} missing`);
        if (missingEntries.nifty_opening.length > 0) {
            console.log('  Missing dates:', missingEntries.nifty_opening.join(', '));
        }

        console.log(`\nNifty Closing (Weekdays): ${missingEntries.nifty_closing.length} missing`);
        if (missingEntries.nifty_closing.length > 0) {
            console.log('  Missing dates:', missingEntries.nifty_closing.join(', '));
        }

        console.log(`\nNasdaq Opening (Weekdays): ${missingEntries.nasdaq_opening.length} missing`);
        if (missingEntries.nasdaq_opening.length > 0) {
            console.log('  Missing dates:', missingEntries.nasdaq_opening.join(', '));
        }

        console.log(`\nNasdaq Closing (Weekdays): ${missingEntries.nasdaq_closing.length} missing`);
        if (missingEntries.nasdaq_closing.length > 0) {
            console.log('  Missing dates:', missingEntries.nasdaq_closing.join(', '));
        }

        console.log(`\nGold Daily (All Days): ${missingEntries.gold_daily.length} missing`);
        if (missingEntries.gold_daily.length > 0) {
            console.log('  Missing dates:', missingEntries.gold_daily.join(', '));
        }

        console.log('\n' + '='.repeat(60));
        console.log('Summary:');
        console.log(`Total missing Nifty Opening: ${missingEntries.nifty_opening.length}`);
        console.log(`Total missing Nifty Closing: ${missingEntries.nifty_closing.length}`);
        console.log(`Total missing Nasdaq Opening: ${missingEntries.nasdaq_opening.length}`);
        console.log(`Total missing Nasdaq Closing: ${missingEntries.nasdaq_closing.length}`);
        console.log(`Total missing Gold Daily: ${missingEntries.gold_daily.length}`);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('Error checking missing entries:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

checkMissingEntries()
    .then(() => {
        console.log('\nScript completed.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });


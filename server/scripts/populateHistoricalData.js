/**
 * Script to clear database and populate with historical data
 * 
 * This script:
 * 1. Clears all existing price_captures data
 * 2. Fetches historical data for Nifty, Nasdaq, and Gold
 * 3. Inserts data according to the capture schedule
 * 
 * Usage: node server/scripts/populateHistoricalData.js [startDate] [endDate]
 * Example: node server/scripts/populateHistoricalData.js 2024-01-01 2025-01-15
 */

const { Pool } = require('pg');
const axios = require('axios');
const moment = require('moment-timezone');
require('dotenv').config();

const TZ = "Asia/Kolkata";
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:zYyOvmlNdUywNLUCneuUpryjoQzfaXOu@centerbeam.proxy.rlwy.net:37107/railway';

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

// Yahoo Finance API
const YAHOO_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

async function fetchHistoricalPrice(symbol, date) {
    try {
        // Convert date to Unix timestamp
        const startTimestamp = moment.tz(date, TZ).startOf('day').unix();
        const endTimestamp = moment.tz(date, TZ).endOf('day').unix();
        
        const response = await axios.get(`${YAHOO_BASE_URL}/${symbol}`, {
            params: {
                period1: startTimestamp,
                period2: endTimestamp,
                interval: '1d'
            }
        });

        const result = response.data.chart.result[0];
        if (!result || !result.meta) {
            return null;
        }

        // Get the price for that specific date
        const timestamps = result.timestamp || [];
        const closes = result.indicators.quote[0].close || [];
        
        // Find the closest timestamp to our target date
        let closestPrice = null;
        let closestDiff = Infinity;
        
        for (let i = 0; i < timestamps.length; i++) {
            const ts = timestamps[i];
            const price = closes[i];
            if (price === null) continue;
            
            const diff = Math.abs(ts - startTimestamp);
            if (diff < closestDiff) {
                closestDiff = diff;
                closestPrice = price;
            }
        }
        
        return closestPrice || result.meta.regularMarketPrice || null;
    } catch (error) {
        console.error(`Error fetching ${symbol} for ${date}:`, error.message);
        return null;
    }
}

async function fetchGoldPrice(date) {
    // For now, we'll use a placeholder or you can provide actual historical gold prices
    // Gold prices need to be scraped or provided manually
    // This is a placeholder - you'll need to provide actual historical data
    return null;
}

async function clearDatabase() {
    try {
        console.log('Clearing existing data...');
        await pool.query('TRUNCATE TABLE price_captures RESTART IDENTITY CASCADE');
        console.log('Database cleared successfully.');
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

async function populateHistoricalData(startDate, endDate) {
    const start = moment.tz(startDate, TZ);
    const end = moment.tz(endDate, TZ);
    const current = start.clone();
    
    console.log(`\nPopulating data from ${start.format('YYYY-MM-DD')} to ${end.format('YYYY-MM-DD')}...\n`);
    
    let insertedCount = 0;
    
    while (current.isSameOrBefore(end)) {
        const dateStr = current.format('YYYY-MM-DD');
        const dayOfWeek = current.day(); // 0=Sunday, 1=Monday, ..., 6=Saturday
        
        // Nifty Opening - Only on Mondays at 09:20 IST
        if (dayOfWeek === 1) {
            const captureTime = moment.tz(current.format('YYYY-MM-DD') + ' 09:20', 'YYYY-MM-DD HH:mm', TZ);
            const niftyPrice = await fetchHistoricalPrice('^NSEI', dateStr);
            if (niftyPrice) {
                await insertCapture(niftyPrice, null, null, 'nifty_opening', captureTime.toISOString());
                insertedCount++;
                console.log(`✓ Nifty Opening: ${dateStr} - ₹${niftyPrice}`);
            }
        }
        
        // Nifty Closing - Monday to Friday at 15:40 IST
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            const captureTime = moment.tz(current.format('YYYY-MM-DD') + ' 15:40', 'YYYY-MM-DD HH:mm', TZ);
            const niftyPrice = await fetchHistoricalPrice('^NSEI', dateStr);
            if (niftyPrice) {
                await insertCapture(niftyPrice, null, null, 'nifty_closing', captureTime.toISOString());
                insertedCount++;
                console.log(`✓ Nifty Closing: ${dateStr} - ₹${niftyPrice}`);
            }
        }
        
        // Nasdaq Opening - Only on Mondays at 20:00 IST
        if (dayOfWeek === 1) {
            const captureTime = moment.tz(current.format('YYYY-MM-DD') + ' 20:00', 'YYYY-MM-DD HH:mm', TZ);
            const nasdaqPrice = await fetchHistoricalPrice('^NDX', dateStr);
            if (nasdaqPrice) {
                await insertCapture(null, nasdaqPrice, null, 'nasdaq_opening', captureTime.toISOString());
                insertedCount++;
                console.log(`✓ Nasdaq Opening: ${dateStr} - $${nasdaqPrice}`);
            }
        }
        
        // Nasdaq Closing - Tuesday to Saturday at 03:00 IST (next day)
        if (dayOfWeek >= 2 && dayOfWeek <= 6) {
            // For Tuesday-Saturday closing, we capture the previous day's close
            // Tuesday 03:00 = Monday 4PM EST close
            const prevDate = current.clone().subtract(1, 'day');
            const captureTime = moment.tz(current.format('YYYY-MM-DD') + ' 03:00', 'YYYY-MM-DD HH:mm', TZ);
            const nasdaqPrice = await fetchHistoricalPrice('^NDX', prevDate.format('YYYY-MM-DD'));
            if (nasdaqPrice) {
                await insertCapture(null, nasdaqPrice, null, 'nasdaq_closing', captureTime.toISOString());
                insertedCount++;
                console.log(`✓ Nasdaq Closing: ${dateStr} (prev day close) - $${nasdaqPrice}`);
            }
        }
        
        // Gold Daily - Every day at 08:00 IST
        const captureTime = moment.tz(current.format('YYYY-MM-DD') + ' 08:00', 'YYYY-MM-DD HH:mm', TZ);
        const goldPrice = await fetchGoldPrice(dateStr);
        if (goldPrice) {
            await insertCapture(null, null, goldPrice, 'gold_daily', captureTime.toISOString());
            insertedCount++;
            console.log(`✓ Gold Daily: ${dateStr} - ₹${goldPrice}`);
        } else {
            console.log(`⚠ Gold Daily: ${dateStr} - Price not available (needs manual input)`);
        }
        
        // Move to next day
        current.add(1, 'day');
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n✓ Total records inserted: ${insertedCount}`);
}

async function main() {
    try {
        // Get date range from command line or use defaults
        const startDate = process.argv[2] || moment.tz(TZ).subtract(3, 'months').format('YYYY-MM-DD');
        const endDate = process.argv[3] || moment.tz(TZ).format('YYYY-MM-DD');
        
        console.log('='.repeat(60));
        console.log('Historical Data Population Script');
        console.log('='.repeat(60));
        console.log(`Date Range: ${startDate} to ${endDate}`);
        console.log(`Timezone: ${TZ}`);
        console.log('='.repeat(60));
        
        // Clear database
        await clearDatabase();
        
        // Populate historical data
        await populateHistoricalData(startDate, endDate);
        
        console.log('\n✓ Historical data population completed!');
        
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
        console.log('\nScript completed successfully.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });


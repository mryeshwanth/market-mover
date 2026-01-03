/**
 * Cleanup script to fix wrong data entries in price_captures table
 * 
 * This script fixes records where:
 * - nifty_opening/nifty_closing have nasdaq or gold values
 * - nasdaq_opening/nasdaq_closing have nifty or gold values  
 * - gold_daily have nifty or nasdaq values
 * 
 * Run with: node server/scripts/cleanupWrongData.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:zYyOvmlNdUywNLUCneuUpryjoQzfaXOu@centerbeam.proxy.rlwy.net:37107/railway';

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function cleanupWrongData() {
    try {
        console.log('Starting cleanup of wrong data entries...\n');

        // Fix nifty_opening records - should only have nifty, null others
        const niftyOpeningResult = await pool.query(`
            UPDATE price_captures 
            SET nasdaq = NULL, gold_24k_per_1g = NULL
            WHERE capture_time = 'nifty_opening' 
            AND (nasdaq IS NOT NULL OR gold_24k_per_1g IS NOT NULL)
        `);
        console.log(`Fixed ${niftyOpeningResult.rowCount} nifty_opening records`);

        // Fix nifty_closing records - should only have nifty, null others
        const niftyClosingResult = await pool.query(`
            UPDATE price_captures 
            SET nasdaq = NULL, gold_24k_per_1g = NULL
            WHERE capture_time = 'nifty_closing' 
            AND (nasdaq IS NOT NULL OR gold_24k_per_1g IS NOT NULL)
        `);
        console.log(`Fixed ${niftyClosingResult.rowCount} nifty_closing records`);

        // Fix nasdaq_opening records - should only have nasdaq, null others
        const nasdaqOpeningResult = await pool.query(`
            UPDATE price_captures 
            SET nifty = NULL, gold_24k_per_1g = NULL
            WHERE capture_time = 'nasdaq_opening' 
            AND (nifty IS NOT NULL OR gold_24k_per_1g IS NOT NULL)
        `);
        console.log(`Fixed ${nasdaqOpeningResult.rowCount} nasdaq_opening records`);

        // Fix nasdaq_closing records - should only have nasdaq, null others
        const nasdaqClosingResult = await pool.query(`
            UPDATE price_captures 
            SET nifty = NULL, gold_24k_per_1g = NULL
            WHERE capture_time = 'nasdaq_closing' 
            AND (nifty IS NOT NULL OR gold_24k_per_1g IS NOT NULL)
        `);
        console.log(`Fixed ${nasdaqClosingResult.rowCount} nasdaq_closing records`);

        // Fix gold_daily records - should only have gold_24k_per_1g, null others
        const goldDailyResult = await pool.query(`
            UPDATE price_captures 
            SET nifty = NULL, nasdaq = NULL
            WHERE capture_time = 'gold_daily' 
            AND (nifty IS NOT NULL OR nasdaq IS NOT NULL)
        `);
        console.log(`Fixed ${goldDailyResult.rowCount} gold_daily records`);

        const totalFixed = niftyOpeningResult.rowCount + 
                          niftyClosingResult.rowCount + 
                          nasdaqOpeningResult.rowCount + 
                          nasdaqClosingResult.rowCount + 
                          goldDailyResult.rowCount;

        console.log(`\nTotal records fixed: ${totalFixed}`);
        console.log('Cleanup completed successfully!');

    } catch (error) {
        console.error('Error during cleanup:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run cleanup
cleanupWrongData()
    .then(() => {
        console.log('\nScript completed.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });


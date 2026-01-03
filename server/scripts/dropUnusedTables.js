/**
 * Migration script to drop unused tables: previous_captures and gold_scraping_log
 * These tables were defined in the schema but never used in the application.
 */

const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:zYyOvmlNdUywNLUCneuUpryjoQzfaXOu@centerbeam.proxy.rlwy.net:37107/railway';

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function dropUnusedTables() {
    try {
        console.log('Dropping unused tables...\n');
        
        // Drop gold_scraping_log first (no dependencies)
        try {
            await pool.query('DROP TABLE IF EXISTS gold_scraping_log CASCADE');
            console.log('✓ Dropped gold_scraping_log table');
        } catch (error) {
            console.log(`⚠ Error dropping gold_scraping_log: ${error.message}`);
        }
        
        // Drop previous_captures (has foreign key to price_captures, but CASCADE will handle it)
        try {
            await pool.query('DROP TABLE IF EXISTS previous_captures CASCADE');
            console.log('✓ Dropped previous_captures table');
        } catch (error) {
            console.log(`⚠ Error dropping previous_captures: ${error.message}`);
        }
        
        console.log('\n✓ Migration completed!');
        
    } catch (error) {
        console.error('Error during migration:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

dropUnusedTables()
    .then(() => {
        console.log('\nScript completed.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });


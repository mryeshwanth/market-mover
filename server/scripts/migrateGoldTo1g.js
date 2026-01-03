/**
 * Migration script to change gold column from per_10g to per_1g
 * This script:
 * 1. Renames the column from gold_24k_per_10g to gold_24k_per_1g
 * 2. Converts existing data from per 10g to per 1g (divide by 10)
 */

const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:zYyOvmlNdUywNLUCneuUpryjoQzfaXOu@centerbeam.proxy.rlwy.net:37107/railway';

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log('Starting migration: gold_24k_per_10g → gold_24k_per_1g\n');
        
        // Step 1: Check if column exists
        const checkColumn = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'price_captures' 
            AND column_name = 'gold_24k_per_10g'
        `);
        
        if (checkColumn.rows.length === 0) {
            console.log('Column gold_24k_per_10g does not exist. Checking for gold_24k_per_1g...');
            const checkNewColumn = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'price_captures' 
                AND column_name = 'gold_24k_per_1g'
            `);
            
            if (checkNewColumn.rows.length > 0) {
                console.log('✓ Column gold_24k_per_1g already exists. Migration not needed.');
                return;
            } else {
                console.log('Neither column exists. Creating gold_24k_per_1g...');
                await pool.query(`
                    ALTER TABLE price_captures 
                    ADD COLUMN gold_24k_per_1g DECIMAL(10,2)
                `);
                console.log('✓ Created gold_24k_per_1g column.');
                return;
            }
        }
        
        // Step 2: Add new column
        console.log('Adding new column gold_24k_per_1g...');
        await pool.query(`
            ALTER TABLE price_captures 
            ADD COLUMN gold_24k_per_1g DECIMAL(10,2)
        `);
        console.log('✓ New column added.');
        
        // Step 3: Convert existing data (divide by 10 to convert from 10g to 1g)
        console.log('Converting existing data (per 10g → per 1g)...');
        const updateResult = await pool.query(`
            UPDATE price_captures 
            SET gold_24k_per_1g = gold_24k_per_10g / 10.0
            WHERE gold_24k_per_10g IS NOT NULL
        `);
        console.log(`✓ Converted ${updateResult.rowCount} records.`);
        
        // Step 4: Drop old column
        console.log('Dropping old column gold_24k_per_10g...');
        await pool.query(`
            ALTER TABLE price_captures 
            DROP COLUMN gold_24k_per_10g
        `);
        console.log('✓ Old column dropped.');
        
        console.log('\n✓ Migration completed successfully!');
        
    } catch (error) {
        console.error('Error during migration:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

migrate()
    .then(() => {
        console.log('\nScript completed.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });


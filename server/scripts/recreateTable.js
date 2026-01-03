/**
 * Script to drop and recreate price_captures table with clean schema
 * and re-insert data with correct timestamps
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

async function recreateTable() {
    try {
        console.log('='.repeat(60));
        console.log('Recreating price_captures table');
        console.log('='.repeat(60));
        console.log(`Timezone: ${TZ}\n`);
        
        // Drop existing table and all indexes
        console.log('Dropping existing table and indexes...');
        await pool.query('DROP TABLE IF EXISTS price_captures CASCADE');
        console.log('✓ Table dropped\n');
        
        // Create new clean table
        console.log('Creating new table with clean schema...');
        const createTableQuery = `
            CREATE TABLE price_captures (
                id SERIAL PRIMARY KEY,
                nifty DECIMAL(10,2),
                nasdaq DECIMAL(10,2),
                gold_24k_per_1g DECIMAL(10,2),
                captured_at TIMESTAMP WITH TIME ZONE NOT NULL,
                capture_time VARCHAR(20) NOT NULL,
                nifty_changed BOOLEAN DEFAULT false,
                nasdaq_changed BOOLEAN DEFAULT false,
                gold_changed BOOLEAN DEFAULT false,
                is_auto_captured BOOLEAN DEFAULT false
            );
        `;
        await pool.query(createTableQuery);
        console.log('✓ Table created\n');
        
        // Create indexes
        console.log('Creating indexes...');
        await pool.query('CREATE INDEX idx_captured_at ON price_captures(captured_at)');
        await pool.query('CREATE INDEX idx_capture_time ON price_captures(capture_time)');
        await pool.query('CREATE INDEX idx_data_changed ON price_captures(nifty_changed, nasdaq_changed, gold_changed)');
        console.log('✓ Indexes created\n');
        
        // Insert data with correct timestamps
        console.log('Inserting data with correct timestamps...\n');
        
        async function insertCapture(nifty, nasdaq, gold, captureTime, capturedAt) {
            try {
                // Get previous capture of the same type for comparison
                const prevQuery = `
                    SELECT * FROM price_captures 
                    WHERE capture_time = $1 
                    ORDER BY captured_at DESC 
                    LIMIT 1
                `;
                const prevResult = await pool.query(prevQuery, [captureTime]);
                const previousCapture = prevResult.rows[0];
                
                // Calculate changed flags
                const threshold = 0.01;
                const hasChanged = (curr, prev) => {
                    if (curr === null || curr === undefined || prev === null || prev === undefined) return false;
                    return Math.abs(curr - prev) > threshold;
                };
                
                let niftyChanged = false;
                let nasdaqChanged = false;
                let goldChanged = false;
                
                if (previousCapture) {
                    niftyChanged = hasChanged(nifty, previousCapture.nifty);
                    nasdaqChanged = hasChanged(nasdaq, previousCapture.nasdaq);
                    goldChanged = hasChanged(gold, previousCapture.gold_24k_per_1g);
                } else {
                    // First capture of this type
                    niftyChanged = !!nifty;
                    nasdaqChanged = !!nasdaq;
                    goldChanged = !!gold;
                }
                
                // Format timestamp properly for PostgreSQL (with timezone)
                let timestampMoment;
                if (typeof capturedAt === 'string') {
                    timestampMoment = moment.tz(capturedAt, 'YYYY-MM-DD HH:mm', TZ);
                } else {
                    // It's already a moment object (for Nasdaq)
                    timestampMoment = capturedAt;
                }
                const pgTimestamp = timestampMoment.format('YYYY-MM-DD HH:mm:ss') + '+05:30'; // IST offset
                
                const query = `
                    INSERT INTO price_captures 
                    (nifty, nasdaq, gold_24k_per_1g, capture_time, captured_at, is_auto_captured, nifty_changed, nasdaq_changed, gold_changed)
                    VALUES ($1, $2, $3, $4, $5::timestamp with time zone, false, $6, $7, $8)
                    RETURNING id
                `;
                const result = await pool.query(query, [nifty, nasdaq, gold, captureTime, pgTimestamp, niftyChanged, nasdaqChanged, goldChanged]);
                return result.rows[0].id;
            } catch (error) {
                console.error(`Error inserting capture for ${captureTime} at ${capturedAt}:`, error);
                throw error;
            }
        }
        
        // Nifty 50 Data
        await insertCapture(26173.30, null, null, 'nifty_opening', '2026-01-01 09:20');
        console.log('✓ Nifty Opening: 1 Jan 2026 09:20 IST - ₹26,173.30');
        
        await insertCapture(26146.55, null, null, 'nifty_closing', '2026-01-01 15:40');
        console.log('✓ Nifty Closing: 1 Jan 2026 15:40 IST - ₹26,146.55');
        
        await insertCapture(26155.10, null, null, 'nifty_opening', '2026-01-02 09:20');
        console.log('✓ Nifty Opening: 2 Jan 2026 09:20 IST - ₹26,155.10');
        
        await insertCapture(26328.55, null, null, 'nifty_closing', '2026-01-02 15:40');
        console.log('✓ Nifty Closing: 2 Jan 2026 15:40 IST - ₹26,328.55');
        
        // Nasdaq Data (using dynamic ET to IST conversion)
        const nasdaqOpening1 = getNasdaqOpeningIST(moment.tz('2026-01-01', 'YYYY-MM-DD', TZ));
        await insertCapture(null, 25248.77, null, 'nasdaq_opening', nasdaqOpening1);
        console.log(`✓ Nasdaq Opening: 1 Jan 2026 - $25,248.77 (${nasdaqOpening1.format('YYYY-MM-DD HH:mm')} IST)`);
        
        const nasdaqClosing1 = getNasdaqClosingIST(moment.tz('2026-01-01', 'YYYY-MM-DD', TZ));
        await insertCapture(null, 25248.77, null, 'nasdaq_closing', nasdaqClosing1);
        console.log(`✓ Nasdaq Closing: 1 Jan 2026 - $25,248.77 (${nasdaqClosing1.format('YYYY-MM-DD HH:mm')} IST)`);
        
        const nasdaqOpening2 = getNasdaqOpeningIST(moment.tz('2026-01-02', 'YYYY-MM-DD', TZ));
        await insertCapture(null, 25524.27, null, 'nasdaq_opening', nasdaqOpening2);
        console.log(`✓ Nasdaq Opening: 2 Jan 2026 - $25,524.27 (${nasdaqOpening2.format('YYYY-MM-DD HH:mm')} IST)`);
        
        const nasdaqClosing2 = getNasdaqClosingIST(moment.tz('2026-01-02', 'YYYY-MM-DD', TZ));
        await insertCapture(null, 25206.17, null, 'nasdaq_closing', nasdaqClosing2);
        console.log(`✓ Nasdaq Closing: 2 Jan 2026 - $25,206.17 (${nasdaqClosing2.format('YYYY-MM-DD HH:mm')} IST)`);
        
        // Gold Data (per 1g)
        await insertCapture(null, null, 13584.00, 'gold_daily', '2026-01-01 08:00');
        console.log('✓ Gold Daily: 1 Jan 2026 08:00 IST - ₹13,584.00');
        
        await insertCapture(null, null, 13702.00, 'gold_daily', '2026-01-02 08:00');
        console.log('✓ Gold Daily: 2 Jan 2026 08:00 IST - ₹13,702.00');
        
        await insertCapture(null, null, 13582.00, 'gold_daily', '2026-01-03 08:00');
        console.log('✓ Gold Daily: 3 Jan 2026 08:00 IST - ₹13,582.00');
        
        console.log('\n✓ All data inserted successfully!');
        console.log('\n✓ Table recreation completed!');
        
    } catch (error) {
        console.error('Error recreating table:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

recreateTable()
    .then(() => {
        console.log('\nScript completed.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });


const { Pool } = require('pg');
const moment = require('moment-timezone');
const { getNasdaqOpeningIST, getNasdaqClosingIST } = require('../utils/nasdaqTimeConverter');

// Database connection - can be set via environment variable or passed directly
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:zYyOvmlNdUywNLUCneuUpryjoQzfaXOu@centerbeam.proxy.rlwy.net:37107/railway';

const TZ = "Asia/Kolkata";

async function insertNasdaqData() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Railway requires SSL
    });

    try {
        console.log('Connecting to database...\n');
        
        // Test connection
        await pool.query('SELECT NOW()');
        console.log('✅ Database connection successful!\n');

        const records = [
            {
                date: '2026-01-06',
                price: 25462.06,
                type: 'nasdaq_opening',
                description: 'Jan 6, 2026 Opening'
            },
            {
                date: '2026-01-07',
                price: 25617.80,
                type: 'nasdaq_opening',
                description: 'Jan 7, 2026 Opening'
            },
            {
                date: '2026-01-07',
                price: 25653.90,
                type: 'nasdaq_closing',
                description: 'Jan 7, 2026 Closing'
            }
        ];

        for (const record of records) {
            try {
                const dateMoment = moment.tz(record.date, 'YYYY-MM-DD', TZ);
                let capturedAt;
                
                if (record.type === 'nasdaq_opening') {
                    // For opening, we need to determine the US trading day
                    // Jan 6 opening = Jan 6 US trading day opening (captured on Jan 6 evening IST)
                    // Jan 7 opening = Jan 7 US trading day opening (captured on Jan 7 evening IST)
                    capturedAt = getNasdaqOpeningIST(dateMoment);
                } else {
                    // For closing, it's the previous US trading day's closing
                    // Jan 7 closing = Jan 7 US trading day closing (captured on Jan 8 early morning IST)
                    capturedAt = getNasdaqClosingIST(dateMoment);
                }

                // Check if record already exists for this US trading day
                // For opening: check if opening exists on the IST date when it should be captured
                // For closing: check if closing exists on the IST date when it should be captured (next day)
                const checkDate = capturedAt.clone().tz('Asia/Kolkata').format('YYYY-MM-DD');
                const checkQuery = `
                    SELECT * FROM price_captures 
                    WHERE (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = $1 
                    AND capture_time = $2
                    AND nasdaq IS NOT NULL
                    ORDER BY captured_at DESC
                    LIMIT 1
                `;
                
                const checkRes = await pool.query(checkQuery, [checkDate, record.type]);
                
                if (checkRes.rows.length > 0) {
                    const existing = checkRes.rows[0];
                    const existingPrice = Number(existing.nasdaq);
                    const expectedPrice = record.price;
                    
                    if (Math.abs(existingPrice - expectedPrice) < 0.01) {
                        console.log(`✓ ${record.description} already exists with correct price:`);
                        console.log(`   Price: $${existingPrice.toFixed(2)}`);
                        console.log(`   Timestamp: ${moment(existing.captured_at).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')} IST`);
                        console.log(`   Skipping...\n`);
                        continue;
                    } else {
                        // Update existing record with new price
                        console.log(`⚠ ${record.description} exists with different price:`);
                        console.log(`   Old Price: $${existingPrice.toFixed(2)}`);
                        console.log(`   New Price: $${expectedPrice.toFixed(2)}`);
                        console.log(`   Updating...`);
                        
                        const updateQuery = `
                            UPDATE price_captures 
                            SET nasdaq = $1, nasdaq_changed = true, captured_at = $2::timestamp with time zone
                            WHERE id = $3
                            RETURNING id, nasdaq, captured_at
                        `;
                        
                        const updateRes = await pool.query(updateQuery, [
                            record.price,
                            capturedAt.toISOString(),
                            existing.id
                        ]);
                        
                        const updated = updateRes.rows[0];
                        const istTime = moment(updated.captured_at).tz('Asia/Kolkata');
                        
                        console.log(`✅ ${record.description} updated successfully!`);
                        console.log(`   Price: $${Number(updated.nasdaq).toFixed(2)}`);
                        console.log(`   IST Time: ${istTime.format('YYYY-MM-DD HH:mm:ss')} IST`);
                        console.log(`   Record ID: ${updated.id}\n`);
                        continue;
                    }
                }

                // Insert the record
                const insertQuery = `
                    INSERT INTO price_captures 
                    (nifty, nasdaq, gold_24k_per_1g, capture_time, captured_at, is_auto_captured, nifty_changed, nasdaq_changed, gold_changed)
                    VALUES ($1, $2, $3, $4, $5::timestamp with time zone, false, $6, $7, $8)
                    RETURNING id, captured_at, nasdaq
                `;
                
                const result = await pool.query(insertQuery, [
                    null, // nifty
                    record.price, // nasdaq
                    null, // gold
                    record.type, // capture_time
                    capturedAt.toISOString(), // captured_at
                    false, // nifty_changed
                    true, // nasdaq_changed
                    false // gold_changed
                ]);
                
                const inserted = result.rows[0];
                const istTime = moment(inserted.captured_at).tz('Asia/Kolkata');
                
                console.log(`✅ ${record.description} inserted successfully!`);
                console.log(`   Price: $${Number(inserted.nasdaq).toFixed(2)}`);
                console.log(`   IST Time: ${istTime.format('YYYY-MM-DD HH:mm:ss')} IST`);
                console.log(`   UTC Time: ${moment(inserted.captured_at).utc().format('YYYY-MM-DD HH:mm:ss')} UTC`);
                console.log(`   Record ID: ${inserted.id}\n`);
                
            } catch (error) {
                console.error(`❌ Error inserting ${record.description}:`, error.message);
                console.log('');
            }
        }

        console.log('✅ All insertions completed!');
        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Database error:', error.message);
        await pool.end();
        process.exit(1);
    }
}

insertNasdaqData();


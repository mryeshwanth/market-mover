const db = require('../db/database');
const yahooFinance = require('./yahooFinance');
const goldScraper = require('./goldScraper');
const dataChangeDetector = require('./dataChangeDetector');
const moment = require('moment-timezone');
const { getNasdaqOpeningIST, getNasdaqClosingIST, getETDateForIST } = require('../utils/nasdaqTimeConverter');

const TZ = "Asia/Kolkata";

class CaptureService {
    async captureAll(type) {
        console.log(`Starting capture for type: ${type}`);

        // 1. Fetch data based on capture type
        let niftyPrice = null;
        let nasdaqPrice = null;
        let goldPrice = null;

        // Fetch Nifty data only for Nifty captures
        if (type === 'nifty_opening' || type === 'nifty_closing') {
            try {
                const niftyData = await yahooFinance.fetchPrice(yahooFinance.SYMBOLS.NIFTY);
                niftyPrice = niftyData.price;
            } catch (e) {
                console.error("Failed to fetch Nifty price", e);
            }
        }

        // Fetch Nasdaq data only for Nasdaq captures
        if (type === 'nasdaq_opening' || type === 'nasdaq_closing') {
            try {
                const nasdaqData = await yahooFinance.fetchPrice(yahooFinance.SYMBOLS.NASDAQ);
                nasdaqPrice = nasdaqData.price;
                console.log(`✓ Successfully fetched NASDAQ price: $${nasdaqPrice}`);
            } catch (e) {
                console.error("Failed to fetch Nasdaq price", e);
                // Don't insert NULL record if NASDAQ fetch fails - throw error to prevent insertion
                throw new Error(`NASDAQ price fetch failed: ${e.message}`);
            }
        }

        // Fetch Gold Data only for Gold captures
        if (type === 'gold_daily') {
            try {
                const goldData = await goldScraper.scrapeGoldPrice();
                goldPrice = goldData.price;
                // Store source information for logging
                this.lastGoldSource = goldData.source;
            } catch (e) {
                console.error("Failed to fetch gold price", e);
                // Don't insert NULL record if gold fetch fails - throw error to prevent insertion
                throw new Error(`Gold price fetch failed: ${e.message}`);
            }
        }

        // 2. Get Previous Capture of the same type for comparison
        const lastCaptureResult = await db.query(`
            SELECT * FROM price_captures 
            WHERE capture_time = $1 
            ORDER BY captured_at DESC 
            LIMIT 1
        `, [type]);
        const previousCapture = lastCaptureResult.rows[0];

        const currentCaptureRaw = {
            nifty: niftyPrice,
            nasdaq: nasdaqPrice,
            gold: goldPrice
        };

        // 3. Detect Changes
        const changes = dataChangeDetector.detectChanges(currentCaptureRaw, previousCapture);

        // 4. Calculate the correct captured_at timestamp based on capture type and current time
        let capturedAt;
        const now = moment.tz(TZ);
        
        switch (type) {
            case 'nifty_opening':
                capturedAt = now.clone().hour(9).minute(20).second(0).millisecond(0);
                break;
            case 'nifty_closing':
                capturedAt = now.clone().hour(15).minute(40).second(0).millisecond(0);
                break;
            case 'nasdaq_opening':
                // For Nasdaq opening, we're capturing the current US trading day's opening
                // At 7:30 PM IST, we're capturing today's US trading day opening
                // Determine which US trading day (ET) we're capturing based on current IST time
                const currentET = getETDateForIST(now);
                const currentETDate = currentET.clone().startOf('day');
                
                // If it's before 9:30 AM ET, we're capturing yesterday's opening
                // Otherwise, we're capturing today's opening
                let usTradingDay = currentETDate.clone();
                if (currentET.hour() < 9 || (currentET.hour() === 9 && currentET.minute() < 30)) {
                    // Before market open, capture previous trading day
                    usTradingDay.subtract(1, 'day');
                    // Skip weekends
                    while (usTradingDay.day() === 0 || usTradingDay.day() === 6) {
                        usTradingDay.subtract(1, 'day');
                    }
                }
                
                capturedAt = getNasdaqOpeningIST(usTradingDay);
                break;
            case 'nasdaq_closing':
                // For Nasdaq closing, we're capturing the previous ET trading day's closing
                // Cron runs at 2:00 AM IST (Tue-Sat)
                // At 2:00 AM IST on Jan 10th, it's Jan 9th 4:30 PM ET (previous evening)
                // The market closed on Jan 9th at 4:00 PM ET (which is Jan 10th 2:30 AM IST)
                // So we capture Jan 9th ET's closing
                const closingET = getETDateForIST(now);
                const closingETDate = closingET.clone().startOf('day');
                
                // At 2:00 AM IST, we're capturing the ET day that just closed
                // Example: Jan 10th 02:00 AM IST -> Jan 9th ET -> capture Jan 9th ET closing
                let usClosingDay = closingETDate.clone();
                // Skip weekends - if it's a weekend, go back to Friday
                while (usClosingDay.day() === 0 || usClosingDay.day() === 6) {
                    usClosingDay.subtract(1, 'day');
                }
                
                // Use actual capture time (when cron runs) - this is when we actually captured the data
                capturedAt = now.clone();
                break;
            case 'gold_daily':
                capturedAt = now.clone().hour(8).minute(0).second(0).millisecond(0);
                break;
            default:
                capturedAt = now;
        }

        // 5. Check for duplicates before inserting (especially for NASDAQ)
        if (type === 'nasdaq_closing' || type === 'nasdaq_opening') {
            const todayIST = capturedAt.clone().tz('Asia/Kolkata').startOf('day');
            const duplicateCheck = await db.query(`
                SELECT * FROM price_captures 
                WHERE capture_time = $1
                AND DATE(timezone('Asia/Kolkata', captured_at)) = $2
                AND nasdaq IS NOT NULL
                ORDER BY captured_at DESC
                LIMIT 1
            `, [type, todayIST.format('YYYY-MM-DD')]);
            
            if (duplicateCheck.rows.length > 0) {
                const existing = duplicateCheck.rows[0];
                const existingPrice = parseFloat(existing.nasdaq);
                const newPrice = parseFloat(nasdaqPrice);
                
                // If price is different, update the existing record
                if (Math.abs(existingPrice - newPrice) > 0.01) {
                    console.log(`⚠ ${type} already exists for ${todayIST.format('YYYY-MM-DD')} IST with price $${existingPrice}, updating to $${newPrice}`);
                    const updateQuery = `
                        UPDATE price_captures 
                        SET nasdaq = $1, captured_at = $2, nasdaq_changed = $3
                        WHERE id = $4
                        RETURNING id
                    `;
                    const updateResult = await db.query(updateQuery, [
                        nasdaqPrice,
                        capturedAt.toISOString(),
                        changes.nasdaq_changed,
                        existing.id
                    ]);
                    return {
                        id: updateResult.rows[0].id,
                        nasdaq: nasdaqPrice,
                        ...changes
                    };
                } else {
                    // Same price, skip insertion
                    console.log(`✓ ${type} already exists for ${todayIST.format('YYYY-MM-DD')} IST with same price $${existingPrice}, skipping`);
                    return {
                        id: existing.id,
                        nasdaq: nasdaqPrice,
                        ...changes
                    };
                }
            }
        }

        // 6. Save to DB with explicit timestamp
        const insertQuery = `
            INSERT INTO price_captures 
            (nifty, nasdaq, gold_24k_per_1g, capture_time, captured_at, nifty_changed, nasdaq_changed, gold_changed, is_auto_captured)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
            RETURNING id
        `;

        // Log what we're about to insert
        if (type === 'nasdaq_opening' || type === 'nasdaq_closing') {
            const istTime = capturedAt.clone().tz('Asia/Kolkata');
            console.log(`Inserting NASDAQ ${type}:`);
            console.log(`  Price: $${nasdaqPrice}`);
            console.log(`  Captured at (IST): ${istTime.format('YYYY-MM-DD HH:mm:ss')} IST`);
            console.log(`  Captured at (UTC): ${capturedAt.toISOString()}`);
        }

        const dbResult = await db.query(insertQuery, [
            niftyPrice,
            nasdaqPrice,
            goldPrice,
            type,
            capturedAt.toISOString(),
            changes.nifty_changed,
            changes.nasdaq_changed,
            changes.gold_changed
        ]);

        const newId = dbResult.rows[0].id;
        
        if (type === 'nasdaq_opening' || type === 'nasdaq_closing') {
            console.log(`✓ NASDAQ ${type} inserted successfully with ID: ${newId}`);
        }

        const result = {
            id: newId,
            ...currentCaptureRaw,
            ...changes
        };

        // Add source information for gold captures
        if (type === 'gold_daily' && this.lastGoldSource) {
            result.source = this.lastGoldSource;
        }

        return result;
    }
}

module.exports = new CaptureService();

const db = require('../db/database');
const yahooFinance = require('./yahooFinance');
const goldScraper = require('./goldScraper');
const dataChangeDetector = require('./dataChangeDetector');
const moment = require('moment-timezone');
const { getNasdaqOpeningIST, getNasdaqClosingIST } = require('../utils/nasdaqTimeConverter');

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
            } catch (e) {
                console.error("Failed to fetch Nasdaq price", e);
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
                // For Nasdaq opening, we're capturing Monday's opening
                // Determine which Monday (ET trading day) we're capturing
                // If it's Monday IST, use today. Otherwise, find the most recent Monday.
                let openingDate = now.clone();
                if (now.day() !== 1) {
                    // Not Monday, find the most recent Monday
                    openingDate = now.clone().day(1);
                    if (openingDate.isAfter(now)) {
                        openingDate.subtract(7, 'days');
                    }
                }
                capturedAt = getNasdaqOpeningIST(openingDate);
                break;
            case 'nasdaq_closing':
                // For Nasdaq closing, we're capturing the previous ET trading day's closing
                // If cron runs Tue-Sat IST at 03:00, we're capturing the previous day's closing
                // Determine which ET trading day's closing we're capturing
                let closingDate = now.clone().subtract(1, 'day');
                // If it's Saturday or Sunday IST, we're capturing Friday's closing
                if (now.day() === 6) { // Saturday
                    closingDate = now.clone().subtract(1, 'day'); // Friday
                } else if (now.day() === 0) { // Sunday
                    closingDate = now.clone().subtract(2, 'days'); // Friday
                } else {
                    // Tuesday-Friday: capturing previous day's closing
                    closingDate = now.clone().subtract(1, 'day');
                }
                capturedAt = getNasdaqClosingIST(closingDate);
                break;
            case 'gold_daily':
                capturedAt = now.clone().hour(8).minute(0).second(0).millisecond(0);
                break;
            default:
                capturedAt = now;
        }

        // 5. Save to DB with explicit timestamp
        const insertQuery = `
            INSERT INTO price_captures 
            (nifty, nasdaq, gold_24k_per_1g, capture_time, captured_at, nifty_changed, nasdaq_changed, gold_changed, is_auto_captured)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
            RETURNING id
        `;

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

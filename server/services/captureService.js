const db = require('../db/database');
const yahooFinance = require('./yahooFinance');
const goldScraper = require('./goldScraper');
const dataChangeDetector = require('./dataChangeDetector');
const moment = require('moment-timezone');

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
            } catch (e) {
                console.error("Failed to fetch gold price", e);
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
                capturedAt = now.clone().hour(20).minute(0).second(0).millisecond(0);
                break;
            case 'nasdaq_closing':
                capturedAt = now.clone().hour(3).minute(0).second(0).millisecond(0);
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

        const result = await db.query(insertQuery, [
            niftyPrice,
            nasdaqPrice,
            goldPrice,
            type,
            capturedAt.toISOString(),
            changes.nifty_changed,
            changes.nasdaq_changed,
            changes.gold_changed
        ]);

        const newId = result.rows[0].id;

        return {
            id: newId,
            ...currentCaptureRaw,
            ...changes
        };
    }
}

module.exports = new CaptureService();

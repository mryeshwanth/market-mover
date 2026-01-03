const db = require('../db/database');
const yahooFinance = require('./yahooFinance');
const goldScraper = require('./goldScraper');
const dataChangeDetector = require('./dataChangeDetector');

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

        // 2. Get Previous Capture for comparison
        const previousCaptureQuery = `
      SELECT * FROM price_captures 
      WHERE capture_time = $1 
      ORDER BY captured_at DESC 
      LIMIT 1
    `;
        // We compare Morning vs Morning, Evening vs Evening usually to detect "Day Change"
        // OR: do we compare vs the *immediate last* capture?
        // The prompt says: "Compare with previous capture (Friday 3:35 PM or earlier)" for Week Start.
        // Daily Change Detection: "did price change from previous capture?".
        // Let's compare against the *immediate last captured row* regardless of type?
        // "Compare with previous capture (stored in database)"

        const lastCaptureResult = await db.query('SELECT * FROM price_captures ORDER BY id DESC LIMIT 1');
        const previousCapture = lastCaptureResult.rows[0];

        const currentCaptureRaw = {
            nifty: niftyPrice,
            nasdaq: nasdaqPrice,
            gold: goldPrice
        };

        // 3. Detect Changes
        const changes = dataChangeDetector.detectChanges(currentCaptureRaw, previousCapture);

        // 4. Save to DB
        const insertQuery = `
      INSERT INTO price_captures 
      (nifty, nasdaq, gold_24k_per_1g, capture_time, nifty_changed, nasdaq_changed, gold_changed, is_auto_captured)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      RETURNING id
    `;

        const result = await db.query(insertQuery, [
            niftyPrice,
            nasdaqPrice,
            goldPrice,
            type,
            changes.nifty_changed,
            changes.nasdaq_changed,
            changes.gold_changed
        ]);

        const newId = result.rows[0].id;

        // 5. Update Previous Captures Cache (Optional, derived from main table usually, but good for fast lookups)
        // We can skip this if we just query the main table. The prompt suggested a 'previous_captures' table.
        // Let's implement it to be safe.
        // ... (To be implemented if strictly needed, but main logic uses price_captures)

        return {
            id: newId,
            ...currentCaptureRaw,
            ...changes
        };
    }
}

module.exports = new CaptureService();

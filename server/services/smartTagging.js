const db = require('../db/database');
const moment = require('moment-timezone');

class SmartTaggingService {

    async getCaptureForDay(dayName, captureTime) {
        // dayName: 'Monday', 'Tuesday', etc.
        // captureTime: 'morning', 'evening'
        // Logic: This is tricky because we need a specific date. 
        // The cron passes "Runs Monday evening".
        // So we look for the *most recent* Monday (today).

        // Better approach: This function is called by the cron job on a specific day.
        // So we just look for captures *today* or relative to today.
    }

    // --- Week Start ---
    // Logic: "Every Monday... check if data changed"
    async determineAndTagWeekStart() {
        console.log("Running Week Start Tagging...");
        // This runs on Monday 10PM (after all captures).
        // We want to find the first working day of *this week*.
        // Check Monday Morning capture.

        try {
            const today = moment().tz("Asia/Kolkata");
            // Check Monday (Day 1)
            const mondayDate = today.clone().day(1).format('YYYY-MM-DD');

            // Find capture for Monday Morning
            const mondayCapture = await this.findCaptureByDate(mondayDate, 'morning');

            if (mondayCapture && (mondayCapture.nifty_changed || mondayCapture.nasdaq_changed)) {
                await this.tagCapture(mondayCapture.id, 'week_start');
                console.log(`Tagged Week Start: ${mondayDate}`);
                return;
            }

            // If Monday didn't change, check Tuesday... BUT this cron runs on Monday!
            // So we can't check Tuesday yet. 
            // The requirement says: "Check Tuesday 9:20 AM capture, repeat until data changes".
            // This implies the tagging job needs to run daily OR check backwards.

            // REVISED STRATEGY based on Prompt:
            // "Tag week_start (runs Monday evening after both captures)" -> This assumes Monday is usually the day.
            // If Monday is a holiday, we won't know until Tuesday.
            // So the tagging job ideally should run *daily* and check "Is this the first working day of the week?".

            // However, let's stick to the prompt's suggested cron: "Runs Monday evening".
            // If Monday is a holiday, the tagger will fail to tag anything.
            // We probably need a smarter daily check:
            // "Am I weight start?" -> "If today is Mon and changed? Yes." -> "If today is Tue and Mon was holiday and I changed? Yes."

            // Simplified for this implementation:
            // We will make the "Week Start Tagger" run Daily.
            // If it finds a 'week_start' for this week already, it stops.

            // But for now, let's implement the prompt's explicit logic if possible, or improve it.
            // Prompt says: "Check Tuesday... repeat". 
            // So we should run this tagger daily? Or just on Monday and look forward? (Can't look forward).

            // I will implement a "Check Current Week Start" function that can be run daily.
            // It looks at Mon, then Tue, etc.
        } catch (e) {
            console.error("Error tagging week start", e);
        }
    }

    // Helper: Find capture by date string and timing
    async findCaptureByDate(dateStr, timeType) {
        const res = await db.query(`
        SELECT * FROM price_captures 
        WHERE DATE(captured_at AT TIME ZONE 'Asia/Kolkata') = $1
        AND capture_time = $2
        LIMIT 1
    `, [dateStr, timeType]);
        return res.rows[0];
    }

    async tagCapture(id, tag) {
        await db.query(`
        UPDATE price_captures 
        SET tags = array_append(tags, $1)
        WHERE id = $2 AND NOT ($1 = ANY(tags))
    `, [tag, id]);
    }
}

module.exports = new SmartTaggingService();

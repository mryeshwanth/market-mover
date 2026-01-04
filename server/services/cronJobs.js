const cron = require('node-cron');
const captureService = require('./captureService');
const db = require('../db/database');
const moment = require('moment-timezone');

// Timezone: Asia/Kolkata
const TZ = "Asia/Kolkata";

// Store active gold retry intervals
const goldRetryIntervals = new Map();

// Check if gold was already captured today
async function isGoldCapturedToday() {
    const today = moment.tz(TZ).format('YYYY-MM-DD');
    const query = `
        SELECT * FROM price_captures 
        WHERE (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = $1 
        AND capture_time = 'gold_daily'
        AND gold_24k_per_1g IS NOT NULL
        LIMIT 1
    `;
    const result = await db.query(query, [today]);
    return result.rows.length > 0;
}

// Retry gold capture with different sources
async function retryGoldCapture(attemptNumber = 1, maxAttempts = 10) {
    const today = moment.tz(TZ).format('YYYY-MM-DD');
    
    // Check if already captured today
    const alreadyCaptured = await isGoldCapturedToday();
    if (alreadyCaptured) {
        console.log(`✓ Gold already captured for ${today}. Stopping retry attempts.`);
        // Clear any scheduled retries
        const intervalId = goldRetryIntervals.get(today);
        if (intervalId) {
            clearInterval(intervalId);
            goldRetryIntervals.delete(today);
        }
        return;
    }

    if (attemptNumber > maxAttempts) {
        console.error(`✗ Gold capture failed after ${maxAttempts} attempts. Giving up for today.`);
        const intervalId = goldRetryIntervals.get(today);
        if (intervalId) {
            clearInterval(intervalId);
            goldRetryIntervals.delete(today);
        }
        return;
    }

    console.log(`\n[Attempt ${attemptNumber}/${maxAttempts}] Retrying Gold Capture for ${today}...`);
    
    try {
        const result = await captureService.captureAll('gold_daily');
        console.log(`\n✓✓✓ GOLD CAPTURED SUCCESSFULLY ✓✓✓`);
        console.log(`   Date: ${today}`);
        console.log(`   Price: ₹${result.gold.toFixed(2)} per gram (24K)`);
        console.log(`   Source: ${result.source || 'N/A'}`);
        console.log(`   Attempt: ${attemptNumber}`);
        console.log(`✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓\n`);
        
        // Clear retry interval
        const intervalId = goldRetryIntervals.get(today);
        if (intervalId) {
            clearInterval(intervalId);
            goldRetryIntervals.delete(today);
        }
    } catch (error) {
        console.error(`✗ Gold capture attempt ${attemptNumber} failed:`, error.message);
        
        // Schedule next retry after 10 minutes
        const nextAttempt = attemptNumber + 1;
        const intervalId = setTimeout(() => {
            retryGoldCapture(nextAttempt, maxAttempts);
        }, 10 * 60 * 1000); // 10 minutes in milliseconds
        
        goldRetryIntervals.set(today, intervalId);
        console.log(`   Next retry scheduled in 10 minutes (Attempt ${nextAttempt}/${maxAttempts})...`);
    }
}

const initCronJobs = () => {
    console.log("Initializing Cron Jobs...");
    
    const now = moment.tz(TZ);
    const currentTime = now.format('YYYY-MM-DD HH:mm:ss');
    const dayOfWeek = now.day(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    
    console.log(`\nCurrent Time (IST): ${currentTime}`);
    console.log(`Day of Week: ${now.format('dddd')} (${isWeekday ? 'Weekday' : 'Weekend'})\n`);
    
    console.log("Scheduled Cron Jobs:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    if (isWeekday) {
        const nextNiftyOpen = now.clone().hour(9).minute(20).second(0);
        if (nextNiftyOpen.isBefore(now)) {
            nextNiftyOpen.add(1, 'day');
        }
        console.log(`✓ Nifty Opening:     Every weekday at 09:20 IST (Next: ${nextNiftyOpen.format('YYYY-MM-DD HH:mm')} IST)`);
        
        const nextNiftyClose = now.clone().hour(15).minute(40).second(0);
        if (nextNiftyClose.isBefore(now)) {
            nextNiftyClose.add(1, 'day');
        }
        console.log(`✓ Nifty Closing:     Every weekday at 15:40 IST (Next: ${nextNiftyClose.format('YYYY-MM-DD HH:mm')} IST)`);
        
        const nextNasdaqOpen = now.clone().hour(19).minute(30).second(0);
        if (nextNasdaqOpen.isBefore(now)) {
            nextNasdaqOpen.add(1, 'day');
        }
        console.log(`✓ Nasdaq Opening:   Every weekday at 19:30 IST (Next: ${nextNasdaqOpen.format('YYYY-MM-DD HH:mm')} IST)`);
        
        const nextNasdaqClose = now.clone().hour(2).minute(0).second(0).add(1, 'day');
        if (nextNasdaqClose.isBefore(now)) {
            nextNasdaqClose.add(1, 'day');
        }
        console.log(`✓ Nasdaq Closing:   Every weekday at 02:00 IST next day (Next: ${nextNasdaqClose.format('YYYY-MM-DD HH:mm')} IST)`);
    } else {
        const nextWeekday = now.clone().day(1); // Next Monday
        if (nextWeekday.isBefore(now)) {
            nextWeekday.add(7, 'days');
        }
        console.log(`✓ Nifty Opening:     Every weekday at 09:20 IST (Next: ${nextWeekday.format('YYYY-MM-DD')} 09:20 IST)`);
        console.log(`✓ Nifty Closing:     Every weekday at 15:40 IST (Next: ${nextWeekday.format('YYYY-MM-DD')} 15:40 IST)`);
        console.log(`✓ Nasdaq Opening:   Every weekday at 19:30 IST (Next: ${nextWeekday.format('YYYY-MM-DD')} 19:30 IST)`);
        console.log(`✓ Nasdaq Closing:   Every weekday at 02:00 IST next day (Next: ${nextWeekday.clone().add(1, 'day').format('YYYY-MM-DD')} 02:00 IST)`);
    }
    
    const nextGoldDaily = now.clone().hour(8).minute(0).second(0);
    if (nextGoldDaily.isBefore(now)) {
        nextGoldDaily.add(1, 'day');
    }
    console.log(`✓ Gold Daily:        Every day at 08:00 IST (Next: ${nextGoldDaily.format('YYYY-MM-DD HH:mm')} IST)`);
    
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // NIFTY - Daily Opening (Every weekday 09:20 IST)
    cron.schedule('20 9 * * 1-5', async () => {
        console.log("Running Nifty Daily Opening Capture (Weekdays 09:20 IST)...");
        try {
            await captureService.captureAll('nifty_opening');
            console.log("✓ Nifty Daily Opening Capture completed successfully");
        } catch (error) {
            console.error("✗ Nifty Daily Opening Capture failed:", error.message);
        }
    }, { timezone: TZ });

    // NIFTY - Daily Closing (Every weekday 15:40 IST)
    cron.schedule('40 15 * * 1-5', async () => {
        console.log("Running Nifty Daily Closing Capture (Weekdays 15:40 IST)...");
        try {
            await captureService.captureAll('nifty_closing');
            console.log("✓ Nifty Daily Closing Capture completed successfully");
        } catch (error) {
            console.error("✗ Nifty Daily Closing Capture failed:", error.message);
        }
    }, { timezone: TZ });

    // NASDAQ - Daily Opening (Every weekday 19:30 IST - dynamically adjusted for EST/EDT)
    cron.schedule('30 19 * * 1-5', async () => {
        console.log("Running Nasdaq Daily Opening Capture (Weekdays ~19:30 IST, dynamically adjusted for EST/EDT)...");
        try {
            await captureService.captureAll('nasdaq_opening');
            console.log("✓ Nasdaq Daily Opening Capture completed successfully");
        } catch (error) {
            console.error("✗ Nasdaq Daily Opening Capture failed:", error.message);
        }
    }, { timezone: TZ });

    // NASDAQ - Daily Closing (Every weekday 02:00 IST next day - dynamically adjusted for EST/EDT)
    cron.schedule('0 2 * * 2-6', async () => {
        console.log("Running Nasdaq Daily Closing Capture (Weekdays ~02:00 IST, dynamically adjusted for EST/EDT)...");
        try {
            await captureService.captureAll('nasdaq_closing');
            console.log("✓ Nasdaq Daily Closing Capture completed successfully");
        } catch (error) {
            console.error("✗ Nasdaq Daily Closing Capture failed:", error.message);
        }
    }, { timezone: TZ });

    // GOLD - Daily Capture (Every day 08:00 IST)
    cron.schedule('0 8 * * *', async () => {
        console.log("\n=== Running Gold Daily Capture (08:00 IST) ===");
        const today = moment.tz(TZ).format('YYYY-MM-DD');
        
        // Check if already captured today
        const alreadyCaptured = await isGoldCapturedToday();
        if (alreadyCaptured) {
            console.log(`✓ Gold already captured for ${today}. Skipping.`);
            return;
        }

        try {
            const result = await captureService.captureAll('gold_daily');
            console.log(`\n✓✓✓ GOLD CAPTURED SUCCESSFULLY ✓✓✓`);
            console.log(`   Date: ${today}`);
            console.log(`   Price: ₹${result.gold.toFixed(2)} per gram (24K)`);
            console.log(`   Source: ${result.source || 'N/A'}`);
            console.log(`✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓\n`);
        } catch (error) {
            console.error("✗ Gold Daily Capture failed:", error.message);
            console.log("   Starting retry mechanism with 10-minute intervals...");
            // Start retry mechanism
            retryGoldCapture(1, 10);
        }
    }, { timezone: TZ });

    console.log("Cron Jobs scheduled.");
};

module.exports = { initCronJobs };

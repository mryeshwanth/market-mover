const cron = require('node-cron');
const captureService = require('./captureService');

// Timezone: Asia/Kolkata
const TZ = "Asia/Kolkata";

const initCronJobs = () => {
    console.log("Initializing Cron Jobs...");

    // INDIAN STOCKS - Opening Price (9:20 AM IST daily)
    cron.schedule('20 9 * * *', async () => {
        console.log("Running Opening Price Capture...");
        await captureService.captureAll('nifty_opening');
    }, { timezone: TZ });

    // INDIAN STOCKS - Closing Price (3:35 PM IST daily)
    cron.schedule('35 15 * * *', async () => {
        console.log("Running Closing Price Capture...");
        await captureService.captureAll('nifty_closing');
    }, { timezone: TZ });

    // NASDAQ - Evening Capture (8:05 PM IST daily)
    cron.schedule('5 20 * * *', async () => {
        console.log("Running Nasdaq Evening Capture (IST)...");
        await captureService.captureAll('nasdaq_evening');
    }, { timezone: TZ });

    // NASDAQ - Morning Capture (2:35 AM IST daily)
    cron.schedule('35 2 * * *', async () => {
        console.log("Running Nasdaq Morning Capture (IST)...");
        await captureService.captureAll('nasdaq_morning');
    }, { timezone: TZ });

    // GOLD - Daily Capture (8:00 AM IST daily)
    cron.schedule('0 8 * * *', async () => {
        console.log("Running Gold Daily Capture...");
        await captureService.captureAll('gold_daily');
    }, { timezone: TZ });

    // Tagging Jobs (Placeholders)
    // cron.schedule('0 22 * * *', ...); // Run daily to check for missed tags?

    console.log("Cron Jobs scheduled.");
};

module.exports = { initCronJobs };

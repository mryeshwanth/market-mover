const cron = require('node-cron');
const captureService = require('./captureService');

// Timezone: Asia/Kolkata
const TZ = "Asia/Kolkata";

const initCronJobs = () => {
    console.log("Initializing Cron Jobs...");

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

    // GOLD - Test Capture (13:30 IST - temporary for testing)
    cron.schedule('30 13 * * *', async () => {
        console.log("Running Gold Test Capture (13:30 IST)...");
        try {
            await captureService.captureAll('gold_daily');
            console.log("✓ Gold Test Capture completed successfully");
        } catch (error) {
            console.error("✗ Gold Test Capture failed:", error.message);
            // Don't insert NULL record - error is thrown to prevent insertion
        }
    }, { timezone: TZ });

    // GOLD - Daily Capture (Every day 08:00 IST)
    cron.schedule('0 8 * * *', async () => {
        console.log("Running Gold Daily Capture (08:00 IST)...");
        try {
            await captureService.captureAll('gold_daily');
            console.log("✓ Gold Daily Capture completed successfully");
        } catch (error) {
            console.error("✗ Gold Daily Capture failed:", error.message);
            // Don't insert NULL record - error is thrown to prevent insertion
        }
    }, { timezone: TZ });

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

    console.log("Cron Jobs scheduled.");
};

module.exports = { initCronJobs };

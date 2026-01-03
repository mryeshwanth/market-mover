const cron = require('node-cron');
const captureService = require('./captureService');

// Timezone: Asia/Kolkata
const TZ = "Asia/Kolkata";

const initCronJobs = () => {
    console.log("Initializing Cron Jobs...");

    // NIFTY - Opening Price (Monday 09:20 IST only, or 1st of month if not Monday)
    cron.schedule('20 9 * * 1', async () => {
        console.log("Running Nifty Opening Price Capture (Monday 09:20 IST)...");
        await captureService.captureAll('nifty_opening');
    }, { timezone: TZ });
    
    // NIFTY - Monthly Opening (1st of month 09:20 IST, if not a Monday)
    cron.schedule('20 9 1 * *', async () => {
        const moment = require('moment-timezone');
        const now = moment.tz(TZ);
        // Only run if 1st is not a Monday (Monday is handled by weekly cron)
        if (now.day() !== 1) {
            console.log("Running Nifty Monthly Opening Capture (1st of month 09:20 IST)...");
            await captureService.captureAll('nifty_opening');
        }
    }, { timezone: TZ });

    // NIFTY - Closing Price (Monday-Friday 15:40 IST, also handles monthly closing on last day)
    cron.schedule('40 15 * * 1-5', async () => {
        const moment = require('moment-timezone');
        const now = moment.tz(TZ);
        const lastDayOfMonth = now.clone().endOf('month').date();
        const today = now.date();
        
        if (today === lastDayOfMonth) {
            console.log("Running Nifty Closing Price Capture (Last day of month 15:40 IST)...");
        } else {
            console.log("Running Nifty Closing Price Capture (Weekdays 15:40 IST)...");
        }
        await captureService.captureAll('nifty_closing');
    }, { timezone: TZ });

    // NASDAQ - Opening Price (Monday 20:00 IST only, or 1st of month if not Monday)
    cron.schedule('0 20 * * 1', async () => {
        console.log("Running Nasdaq Opening Price Capture (Monday 20:00 IST)...");
        await captureService.captureAll('nasdaq_opening');
    }, { timezone: TZ });
    
    // NASDAQ - Monthly Opening (1st of month 20:00 IST, if not a Monday)
    cron.schedule('0 20 1 * *', async () => {
        const moment = require('moment-timezone');
        const now = moment.tz(TZ);
        // Only run if 1st is not a Monday (Monday is handled by weekly cron)
        if (now.day() !== 1) {
            console.log("Running Nasdaq Monthly Opening Capture (1st of month 20:00 IST)...");
            await captureService.captureAll('nasdaq_opening');
        }
    }, { timezone: TZ });

    // NASDAQ - Closing Price (Tuesday-Saturday 03:00 IST, also handles monthly closing on last day)
    cron.schedule('0 3 * * 2-6', async () => {
        const moment = require('moment-timezone');
        const now = moment.tz(TZ);
        const lastDayOfMonth = now.clone().endOf('month').date();
        const today = now.date();
        
        if (today === lastDayOfMonth) {
            console.log("Running Nasdaq Closing Price Capture (Last day of month 03:00 IST)...");
        } else {
            console.log("Running Nasdaq Closing Price Capture (Tue-Sat 03:00 IST)...");
        }
        await captureService.captureAll('nasdaq_closing');
    }, { timezone: TZ });

    // GOLD - Daily Capture (Every day 08:00 IST)
    cron.schedule('0 8 * * *', async () => {
        console.log("Running Gold Daily Capture (08:00 IST)...");
        await captureService.captureAll('gold_daily');
    }, { timezone: TZ });


    console.log("Cron Jobs scheduled.");
};

module.exports = { initCronJobs };

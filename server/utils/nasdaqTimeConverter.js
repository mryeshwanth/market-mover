/**
 * Utility to convert Nasdaq market times (ET) to IST dynamically
 * Handles EST/EDT automatically using moment-timezone
 */

const moment = require('moment-timezone');

const ET_TZ = 'America/New_York'; // Automatically handles EST/EDT
const IST_TZ = 'Asia/Kolkata';

/**
 * Convert Nasdaq opening time (9:30 AM ET) to IST
 * @param {moment.Moment} date - The date to convert (in IST timezone)
 * @returns {moment.Moment} - The IST timestamp for Nasdaq opening
 */
function getNasdaqOpeningIST(date) {
    // Create a moment in ET timezone for the given date at 9:30 AM
    const etDate = moment.tz(date.format('YYYY-MM-DD'), 'YYYY-MM-DD', ET_TZ);
    const etOpening = etDate.clone().hour(9).minute(30).second(0).millisecond(0);
    
    // Convert to IST
    const istOpening = etOpening.clone().tz(IST_TZ);
    
    return istOpening;
}

/**
 * Convert Nasdaq closing time (4:00 PM ET) to IST
 * Note: This will be the next day in IST (early morning)
 * @param {moment.Moment} date - The date of the ET trading day (in IST timezone)
 * @returns {moment.Moment} - The IST timestamp for Nasdaq closing (next day in IST)
 */
function getNasdaqClosingIST(date) {
    // Create a moment in ET timezone for the given date at 4:00 PM
    const etDate = moment.tz(date.format('YYYY-MM-DD'), 'YYYY-MM-DD', ET_TZ);
    const etClosing = etDate.clone().hour(16).minute(0).second(0).millisecond(0);
    
    // Convert to IST
    const istClosing = etClosing.clone().tz(IST_TZ);
    
    return istClosing;
}

/**
 * Get the ET date for a given IST date
 * This is useful when we have an IST date and need to know which ET trading day it corresponds to
 * @param {moment.Moment} istDate - The IST date
 * @returns {moment.Moment} - The corresponding ET date
 */
function getETDateForIST(istDate) {
    // Convert IST date to ET to get the trading day
    const etMoment = istDate.clone().tz(ET_TZ);
    return etMoment;
}

module.exports = {
    getNasdaqOpeningIST,
    getNasdaqClosingIST,
    getETDateForIST
};


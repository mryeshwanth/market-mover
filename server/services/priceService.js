const { pool } = require('../db/database');
const moment = require('moment-timezone');
const { getETDateForIST } = require('../utils/nasdaqTimeConverter');

const getPriceAnalysis = async () => {
    try {
        // 1. Get Latest/Current Price for EACH asset independently
        const currentQuery = `
            SELECT 
                (SELECT nifty FROM price_captures WHERE nifty IS NOT NULL ORDER BY captured_at DESC LIMIT 1) as nifty,
                (SELECT nasdaq FROM price_captures WHERE nasdaq IS NOT NULL ORDER BY captured_at DESC LIMIT 1) as nasdaq,
                (SELECT gold_24k_per_1g FROM price_captures WHERE gold_24k_per_1g IS NOT NULL ORDER BY captured_at DESC LIMIT 1) as gold_24k_per_1g,
                (SELECT captured_at FROM price_captures ORDER BY captured_at DESC LIMIT 1) as captured_at
        `;
        const currentRes = await pool.query(currentQuery);
        const current = currentRes.rows[0] || { nifty: 0, nasdaq: 0, gold_24k_per_1g: 0 };
        const now = moment();

        // Helper: Get Monday opening price for a specific date
        const getNiftyOpeningPrice = async (date) => {
            const query = `
                SELECT * FROM price_captures 
                WHERE (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = $1 
                AND capture_time = 'nifty_opening'
                AND nifty IS NOT NULL
                ORDER BY captured_at ASC 
                LIMIT 1
            `;
            const res = await pool.query(query, [date.format('YYYY-MM-DD')]);
            return res.rows[0] || null;
        };

        // Helper: Get Nifty closing price for a specific date
        const getNiftyClosingPrice = async (date) => {
            const query = `
                SELECT * FROM price_captures 
                WHERE (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = $1 
                AND capture_time = 'nifty_closing'
                AND nifty IS NOT NULL
                ORDER BY captured_at DESC 
                LIMIT 1
            `;
            const res = await pool.query(query, [date.format('YYYY-MM-DD')]);
            return res.rows[0] || null;
        };

        // Helper: Get last available weekday closing (for Nifty/Nasdaq)
        const getLastAvailableWeekdayClosing = async (startDate, endDate, captureType, assetField) => {
            // Start from endDate and go backwards, skipping weekends
            for (let i = 0; i <= 7; i++) {
                const checkDate = endDate.clone().subtract(i, 'days');
                
                // Skip weekends
                if (checkDate.day() === 0 || checkDate.day() === 6) continue;
                
                // Don't go before startDate
                if (checkDate.isBefore(startDate, 'day')) break;
                
                const query = `
                    SELECT * FROM price_captures 
                    WHERE (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = $1 
                    AND capture_time = $2
                    AND ${assetField} IS NOT NULL
                    ORDER BY captured_at DESC 
                    LIMIT 1
                `;
                const res = await pool.query(query, [checkDate.format('YYYY-MM-DD'), captureType]);
                if (res.rows.length > 0) {
                    return res.rows[0];
                }
            }
            return null;
        };

        // Helper: Get last available weekday opening (for Nifty/Nasdaq)
        const getLastAvailableWeekdayOpening = async (startDate, endDate, captureType, assetField) => {
            // Start from endDate and go backwards, skipping weekends
            for (let i = 0; i <= 7; i++) {
                const checkDate = endDate.clone().subtract(i, 'days');
                
                // Skip weekends
                if (checkDate.day() === 0 || checkDate.day() === 6) continue;
                
                // Don't go before startDate
                if (checkDate.isBefore(startDate, 'day')) break;
                
                const query = `
                    SELECT * FROM price_captures 
                    WHERE (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = $1 
                    AND capture_time = $2
                    AND ${assetField} IS NOT NULL
                    ORDER BY captured_at ASC 
                    LIMIT 1
                `;
                const res = await pool.query(query, [checkDate.format('YYYY-MM-DD'), captureType]);
                if (res.rows.length > 0) {
                    return res.rows[0];
                }
            }
            return null;
        };

        // Helper: Get Nasdaq opening price for a specific date (IST date)
        const getNasdaqOpeningPrice = async (date) => {
            const query = `
                SELECT * FROM price_captures 
                WHERE (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = $1 
                AND capture_time = 'nasdaq_opening'
                AND nasdaq IS NOT NULL
                ORDER BY captured_at ASC 
                LIMIT 1
            `;
            const res = await pool.query(query, [date.format('YYYY-MM-DD')]);
            return res.rows[0] || null;
        };

        // Helper: Get Nasdaq closing price for a specific date (IST date)
        const getNasdaqClosingPrice = async (date) => {
            const query = `
                SELECT * FROM price_captures 
                WHERE (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = $1 
                AND capture_time = 'nasdaq_closing'
                AND nasdaq IS NOT NULL
                ORDER BY captured_at DESC 
                LIMIT 1
            `;
            const res = await pool.query(query, [date.format('YYYY-MM-DD')]);
            return res.rows[0] || null;
        };

        // Helper: Get Nasdaq opening and closing for a specific US trading day
        // US trading day opening is captured on that day's evening IST
        // US trading day closing is captured on the next day's early morning IST
        const getNasdaqPricesForUSTradingDay = async (usTradingDateET) => {
            // Convert US trading day to IST to get the IST date when opening is captured
            // Opening for US trading day Jan 6 is captured on Jan 6 evening IST
            const openingISTDate = moment.tz(usTradingDateET.format('YYYY-MM-DD'), 'YYYY-MM-DD', 'Asia/Kolkata');
            const opening = await getNasdaqOpeningPrice(openingISTDate);
            
            // Closing for US trading day Jan 6 is captured on Jan 7 early morning IST
            const closingISTDate = openingISTDate.clone().add(1, 'day');
            const closing = await getNasdaqClosingPrice(closingISTDate);
            
            return { opening, closing };
        };

        // Helper: Get Gold price for a specific date
        const getGoldPrice = async (date) => {
            const query = `
                SELECT * FROM price_captures 
                WHERE (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = $1 
                AND capture_time = 'gold_daily'
                AND gold_24k_per_1g IS NOT NULL
                ORDER BY captured_at ASC 
                LIMIT 1
            `;
            const res = await pool.query(query, [date.format('YYYY-MM-DD')]);
            return res.rows[0] || null;
        };

        // Helper: Get last available day (for Gold)
        const getLastAvailableDay = async (startDate, endDate) => {
            // Start from endDate and go backwards
            for (let i = 0; i <= 31; i++) {
                const checkDate = endDate.clone().subtract(i, 'days');
                
                // Don't go before startDate
                if (checkDate.isBefore(startDate, 'day')) break;
                
                const query = `
                    SELECT * FROM price_captures 
                    WHERE (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = $1 
                    AND capture_time = 'gold_daily'
                    AND gold_24k_per_1g IS NOT NULL
                    ORDER BY captured_at DESC 
                    LIMIT 1
                `;
                const res = await pool.query(query, [checkDate.format('YYYY-MM-DD')]);
                if (res.rows.length > 0) {
                    return res.rows[0];
                }
            }
            return null;
        };

        // 2. WEEKLY CALCULATIONS
        const weekMonday = now.clone().startOf('isoWeek'); // Monday of current week
        
        // Nifty Weekly: Monday opening → Current day closing (or last available weekday closing)
        // If Monday opening doesn't exist, find first available weekday opening
        let weekMondayNiftyOpen = await getNiftyOpeningPrice(weekMonday);
        if (!weekMondayNiftyOpen) {
            // Find first available weekday opening in the week
            for (let i = 0; i <= 4; i++) {
                const checkDate = weekMonday.clone().add(i, 'days');
                weekMondayNiftyOpen = await getNiftyOpeningPrice(checkDate);
                if (weekMondayNiftyOpen) break;
            }
        }
        let weekNiftyClose = null;
        const currentDay = now.day(); // 0=Sunday, 1=Monday, ..., 6=Saturday
        
        if (currentDay >= 1 && currentDay <= 5) {
            // Current day is a weekday, try to get current day closing
            weekNiftyClose = await getNiftyClosingPrice(now);
            // If current day doesn't have closing, get last available weekday closing
            if (!weekNiftyClose) {
                weekNiftyClose = await getLastAvailableWeekdayClosing(weekMonday, now, 'nifty_closing', 'nifty');
            }
        } else {
            // Current day is weekend, get last available weekday closing
            weekNiftyClose = await getLastAvailableWeekdayClosing(weekMonday, now, 'nifty_closing', 'nifty');
        }

        // Nasdaq Weekly: Monday opening → Current day closing (or last available weekday closing)
        // If Monday opening doesn't exist, find first available weekday opening
        let weekMondayNasdaqOpen = await getNasdaqOpeningPrice(weekMonday);
        if (!weekMondayNasdaqOpen) {
            // Find first available weekday opening in the week
            for (let i = 0; i <= 4; i++) {
                const checkDate = weekMonday.clone().add(i, 'days');
                weekMondayNasdaqOpen = await getNasdaqOpeningPrice(checkDate);
                if (weekMondayNasdaqOpen) break;
            }
        }
        let weekNasdaqClose = null;
        
        if (currentDay >= 1 && currentDay <= 5) {
            weekNasdaqClose = await getNasdaqClosingPrice(now);
            if (!weekNasdaqClose) {
                weekNasdaqClose = await getLastAvailableWeekdayClosing(weekMonday, now, 'nasdaq_closing', 'nasdaq');
            }
        } else {
            weekNasdaqClose = await getLastAvailableWeekdayClosing(weekMonday, now, 'nasdaq_closing', 'nasdaq');
        }

        // Gold Weekly: Monday 08:00 → Current day 08:00 (or last available day)
        const weekMondayGold = await getGoldPrice(weekMonday);
        let weekGoldClose = await getGoldPrice(now);
        if (!weekGoldClose) {
            weekGoldClose = await getLastAvailableDay(weekMonday, now);
        }

        // 3. MONTHLY CALCULATIONS
        const monthFirst = now.clone().startOf('month'); // 1st of current month
        
        // Nifty Monthly: 1st opening → Current day closing (or last available weekday closing)
        const monthFirstNiftyOpen = await getNiftyOpeningPrice(monthFirst);
        let monthNiftyClose = null;
        
        if (currentDay >= 1 && currentDay <= 5) {
            monthNiftyClose = await getNiftyClosingPrice(now);
            if (!monthNiftyClose) {
                monthNiftyClose = await getLastAvailableWeekdayClosing(monthFirst, now, 'nifty_closing', 'nifty');
            }
        } else {
            monthNiftyClose = await getLastAvailableWeekdayClosing(monthFirst, now, 'nifty_closing', 'nifty');
        }

        // Nasdaq Monthly: 1st opening → Current day closing (or last available weekday closing)
        const monthFirstNasdaqOpen = await getNasdaqOpeningPrice(monthFirst);
        let monthNasdaqClose = null;
        
        if (currentDay >= 1 && currentDay <= 5) {
            monthNasdaqClose = await getNasdaqClosingPrice(now);
            if (!monthNasdaqClose) {
                monthNasdaqClose = await getLastAvailableWeekdayClosing(monthFirst, now, 'nasdaq_closing', 'nasdaq');
            }
        } else {
            monthNasdaqClose = await getLastAvailableWeekdayClosing(monthFirst, now, 'nasdaq_closing', 'nasdaq');
        }

        // Gold Monthly: 1st 08:00 → Current day 08:00 (or last available day)
        const monthFirstGold = await getGoldPrice(monthFirst);
        let monthGoldClose = await getGoldPrice(now);
        if (!monthGoldClose) {
            monthGoldClose = await getLastAvailableDay(monthFirst, now);
        }

        // 4. Calculate Daily Performance
        // For daily: Today's opening → Today's closing (or current price if market is still open)
        const today = now.clone();
        const isWeekend = today.day() === 0 || today.day() === 6; // Sunday = 0, Saturday = 6
        const currentHour = today.hour();
        const currentMinute = today.minute();
        
        // Check if Nifty market is currently open (9:20 AM - 3:40 PM IST on weekdays)
        const isNiftyMarketOpen = !isWeekend && 
            ((currentHour > 9 || (currentHour === 9 && currentMinute >= 20)) && 
             (currentHour < 15 || (currentHour === 15 && currentMinute <= 40)));
        
        // Nifty Daily: Today's opening → Today's closing (or current price if market is open)
        let dailyNiftyOpen = null;
        let dailyNiftyClose = null;
        let dailyNiftyCloseDate = null;
        
        if (!isWeekend) {
            // Try to get today's data first
            dailyNiftyOpen = await getNiftyOpeningPrice(today);
            dailyNiftyClose = await getNiftyClosingPrice(today);
            
            // If market is open and we have opening but no closing, use current price
            if (isNiftyMarketOpen && dailyNiftyOpen && !dailyNiftyClose && current.nifty) {
                // Use current price as closing price
                dailyNiftyClose = {
                    ...dailyNiftyOpen,
                    nifty: current.nifty,
                    captured_at: now.toISOString() // Use current time as closing time
                };
                dailyNiftyCloseDate = now.toISOString();
            } else if (dailyNiftyClose) {
                dailyNiftyCloseDate = dailyNiftyClose.captured_at;
            }
        }
        
        // If weekend or no data for today, use last available weekday
        if (isWeekend || !dailyNiftyOpen) {
            dailyNiftyOpen = await getLastAvailableWeekdayOpening(today.clone().subtract(7, 'days'), today, 'nifty_opening', 'nifty');
        }
        if ((isWeekend || !dailyNiftyClose) && !isNiftyMarketOpen) {
            dailyNiftyClose = await getLastAvailableWeekdayClosing(today.clone().subtract(7, 'days'), today, 'nifty_closing', 'nifty');
            if (dailyNiftyClose) {
                dailyNiftyCloseDate = dailyNiftyClose.captured_at;
            }
        }
        
        // Check if Nasdaq market is currently open (roughly 7:00 PM IST - 2:00 AM IST next day on weekdays)
        // Nasdaq trades 9:30 AM - 4:00 PM EST/EDT, which is ~7:00 PM - 1:30 AM IST (EST) or ~8:00 PM - 2:30 AM IST (EDT)
        const isNasdaqMarketOpen = !isWeekend && 
            (currentHour >= 19 || currentHour < 2 || (currentHour === 2 && currentMinute <= 30));
        
        // Nasdaq Daily: Get the current US trading day and show its opening → closing
        // NASDAQ trades in US Eastern Time, so we need to determine the current US trading day
        let dailyNasdaqOpen = null;
        let dailyNasdaqClose = null;
        let dailyNasdaqCloseDate = null;
        
        // Get the current US trading day based on IST time (even for weekends, we need this for fallback)
        const currentET = getETDateForIST(now);
        const currentETDate = currentET.clone().startOf('day');
        
        // Determine which US trading day we should show
        // If it's before 9:30 AM ET, show yesterday's completed trading day
        // If it's after 4:00 PM ET, show today's completed trading day
        // Otherwise, show today's trading day (in progress)
        let usTradingDay = currentETDate.clone();
        if (currentET.hour() < 9 || (currentET.hour() === 9 && currentET.minute() < 30)) {
            // Before market open, show previous completed trading day
            usTradingDay.subtract(1, 'day');
            // Skip weekends
            while (usTradingDay.day() === 0 || usTradingDay.day() === 6) {
                usTradingDay.subtract(1, 'day');
            }
        }
        // If after 4 PM ET, today's trading day is complete, so show today
        // Otherwise, we're in today's trading day (in progress)
        
        if (!isWeekend) {
            // Get opening and closing for this US trading day
            const { opening, closing } = await getNasdaqPricesForUSTradingDay(usTradingDay);
            dailyNasdaqOpen = opening;
            dailyNasdaqClose = closing;
            
            // If market is open and we have opening but no closing, use current price
            if (isNasdaqMarketOpen && dailyNasdaqOpen && !dailyNasdaqClose && current.nasdaq) {
                // Use current price as closing price
                dailyNasdaqClose = {
                    ...dailyNasdaqOpen,
                    nasdaq: current.nasdaq,
                    captured_at: now.toISOString() // Use current time as closing time
                };
                dailyNasdaqCloseDate = now.toISOString();
            } else if (dailyNasdaqClose) {
                dailyNasdaqCloseDate = dailyNasdaqClose.captured_at;
            }
        }
        
        // If weekend or no data found, search backwards for a US trading day with both opening and closing
        if (isWeekend || !dailyNasdaqOpen || !dailyNasdaqClose) {
            // Try to find the most recent US trading day that has both opening and closing
            let foundPair = false;
            for (let daysBack = 0; daysBack <= 7; daysBack++) {
                const checkETDate = usTradingDay.clone().subtract(daysBack, 'days');
                // Skip weekends
                if (checkETDate.day() === 0 || checkETDate.day() === 6) continue;
                
                const { opening, closing } = await getNasdaqPricesForUSTradingDay(checkETDate);
                if (opening && closing) {
                    dailyNasdaqOpen = opening;
                    dailyNasdaqClose = closing;
                    dailyNasdaqCloseDate = closing.captured_at;
                    foundPair = true;
                    break;
                }
            }
            
            // If still not found, fall back to individual searches (but this shouldn't happen)
            if (!foundPair) {
                if (!dailyNasdaqOpen) {
                    dailyNasdaqOpen = await getLastAvailableWeekdayOpening(today.clone().subtract(7, 'days'), today, 'nasdaq_opening', 'nasdaq');
                }
                if (!dailyNasdaqClose && !isNasdaqMarketOpen) {
                    dailyNasdaqClose = await getLastAvailableWeekdayClosing(today.clone().subtract(7, 'days'), today, 'nasdaq_closing', 'nasdaq');
                    if (dailyNasdaqClose) {
                        dailyNasdaqCloseDate = dailyNasdaqClose.captured_at;
                    }
                }
            }
        }
        
        // Gold Daily: Today's 08:00 capture (or last available)
        let dailyGold = await getGoldPrice(today);
        if (!dailyGold) {
            dailyGold = await getLastAvailableDay(today.clone().subtract(7, 'days'), today);
        }
        // For gold daily, opening and closing are the same (single daily capture)
        const dailyGoldOpen = dailyGold;
        const dailyGoldClose = dailyGold;

        // 5. Calculate Changes
        const calculateChange = (endVal, startVal) => {
            if (!endVal || !startVal) return { change: 0, percent: 0 };
            const diff = Number(endVal) - Number(startVal);
            const percent = (diff / Number(startVal)) * 100;
            return {
                change: diff,
                percent: percent
            };
        };

        return {
            current: {
                nifty: Number(current.nifty),
                nasdaq: Number(current.nasdaq),
                gold: Number(current.gold_24k_per_1g),
                date: current.captured_at
            },
            daily: {
                nifty: {
                    ...calculateChange(dailyNiftyClose?.nifty, dailyNiftyOpen?.nifty),
                    openingPrice: Number(dailyNiftyOpen?.nifty) || 0,
                    closingPrice: Number(dailyNiftyClose?.nifty) || 0,
                    startDate: dailyNiftyOpen?.captured_at,
                    endDate: dailyNiftyCloseDate || dailyNiftyClose?.captured_at
                },
                nasdaq: {
                    ...calculateChange(dailyNasdaqClose?.nasdaq, dailyNasdaqOpen?.nasdaq),
                    openingPrice: Number(dailyNasdaqOpen?.nasdaq) || 0,
                    closingPrice: Number(dailyNasdaqClose?.nasdaq) || 0,
                    startDate: dailyNasdaqOpen?.captured_at,
                    endDate: dailyNasdaqCloseDate || dailyNasdaqClose?.captured_at
                },
                gold: {
                    ...calculateChange(dailyGoldClose?.gold_24k_per_1g, dailyGoldOpen?.gold_24k_per_1g),
                    openingPrice: Number(dailyGoldOpen?.gold_24k_per_1g) || 0,
                    closingPrice: Number(dailyGoldClose?.gold_24k_per_1g) || 0,
                    startDate: dailyGoldOpen?.captured_at,
                    endDate: dailyGoldClose?.captured_at
                }
            },
            weekly: {
                nifty: {
                    ...calculateChange(weekNiftyClose?.nifty, weekMondayNiftyOpen?.nifty),
                    openingPrice: Number(weekMondayNiftyOpen?.nifty) || 0,
                    closingPrice: Number(weekNiftyClose?.nifty) || 0,
                    startDate: weekMondayNiftyOpen?.captured_at,
                    endDate: weekNiftyClose?.captured_at
                },
                nasdaq: {
                    ...calculateChange(weekNasdaqClose?.nasdaq, weekMondayNasdaqOpen?.nasdaq),
                    openingPrice: Number(weekMondayNasdaqOpen?.nasdaq) || 0,
                    closingPrice: Number(weekNasdaqClose?.nasdaq) || 0,
                    startDate: weekMondayNasdaqOpen?.captured_at,
                    endDate: weekNasdaqClose?.captured_at
                },
                gold: {
                    ...calculateChange(weekGoldClose?.gold_24k_per_1g, weekMondayGold?.gold_24k_per_1g),
                    openingPrice: Number(weekMondayGold?.gold_24k_per_1g) || 0,
                    closingPrice: Number(weekGoldClose?.gold_24k_per_1g) || 0,
                    startDate: weekMondayGold?.captured_at,
                    endDate: weekGoldClose?.captured_at
                }
            },
            monthly: {
                nifty: {
                    ...calculateChange(monthNiftyClose?.nifty, monthFirstNiftyOpen?.nifty),
                    openingPrice: Number(monthFirstNiftyOpen?.nifty) || 0,
                    closingPrice: Number(monthNiftyClose?.nifty) || 0,
                    startDate: monthFirstNiftyOpen?.captured_at,
                    endDate: monthNiftyClose?.captured_at
                },
                nasdaq: {
                    ...calculateChange(monthNasdaqClose?.nasdaq, monthFirstNasdaqOpen?.nasdaq),
                    openingPrice: Number(monthFirstNasdaqOpen?.nasdaq) || 0,
                    closingPrice: Number(monthNasdaqClose?.nasdaq) || 0,
                    startDate: monthFirstNasdaqOpen?.captured_at,
                    endDate: monthNasdaqClose?.captured_at
                },
                gold: {
                    ...calculateChange(monthGoldClose?.gold_24k_per_1g, monthFirstGold?.gold_24k_per_1g),
                    openingPrice: Number(monthFirstGold?.gold_24k_per_1g) || 0,
                    closingPrice: Number(monthGoldClose?.gold_24k_per_1g) || 0,
                    startDate: monthFirstGold?.captured_at,
                    endDate: monthGoldClose?.captured_at
                }
            }
        };

    } catch (error) {
        console.error("Error in getPriceAnalysis:", error);
        throw error;
    }
};

module.exports = { getPriceAnalysis };

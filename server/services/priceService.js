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
                WHERE DATE(timezone('Asia/Kolkata', captured_at)) = $1 
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
                WHERE DATE(timezone('Asia/Kolkata', captured_at)) = $1 
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
                    WHERE DATE(timezone('Asia/Kolkata', captured_at)) = $1 
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
                    WHERE DATE(timezone('Asia/Kolkata', captured_at)) = $1 
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
            // Fix timezone conversion: UTC to IST
            // Use timezone() function for proper conversion
            const query = `
                SELECT * FROM price_captures 
                WHERE DATE(timezone('Asia/Kolkata', captured_at)) = $1 
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
            // Fix timezone conversion: UTC to IST
            // Use timezone() function for proper conversion
            const query = `
                SELECT * FROM price_captures 
                WHERE DATE(timezone('Asia/Kolkata', captured_at)) = $1 
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
                WHERE DATE(timezone('Asia/Kolkata', captured_at)) = $1 
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
                    WHERE DATE(timezone('Asia/Kolkata', captured_at)) = $1 
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

        // Nasdaq Weekly: Monday US trading day opening → Current US trading day closing
        // Find the Monday of the current week in US time (not IST)
        const weekET = getETDateForIST(now);
        const weekETDate = weekET.clone().startOf('day');
        // Get Monday of current week in US time
        let weekMondayUSTradingDay = weekETDate.clone().startOf('isoWeek');
        // If it's a weekend, go back to previous Monday
        while (weekMondayUSTradingDay.day() === 0 || weekMondayUSTradingDay.day() === 6) {
            weekMondayUSTradingDay.subtract(1, 'day');
        }
        if (weekMondayUSTradingDay.day() !== 1) {
            // Not Monday, find the most recent Monday
            weekMondayUSTradingDay.day(1);
            if (weekMondayUSTradingDay.isAfter(weekETDate)) {
                weekMondayUSTradingDay.subtract(7, 'days');
            }
        }
        
        // Get Monday US trading day opening
        const { opening: weekMondayOpen } = await getNasdaqPricesForUSTradingDay(weekMondayUSTradingDay);
        let weekMondayNasdaqOpen = weekMondayOpen;
        
        // Fallback: if Monday opening not found, find first available weekday opening in the week
        if (!weekMondayNasdaqOpen) {
            for (let i = 0; i <= 4; i++) {
                const checkETDate = weekMondayUSTradingDay.clone().add(i, 'days');
                if (checkETDate.day() === 0 || checkETDate.day() === 6) continue;
                const { opening } = await getNasdaqPricesForUSTradingDay(checkETDate);
                if (opening) {
                    weekMondayNasdaqOpen = opening;
                    break;
            }
        }
        }
        
        // Get current/latest US trading day closing
        const currentETForWeek = getETDateForIST(now);
        const currentETDateForWeek = currentETForWeek.clone().startOf('day');
        let currentUSTradingDayForWeek = currentETDateForWeek.clone();
        if (currentETForWeek.hour() < 9 || (currentETForWeek.hour() === 9 && currentETForWeek.minute() < 30)) {
            currentUSTradingDayForWeek.subtract(1, 'day');
            while (currentUSTradingDayForWeek.day() === 0 || currentUSTradingDayForWeek.day() === 6) {
                currentUSTradingDayForWeek.subtract(1, 'day');
            }
        }
        
        const { closing: currentWeekClose } = await getNasdaqPricesForUSTradingDay(currentUSTradingDayForWeek);
        let weekNasdaqClose = currentWeekClose;
        
        // Fallback: if no closing found, search backwards
            if (!weekNasdaqClose) {
            for (let daysBack = 0; daysBack <= 7; daysBack++) {
                const checkETDate = currentUSTradingDayForWeek.clone().subtract(daysBack, 'days');
                if (checkETDate.day() === 0 || checkETDate.day() === 6) continue;
                if (checkETDate.isBefore(weekMondayUSTradingDay, 'day')) break;
                
                const { closing } = await getNasdaqPricesForUSTradingDay(checkETDate);
                if (closing) {
                    weekNasdaqClose = closing;
                    break;
                }
            }
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

        // Nasdaq Monthly: 1st of month US trading day opening → Current US trading day closing
        // Convert IST month first to US trading day
        const monthFirstET = getETDateForIST(monthFirst);
        const monthFirstETDate = monthFirstET.clone().startOf('day');
        // Find the 1st of month US trading day (skip weekends)
        let monthFirstUSTradingDay = monthFirstETDate.clone();
        while (monthFirstUSTradingDay.day() === 0 || monthFirstUSTradingDay.day() === 6) {
            monthFirstUSTradingDay.add(1, 'day');
        }
        
        // Get 1st of month US trading day opening
        const { opening: monthFirstOpen } = await getNasdaqPricesForUSTradingDay(monthFirstUSTradingDay);
        let monthFirstNasdaqOpen = monthFirstOpen;
        
        // If 1st is weekend, try to find first available weekday opening in the month
        if (!monthFirstNasdaqOpen) {
            for (let i = 0; i <= 4; i++) {
                const checkETDate = monthFirstUSTradingDay.clone().add(i, 'days');
                if (checkETDate.day() === 0 || checkETDate.day() === 6) continue;
                const { opening } = await getNasdaqPricesForUSTradingDay(checkETDate);
                if (opening) {
                    monthFirstNasdaqOpen = opening;
                    break;
                }
            }
        }
        
        // Get current/latest US trading day closing
        const currentETForMonth = getETDateForIST(now);
        const currentETDateForMonth = currentETForMonth.clone().startOf('day');
        let currentUSTradingDayForMonth = currentETDateForMonth.clone();
        if (currentETForMonth.hour() < 9 || (currentETForMonth.hour() === 9 && currentETForMonth.minute() < 30)) {
            currentUSTradingDayForMonth.subtract(1, 'day');
            while (currentUSTradingDayForMonth.day() === 0 || currentUSTradingDayForMonth.day() === 6) {
                currentUSTradingDayForMonth.subtract(1, 'day');
            }
        }
        
        const { closing: currentMonthClose } = await getNasdaqPricesForUSTradingDay(currentUSTradingDayForMonth);
        let monthNasdaqClose = currentMonthClose;
        
        // Fallback: if no closing found, search backwards
            if (!monthNasdaqClose) {
            for (let daysBack = 0; daysBack <= 31; daysBack++) {
                const checkETDate = currentUSTradingDayForMonth.clone().subtract(daysBack, 'days');
                if (checkETDate.day() === 0 || checkETDate.day() === 6) continue;
                if (checkETDate.isBefore(monthFirstUSTradingDay, 'day')) break;
                
                const { closing } = await getNasdaqPricesForUSTradingDay(checkETDate);
                if (closing) {
                    monthNasdaqClose = closing;
                    break;
                }
            }
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
        
        // Nasdaq Daily: Prioritize today's opening (IST date), use live price if market is open
        // NASDAQ opening for a US trading day is captured on the same IST date (evening IST)
        // So if we have an opening on Jan 9th IST, that's for US trading day Jan 9th ET
        let dailyNasdaqOpen = null;
        let dailyNasdaqClose = null;
        let dailyNasdaqCloseDate = null;
        
        // FIRST: Check if today's IST date has a nasdaq_opening
        // This is the simplest and most direct check
        const todayIST = now.clone().tz('Asia/Kolkata').startOf('day');
        const todayOpening = await getNasdaqOpeningPrice(todayIST);
        
        if (todayOpening) {
            // We have today's opening
            dailyNasdaqOpen = todayOpening;
            
            // Check for today's closing (captured on next day's early morning IST)
            const tomorrowIST = todayIST.clone().add(1, 'day');
            const todayClosing = await getNasdaqClosingPrice(tomorrowIST);
            
            if (isNasdaqMarketOpen && current.nasdaq) {
                // Market is open, use current price as closing
                dailyNasdaqClose = {
                    ...todayOpening,
                    nasdaq: current.nasdaq,
                    captured_at: now.toISOString()
                };
                dailyNasdaqCloseDate = now.toISOString();
            } else if (todayClosing) {
                // Market is closed, use today's closing
                dailyNasdaqClose = todayClosing;
                dailyNasdaqCloseDate = todayClosing.captured_at;
            } else {
                // Market is closed but no closing captured yet, use current price as fallback
                if (current.nasdaq) {
                    dailyNasdaqClose = {
                        ...todayOpening,
                        nasdaq: current.nasdaq,
                        captured_at: now.toISOString()
                    };
                    dailyNasdaqCloseDate = now.toISOString();
                }
            }
        } else {
            // Today's opening doesn't exist, fall back to most recent complete pair
            // Search backwards from yesterday's IST date to find the most recent opening+closing pair
            let foundPair = false;
            let bestPair = null;
            let bestISTDate = null;
            
            // Start from yesterday and go back up to 7 days
            for (let daysBack = 1; daysBack <= 7; daysBack++) {
                const checkISTDate = todayIST.clone().subtract(daysBack, 'days');
                // Skip weekends
                if (checkISTDate.day() === 0 || checkISTDate.day() === 6) continue;
                
                // Check for opening on this IST date and closing on next day
                const opening = await getNasdaqOpeningPrice(checkISTDate);
                if (opening) {
                    const nextDayIST = checkISTDate.clone().add(1, 'day');
                    const closing = await getNasdaqClosingPrice(nextDayIST);
                    
                    if (closing) {
                        // Found a complete pair - keep track of the most recent one
                        if (!bestPair || checkISTDate.isAfter(bestISTDate, 'day')) {
                            bestPair = { opening, closing };
                            bestISTDate = checkISTDate.clone();
                        }
                    }
                }
            }
            
            // Use the most recent complete pair found
            if (bestPair) {
                dailyNasdaqOpen = bestPair.opening;
                dailyNasdaqClose = bestPair.closing;
                dailyNasdaqCloseDate = bestPair.closing.captured_at;
                foundPair = true;
            }
            
            // If no complete pair found, try alternative fallback
            if (!foundPair && !dailyNasdaqOpen) {
                // Find most recent opening and try to match with its corresponding closing
                const recentOpen = await getLastAvailableWeekdayOpening(today.clone().subtract(7, 'days'), today, 'nasdaq_opening', 'nasdaq');
                if (recentOpen) {
                    // Try to find the closing for the same US trading day as this opening
                    // Opening is captured on US trading day's evening IST
                    // Closing is captured on next day's early morning IST
                    const openingISTDate = moment(recentOpen.captured_at).tz('Asia/Kolkata');
                    const openingISTDateOnly = openingISTDate.clone().startOf('day');
                    const closingISTDate = openingISTDateOnly.clone().add(1, 'day');
                    const correspondingClose = await getNasdaqClosingPrice(closingISTDate);
                    
                    if (correspondingClose) {
                        dailyNasdaqOpen = recentOpen;
                        dailyNasdaqClose = correspondingClose;
                        dailyNasdaqCloseDate = correspondingClose.captured_at;
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

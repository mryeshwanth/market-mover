const { pool } = require('../db/database');
const moment = require('moment');

const getPriceAnalysis = async () => {
    try {
        // 1. Get Latest/Current Price for EACH asset independently
        const currentQuery = `
            SELECT 
                (SELECT nifty FROM price_captures WHERE nifty IS NOT NULL ORDER BY captured_at DESC LIMIT 1) as nifty,
                (SELECT nasdaq FROM price_captures WHERE nasdaq IS NOT NULL ORDER BY captured_at DESC LIMIT 1) as nasdaq,
                (SELECT gold_24k_per_10g FROM price_captures WHERE gold_24k_per_10g IS NOT NULL ORDER BY captured_at DESC LIMIT 1) as gold_24k_per_10g,
                (SELECT captured_at FROM price_captures ORDER BY captured_at DESC LIMIT 1) as captured_at
        `;
        const currentRes = await pool.query(currentQuery);
        const current = currentRes.rows[0] || { nifty: 0, nasdaq: 0, gold_24k_per_10g: 0 };
        const currentDate = moment(current.captured_at);

        // Helper: Get Monday of current week
        const getCurrentWeekMonday = () => {
            return currentDate.clone().startOf('isoWeek'); // Monday
        };

        // Helper: Get Friday of current week
        const getCurrentWeekFriday = () => {
            return currentDate.clone().startOf('isoWeek').add(4, 'days'); // Friday
        };

        // Helper: Get 1st of current month
        const getCurrentMonthStart = () => {
            return currentDate.clone().startOf('month');
        };

        // Helper: Get last day of current month
        const getCurrentMonthEnd = () => {
            return currentDate.clone().endOf('month');
        };

        // Get opening price (morning capture) for a specific date
        const getOpeningPrice = async (date) => {
            const query = `
                SELECT * FROM price_captures 
                WHERE captured_at::date = $1 
                AND capture_time = 'opening_price'
                ORDER BY captured_at ASC 
                LIMIT 1
            `;
            const res = await pool.query(query, [date.format('YYYY-MM-DD')]);
            return res.rows[0] || null;
        };

        // Get closing price (evening capture) for a specific date
        const getClosingPrice = async (date) => {
            const query = `
                SELECT * FROM price_captures 
                WHERE captured_at::date = $1 
                AND capture_time = 'closing_price'
                ORDER BY captured_at DESC 
                LIMIT 1
            `;
            const res = await pool.query(query, [date.format('YYYY-MM-DD')]);
            return res.rows[0] || null;
        };

        // Get latest closing price within a date range
        const getLatestClosingPrice = async (startDate, endDate) => {
            const query = `
                SELECT * FROM price_captures 
                WHERE captured_at::date >= $1 
                AND captured_at::date <= $2
                AND capture_time = 'closing_price'
                ORDER BY captured_at DESC 
                LIMIT 1
            `;
            const res = await pool.query(query, [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]);
            return res.rows[0] || null;
        };

        // Get Gold price at 8 AM for a specific date
        const getGoldPrice = async (date) => {
            const query = `
                SELECT * FROM price_captures 
                WHERE captured_at::date = $1 
                AND capture_time = 'gold_daily'
                ORDER BY captured_at ASC 
                LIMIT 1
            `;
            const res = await pool.query(query, [date.format('YYYY-MM-DD')]);
            return res.rows[0] || null;
        };

        // Get latest Gold price within a date range
        const getLatestGoldPrice = async (startDate, endDate) => {
            const query = `
                SELECT * FROM price_captures 
                WHERE captured_at::date >= $1 
                AND captured_at::date <= $2
                AND capture_time = 'gold_daily'
                ORDER BY captured_at DESC 
                LIMIT 1
            `;
            const res = await pool.query(query, [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]);
            return res.rows[0] || null;
        };

        // 2. Get period data
        // Weekly: Monday opening to latest closing this week
        const weekMondayOpen = await getOpeningPrice(getCurrentWeekMonday());
        const weekLatestClose = await getLatestClosingPrice(getCurrentWeekMonday(), currentDate);

        // For Gold: Monday 8AM to latest this week
        const weekMondayGold = await getGoldPrice(getCurrentWeekMonday());
        const weekLatestGold = await getLatestGoldPrice(getCurrentWeekMonday(), currentDate);

        // Monthly: 1st opening to latest closing this month
        const monthStartOpen = await getOpeningPrice(getCurrentMonthStart());
        const monthLatestClose = await getLatestClosingPrice(getCurrentMonthStart(), currentDate);

        // For Gold: 1st 8AM to latest this month
        const monthStartGold = await getGoldPrice(getCurrentMonthStart());
        const monthLatestGold = await getLatestGoldPrice(getCurrentMonthStart(), currentDate);

        // 3. Calculate Changes
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
                gold: Number(current.gold_24k_per_10g),
                date: current.captured_at
            },
            weekly: {
                nifty: {
                    ...calculateChange(weekLatestClose?.nifty, weekMondayOpen?.nifty),
                    openingPrice: Number(weekMondayOpen?.nifty) || 0,
                    closingPrice: Number(weekLatestClose?.nifty) || 0,
                    startDate: weekMondayOpen?.captured_at,
                    endDate: weekLatestClose?.captured_at
                },
                nasdaq: {
                    ...calculateChange(weekLatestClose?.nasdaq, weekMondayOpen?.nasdaq),
                    openingPrice: Number(weekMondayOpen?.nasdaq) || 0,
                    closingPrice: Number(weekLatestClose?.nasdaq) || 0,
                    startDate: weekMondayOpen?.captured_at,
                    endDate: weekLatestClose?.captured_at
                },
                gold: {
                    ...calculateChange(weekLatestGold?.gold_24k_per_10g, weekMondayGold?.gold_24k_per_10g),
                    openingPrice: Number(weekMondayGold?.gold_24k_per_10g) || 0,
                    closingPrice: Number(weekLatestGold?.gold_24k_per_10g) || 0,
                    startDate: weekMondayGold?.captured_at,
                    endDate: weekLatestGold?.captured_at
                }
            },
            monthly: {
                nifty: {
                    ...calculateChange(monthLatestClose?.nifty, monthStartOpen?.nifty),
                    openingPrice: Number(monthStartOpen?.nifty) || 0,
                    closingPrice: Number(monthLatestClose?.nifty) || 0,
                    startDate: monthStartOpen?.captured_at,
                    endDate: monthLatestClose?.captured_at
                },
                nasdaq: {
                    ...calculateChange(monthLatestClose?.nasdaq, monthStartOpen?.nasdaq),
                    openingPrice: Number(monthStartOpen?.nasdaq) || 0,
                    closingPrice: Number(monthLatestClose?.nasdaq) || 0,
                    startDate: monthStartOpen?.captured_at,
                    endDate: monthLatestClose?.captured_at
                },
                gold: {
                    ...calculateChange(monthLatestGold?.gold_24k_per_10g, monthStartGold?.gold_24k_per_10g),
                    openingPrice: Number(monthStartGold?.gold_24k_per_10g) || 0,
                    closingPrice: Number(monthLatestGold?.gold_24k_per_10g) || 0,
                    startDate: monthStartGold?.captured_at,
                    endDate: monthLatestGold?.captured_at
                }
            }
        };

    } catch (error) {
        console.error("Error in getPriceAnalysis:", error);
        throw error;
    }
};

module.exports = { getPriceAnalysis };

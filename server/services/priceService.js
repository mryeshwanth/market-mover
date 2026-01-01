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

        // Helper to get the start of current week (Monday)
        const getCurrentWeekStart = () => {
            return currentDate.clone().startOf('isoWeek'); // ISO week starts on Monday
        };

        // Helper to get the start of previous week (Monday)
        const getPreviousWeekStart = () => {
            return currentDate.clone().subtract(1, 'week').startOf('isoWeek');
        };

        // Helper to get the start of current month
        const getCurrentMonthStart = () => {
            return currentDate.clone().startOf('month');
        };

        // Helper to get the start of previous month
        const getPreviousMonthStart = () => {
            return currentDate.clone().subtract(1, 'month').startOf('month');
        };

        // Get data from specific date range
        const getDataFromDate = async (startDate) => {
            const query = `
                SELECT * FROM price_captures 
                WHERE captured_at >= $1 
                ORDER BY captured_at ASC 
                LIMIT 1
            `;
            const res = await pool.query(query, [startDate.format('YYYY-MM-DD')]);
            return res.rows[0] || null;
        };

        // 2. Get comparison data
        const weekStartData = await getDataFromDate(getCurrentWeekStart());
        const prevWeekStartData = await getDataFromDate(getPreviousWeekStart());
        const monthStartData = await getDataFromDate(getCurrentMonthStart());
        const prevMonthStartData = await getDataFromDate(getPreviousMonthStart());

        // 3. Calculate Changes
        const calculateChange = (currentVal, startVal) => {
            if (!currentVal || !startVal) return { change: 0, percent: 0 };
            const diff = Number(currentVal) - Number(startVal);
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
                nifty: calculateChange(current.nifty, weekStartData?.nifty || prevWeekStartData?.nifty),
                nasdaq: calculateChange(current.nasdaq, weekStartData?.nasdaq || prevWeekStartData?.nasdaq),
                gold: calculateChange(current.gold_24k_per_10g, weekStartData?.gold_24k_per_10g || prevWeekStartData?.gold_24k_per_10g),
                startDate: (weekStartData?.captured_at || prevWeekStartData?.captured_at),
                endDate: current.captured_at,
                weekStart: getCurrentWeekStart().format('YYYY-MM-DD'),
                prevWeekStart: getPreviousWeekStart().format('YYYY-MM-DD')
            },
            monthly: {
                nifty: calculateChange(current.nifty, monthStartData?.nifty || prevMonthStartData?.nifty),
                nasdaq: calculateChange(current.nasdaq, monthStartData?.nasdaq || prevMonthStartData?.nasdaq),
                gold: calculateChange(current.gold_24k_per_10g, monthStartData?.gold_24k_per_10g || prevMonthStartData?.gold_24k_per_10g),
                startDate: (monthStartData?.captured_at || prevMonthStartData?.captured_at),
                endDate: current.captured_at,
                monthStart: getCurrentMonthStart().format('YYYY-MM-DD'),
                prevMonthStart: getPreviousMonthStart().format('YYYY-MM-DD')
            }
        };

    } catch (error) {
        console.error("Error in getPriceAnalysis:", error);
        throw error;
    }
};

module.exports = { getPriceAnalysis };

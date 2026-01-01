const { pool } = require('../db/database');
const moment = require('moment');

const getPriceAnalysis = async () => {
    try {
        // 1. Get Latest/Current Price
        // 1. Get Latest/Current Price for EACH asset independently
        // This ensures if Gold was captured in the morning but Nifty in the evening, we see both.
        const currentQuery = `
            SELECT 
                (SELECT nifty FROM price_captures WHERE nifty IS NOT NULL ORDER BY captured_at DESC LIMIT 1) as nifty,
                (SELECT nasdaq FROM price_captures WHERE nasdaq IS NOT NULL ORDER BY captured_at DESC LIMIT 1) as nasdaq,
                (SELECT gold_24k_per_10g FROM price_captures WHERE gold_24k_per_10g IS NOT NULL ORDER BY captured_at DESC LIMIT 1) as gold_24k_per_10g,
                (SELECT captured_at FROM price_captures ORDER BY captured_at DESC LIMIT 1) as captured_at
        `;
        const currentRes = await pool.query(currentQuery);
        const current = currentRes.rows[0] || { nifty: 0, nasdaq: 0, gold_24k_per_10g: 0 };

        // Helper to get past price
        const getPastPrice = async (daysAgo) => {
            const dateStr = moment().subtract(daysAgo, 'days').format('YYYY-MM-DD');
            const query = `
                SELECT * FROM price_captures 
                WHERE captured_at::date <= $1 
                ORDER BY captured_at DESC 
                LIMIT 1
            `;
            const res = await pool.query(query, [dateStr]);
            return res.rows[0] || null;
        };

        // 2. Get Past Data
        const weekData = await getPastPrice(7);
        const monthData = await getPastPrice(30);

        // 3. Calculate Changes
        const calculateChange = (currentVal, pastVal) => {
            if (!currentVal || !pastVal) return { change: 0, percent: 0 };
            const diff = Number(currentVal) - Number(pastVal);
            const percent = (diff / Number(pastVal)) * 100;
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
                nifty: calculateChange(current.nifty, weekData?.nifty),
                nasdaq: calculateChange(current.nasdaq, weekData?.nasdaq),
                gold: calculateChange(current.gold_24k_per_10g, weekData?.gold_24k_per_10g)
            },
            monthly: {
                nifty: calculateChange(current.nifty, monthData?.nifty),
                nasdaq: calculateChange(current.nasdaq, monthData?.nasdaq),
                gold: calculateChange(current.gold_24k_per_10g, monthData?.gold_24k_per_10g)
            }
        };

    } catch (error) {
        console.error("Error in getPriceAnalysis:", error);
        throw error;
    }
};

module.exports = { getPriceAnalysis };

const axios = require('axios');
const https = require('https');

const SYMBOLS = {
    NIFTY: '^NSEI',
    NASDAQ: '^NDX'
};

const BASE_URL = process.env.YAHOO_FINANCE_API_URL || 'https://query1.finance.yahoo.com/v8/finance/chart';

// Configure HTTPS agent to handle SSL certificates
// In production, this should work fine, but for local testing we may need to reject unauthorized
const httpsAgent = new https.Agent({
    rejectUnauthorized: process.env.NODE_ENV === 'production' ? true : false
});

async function fetchPrice(symbol) {
    try {
        const response = await axios.get(`${BASE_URL}/${symbol}`, {
            params: {
                interval: '1d',
                range: '1d'
            },
            httpsAgent: httpsAgent
        });

        const result = response.data.chart.result[0];
        const meta = result.meta;
        const price = meta.regularMarketPrice;

        return {
            symbol: symbol,
            price: price,
            currency: meta.currency,
            timestamp: new Date()
        };
    } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error.message);
        throw error;
    }
}

async function getMarketPrices() {
    try {
        const [nifty, nasdaq] = await Promise.all([
            fetchPrice(SYMBOLS.NIFTY),
            fetchPrice(SYMBOLS.NASDAQ)
        ]);

        return {
            nifty: nifty.price,
            nasdaq: nasdaq.price,
            timestamp: new Date()
        };
    } catch (error) {
        console.error('Error fetching market prices:', error);
        throw error;
    }
}

module.exports = {
    getMarketPrices,
    fetchPrice,
    SYMBOLS
};

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const path = require('path');

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from React app
app.use(express.static(path.join(__dirname, '../client/dist')));

// Basic health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

const { initCronJobs } = require('./services/cronJobs');
const captureService = require('./services/captureService');
const { initDatabase } = require('./db/init');

// Start server
const startServer = async () => {
    try {
        // Initialize Database
        await initDatabase();

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Timezone: ${process.env.TZ || 'UTC'}`);

            // Initialize Cron Jobs
            initCronJobs();
        });
    } catch (e) {
        console.error("Failed to start server:", e);
        process.exit(1);
    }
};

startServer();

// The "catchall" handler
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Live Price Endpoint
app.get('/api/prices/current', async (req, res) => {
    try {
        const stockPrices = await require('./services/yahooFinance').getMarketPrices();
        const goldData = await require('./services/goldScraper').scrapeGoldPrice();

        // Combine data
        res.json({
            nifty: stockPrices.nifty,
            nasdaq: stockPrices.nasdaq,
            gold: goldData.price,
            timestamp: new Date()
        });
    } catch (e) {
        console.error("Error fetching live prices:", e);
        res.status(500).json({ error: "Failed to fetch live prices" });
    }
});

// Test Endpoint: Manual Capture (Removed as per user request, but keeping the route logic commented out or internal if needed? 
// User said "remove manual capture code from the project". I will remove the endpoint to be safe/clean).
/*
app.post('/api/test/capture', async (req, res) => {
    try {
        const result = await captureService.captureAll(req.body.type || 'manual_test');
        res.json({ success: true, data: result });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
*/

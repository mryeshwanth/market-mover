const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const path = require('path');

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from React app
app.use(express.static(path.join(__dirname, '../client/dist')));

const { initCronJobs } = require('./services/cronJobs');
const { initDatabase } = require('./db/init');

// API Routes - MUST be defined BEFORE the catch-all handler
// Basic health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Live Price Endpoint
app.get('/api/prices/current', async (req, res) => {
    try {
        const analysis = await require('./services/priceService').getPriceAnalysis();
        res.json(analysis);
    } catch (e) {
        console.error("Error fetching live prices:", e);
        res.status(500).json({ error: "Failed to fetch live prices" });
    }
});

// The "catchall" handler - MUST be last
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

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

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const path = require('path');
const fs = require('fs');

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from React app (only if dist directory exists)
const distPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    console.log('Serving static files from:', distPath);
} else {
    console.warn('Client dist directory not found. Static files will not be served.');
    console.warn('Run "npm run build" to build the client application.');
}

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

// The "catchall" handler - MUST be last (only if dist exists)
const indexHtmlPath = path.join(__dirname, '../client/dist/index.html');
if (fs.existsSync(indexHtmlPath)) {
    app.get('*', (req, res) => {
        res.sendFile(indexHtmlPath);
    });
} else {
    // If no client build, just return API info for non-API routes
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api')) {
            res.status(404).json({ error: 'API endpoint not found' });
        } else {
            res.status(503).json({ 
                error: 'Client application not built', 
                message: 'Please run "npm run build" to build the client application',
                api: '/api/health - Health check',
                prices: '/api/prices/current - Get current prices'
            });
        }
    });
}

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

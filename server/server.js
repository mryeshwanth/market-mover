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

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Timezone: ${process.env.TZ || 'UTC'}`);

    // Initialize Cron Jobs
    initCronJobs();
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Test Endpoint: Manual Capture
app.post('/api/test/capture', async (req, res) => {
    try {
        const result = await captureService.captureAll(req.body.type || 'manual_test');
        res.json({ success: true, data: result });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

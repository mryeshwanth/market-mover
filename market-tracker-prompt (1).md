# Market Price Tracker Web Application

## PROJECT OBJECTIVE

Build a full-stack web application that tracks Nifty 50, Nasdaq 100, and Gold 24K India prices. The app captures prices daily at specific times and intelligently determines week/month start and end points by detecting actual data changes (eliminating the need for holiday calendars). Calculate and display gain/loss percentages. Deploy on Railway.

---

## TECH STACK

- **Backend**: Node.js with Express
- **Frontend**: React with Vite
- **Database**: PostgreSQL (Railway provides this)
- **Scheduling**: node-cron for automated price capture
- **API**: Yahoo Finance for market data
- **Web Scraping**: Cheerio for GoodReturns.in gold rates
- **Timezone Handling**: moment-timezone or date-fns-tz

---

## REVOLUTIONARY APPROACH: DATA-DRIVEN CAPTURE (NO HOLIDAY CALENDARS!)

### Core Philosophy
Instead of maintaining complex holiday calendars and fallback logic, we capture data daily at fixed times and **let the data itself tell us when markets are open or closed**. If data changes, market was open. If data stays the same, market was closed.

### Benefits
✅ **Zero maintenance** - No need to update holiday lists
✅ **Future-proof** - Works forever without code changes
✅ **Self-correcting** - Automatically handles unexpected holidays, strikes, special closures
✅ **Universal** - Same logic works for all markets
✅ **Simpler code** - Just compare: "Did data change?"

---

## MARKET TIMING & CAPTURE STRATEGY

### Indian Stock Market (Nifty)
- **Capture Times**: 
  - **9:20 AM IST** (5 minutes after market opens)
  - **3:35 PM IST** (5 minutes after market closes)
- **Frequency**: Every day (including weekends/holidays)
- **Currency**: INR

### Nasdaq 100 (US Market)
- **Capture Times**:
  - **8:05 PM IST** (5 minutes after US market opens = 9:35 AM EST)
  - **2:35 AM IST** (5 minutes after US market closes = 4:05 PM EST)
- **Frequency**: Every day (including weekends/holidays)
- **Currency**: USD
- **Note**: Times adjust for EST/EDT automatically since we're capturing daily

### Gold 24K India
- **Capture Time**: **12:00 PM IST** daily
- **Source**: GoodReturns.in (web scraping)
- **Frequency**: Every day (7 days/week)
- **Currency**: INR
- **Data Point**: 24K gold price per 10 grams
- **Note**: Gold prices update daily including weekends based on international markets

---

## DATA CAPTURE LOGIC

### Daily Captures (Store Everything)

Capture prices at specified times every single day and store in database with:
- Price values (nifty, nasdaq, gold)
- Timestamp
- Capture type ('morning' or 'evening' or 'gold_daily')
- **data_changed flag** (Boolean - did price change from previous capture?)

### Data Change Detection

```javascript
function hasDataChanged(currentPrice, previousPrice) {
  if (!previousPrice) return true; // First capture
  
  // Consider changed if difference is more than 0.01
  return Math.abs(currentPrice - previousPrice) > 0.01;
}
```

### Week Start Logic (Smart Detection)

**For Nifty:**
1. Every Monday at 9:20 AM, capture data
2. Compare with previous capture (Friday 3:35 PM or earlier)
3. If data changed → Monday is working day, tag as `week_start`
4. If data hasn't changed → Monday is holiday/weekend
5. Check Tuesday 9:20 AM capture, repeat until data changes
6. First day where data actually changed = `week_start`

**For Nasdaq:**
1. Every Monday at 8:05 PM IST, capture data
2. Compare with previous capture (Saturday 2:35 AM IST or earlier)
3. Same logic: First day where data changed = `week_start`

**For Gold:**
1. Every Monday at 12:00 PM, capture data
2. Tag as `week_start` (gold updates daily, data should always change)

### Week End Logic (Smart Detection)

**For Nifty:**
1. Every Friday at 3:35 PM, capture data
2. Compare with Thursday 3:35 PM capture
3. If data changed → Friday was working day, tag as `week_end`
4. If data hasn't changed → Friday was holiday
5. Go backwards: Check Thursday, Wednesday... until you find last day data changed
6. Last day where data actually changed = `week_end`

**For Nasdaq:**
1. Every Friday at 2:35 AM IST Saturday, capture data
2. Same backward logic to find actual last trading day

**For Gold:**
1. Every Sunday at 12:00 PM, capture and tag as `week_end`

### Month Start Logic (Smart Detection)

**For /Nifty/Nasdaq:**
1. On 1st of month at 9:20 AM (or 8:05 PM for Nasdaq), capture data
2. Compare with last capture of previous month (stored in database)
3. If data changed → 1st is working day, tag as `month_start`
4. If data hasn't changed → 1st is holiday/weekend
5. Check 2nd, 3rd, 4th... at 9:20 AM until data changes
6. First day where data changed = `month_start`

**For Gold:**
1. On 1st of month at 12:00 PM, capture and tag as `month_start`

### Month End Logic (Smart Detection)

**For /Nifty/Nasdaq:**
1. Starting from 27th, capture data daily at 3:35 PM (or 2:35 AM for Nasdaq)
2. Continue through 28th, 29th, 30th, 31st (if they exist)
3. After month transitions to next month (e.g., on 2nd of new month):
   - Look back at all captures from 27th-31st
   - Go backwards from 31st → 30th → 29th → 28th → 27th
   - Find the LAST day where data actually changed
4. That day becomes `month_end`
5. Example: If 30th & 31st were holidays, 29th becomes `month_end`

**For Gold:**
1. On last day of month at 12:00 PM, capture and tag as `month_end`

---

## CALCULATIONS & COMPARISONS

### Weekly Gain/Loss

**Nifty (INR)**:
- Compare: `week_start` (Monday 9:20 AM) vs `week_end` (Friday 3:35 PM)
- If Monday was holiday: Use actual first working day 9:20 AM
- If Friday was holiday: Use actual last working day 3:35 PM

**Nasdaq 100 (USD)**:
- Compare: `week_start` (Monday 8:05 PM IST) vs `week_end` (Saturday 2:35 AM IST)
- Automatically adjusts for US holidays using data change detection

**Gold 24K (INR)**:
- Compare: Monday 12:00 PM vs Sunday 12:00 PM
- Full 7-day week comparison

### Monthly Gain/Loss

**Nifty (INR)**:
- Compare: `month_start` (first working day 9:20 AM) vs `month_end` (last working day 3:35 PM)
- Automatically determined by data change detection

**Nasdaq 100 (USD)**:
- Compare: `month_start` (first working day 8:05 PM IST) vs `month_end` (last working day 2:35 AM IST)
- Automatically determined by data change detection

**Gold 24K (INR)**:
- Compare: 1st day 12:00 PM vs last day 12:00 PM
- Regardless of weekends/holidays (gold updates daily)

### Display Requirements

- Show both absolute change and percentage change
- Display currency clearly: **INR** for Indian assets, **USD** for Nasdaq
- Color coding: Green for gains, Red for losses
- Show comparison dates with actual day names (e.g., "Mon Jan 6, 9:20 AM vs Fri Jan 10, 3:35 PM")
- Show if start/end was adjusted (e.g., "Week started on Tuesday due to holiday")
- Handle missing data gracefully

---

## CORE FEATURES

### 1. Data Fetching

#### Stock Market Data (Yahoo Finance API)
- **Nifty 50**: Symbol `^NSEI`
- **Nasdaq 100**: Symbol `^NDX`
- Backend proxy to handle Yahoo Finance API calls (to avoid CORS issues)

#### Gold 24K Data (Web Scraping - GoodReturns.in)
- **URL**: `https://www.goodreturns.in/gold-rates/`
- **Method**: Web scraping using Cheerio
- **Data to Extract**: 24K gold price per 10 grams
- **Fallback**: If scraping fails, use cached previous rate and log error
- **Rate Limiting**: Reasonable delays between requests

### 2. Automated Daily Captures

#### Cron Jobs (All Capture Daily)

```javascript
// INDIAN STOCKS - Morning Capture (9:20 AM IST daily)
cron.schedule('20 9 * * *', async () => {
  await captureIndianStocks('morning'); // Nifty 50
}, { timezone: "Asia/Kolkata" });

// INDIAN STOCKS - Evening Capture (3:35 PM IST daily)
cron.schedule('35 15 * * *', async () => {
  await captureIndianStocks('evening'); // Nifty 50
}, { timezone: "Asia/Kolkata" });

// NASDAQ - Evening Capture (8:05 PM IST daily = 9:35 AM EST)
cron.schedule('5 20 * * *', async () => {
  await captureNasdaq('evening'); // Nasdaq 100
}, { timezone: "Asia/Kolkata" });

// NASDAQ - Morning Capture (2:35 AM IST daily = 4:05 PM EST previous day)
cron.schedule('35 2 * * *', async () => {
  await captureNasdaq('morning'); // Nasdaq 100
}, { timezone: "Asia/Kolkata" });

// GOLD - Daily Capture (12:00 PM IST daily)
cron.schedule('0 12 * * *', async () => {
  await captureGold(); // Gold 24K
}, { timezone: "Asia/Kolkata" });
```

#### Smart Tagging Jobs (Run after captures)

```javascript
// Tag week_start (runs Monday evening after both captures)
cron.schedule('0 22 * * 1', async () => {
  await determineAndTagWeekStart();
}, { timezone: "Asia/Kolkata" });

// Tag week_end (runs Friday evening after both captures)
cron.schedule('0 18 * * 5', async () => {
  await determineAndTagWeekEnd();
}, { timezone: "Asia/Kolkata" });

// Tag month_start (runs on 5th of each month to allow time for detection)
cron.schedule('0 10 5 * *', async () => {
  await determineAndTagMonthStart();
}, { timezone: "Asia/Kolkata" });

// Tag month_end (runs on 3rd of each month to analyze previous month)
cron.schedule('0 10 3 * *', async () => {
  await determineAndTagMonthEnd();
}, { timezone: "Asia/Kolkata" });
```

### 3. Smart Detection Functions

```javascript
async function determineAndTagWeekStart() {
  // Get Monday and subsequent days' morning captures
  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  
  for (let day of weekDays) {
    const capture = await getCaptureForDay(day, 'morning');
    if (capture && capture.data_changed) {
      await tagCapture(capture.id, 'week_start');
      break; // Found first working day
    }
  }
}

async function determineAndTagWeekEnd() {
  // Get Friday and work backwards
  const weekDays = ['Friday', 'Thursday', 'Wednesday', 'Tuesday', 'Monday'];
  
  for (let day of weekDays) {
    const capture = await getCaptureForDay(day, 'evening');
    if (capture && capture.data_changed) {
      await tagCapture(capture.id, 'week_end');
      break; // Found last working day
    }
  }
}

async function determineAndTagMonthStart() {
  // Get captures from 1st, 2nd, 3rd... of current month
  for (let day = 1; day <= 7; day++) {
    const capture = await getCaptureForDate(currentMonth, day, 'morning');
    if (capture && capture.data_changed) {
      await tagCapture(capture.id, 'month_start');
      break;
    }
  }
}

async function determineAndTagMonthEnd() {
  // Get captures from 31st, 30th, 29th, 28th, 27th of previous month
  const previousMonth = getPreviousMonth();
  
  for (let day = 31; day >= 27; day--) {
    const capture = await getCaptureForDate(previousMonth, day, 'evening');
    if (capture && capture.data_changed) {
      await tagCapture(capture.id, 'month_end');
      break;
    }
  }
}
```


### 5. Dashboard UI

Clean, modern interface showing:
- **Current Live Prices** with refresh button and last updated timestamp
- **Daily Capture Status**: Show today's captures (timestamps along with day like Mon or Tue etc) with checkmarks
- **Weekly Performance Cards**:
  - Show actual dates used (e.g., "Tue Jan 7 - Thu Jan 9" if Mon/Fri were holidays)
  - Gain/loss with percentage
  - Trend indicators
- **Monthly Performance Cards**:
  - Show actual dates used with day names
  - Gain/loss with percentage
  - Trend indicators
- **Historical Data View**: Last 4 weeks, last 3 months

- **Gold Daily Chart**: 30-day trend line
- Responsive design for mobile and desktop
- Loading states and error messages
- **Data Change Indicators**: Show if market was open/closed on specific days

---

## DATABASE SCHEMA

```sql
-- Main price captures table
CREATE TABLE price_captures (
  id SERIAL PRIMARY KEY,
  
  -- Price data

  nifty DECIMAL(10,2),
  nasdaq DECIMAL(10,2),
  gold_24k_per_10g DECIMAL(10,2),
  
  -- Metadata
  captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  capture_time VARCHAR(20), -- 'morning' (9:20/8:05), 'evening' (3:35/2:35), 'gold_daily' (12:00)
  
  -- Data change detection (KEY FIELDS)

  nifty_changed BOOLEAN DEFAULT false,
  nasdaq_changed BOOLEAN DEFAULT false,
  gold_changed BOOLEAN DEFAULT false,
  
  -- Tagging for analysis
  tags TEXT[], -- Array: ['week_start', 'week_end', 'month_start', 'month_end']
  
  -- Tracking
  is_auto_captured BOOLEAN DEFAULT false,
  notes TEXT,
  scraping_success BOOLEAN DEFAULT true
);

-- Indexes for performance
CREATE INDEX idx_captured_at ON price_captures(captured_at);
CREATE INDEX idx_capture_time ON price_captures(capture_time);
CREATE INDEX idx_tags ON price_captures USING GIN(tags);
CREATE INDEX idx_data_changed ON price_captures(nifty_changed, nasdaq_changed, gold_changed);

-- Previous captures cache (for comparison)
CREATE TABLE previous_captures (
  id SERIAL PRIMARY KEY,
  asset VARCHAR(20) UNIQUE, -- 'nifty', 'nasdaq', 'gold'
  last_price DECIMAL(10,2),
  last_capture_id INTEGER REFERENCES price_captures(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gold scraping log
CREATE TABLE gold_scraping_log (
  id SERIAL PRIMARY KEY,
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  success BOOLEAN,
  price_captured DECIMAL(10,2),
  error_message TEXT
);
```

---

## API ENDPOINTS

Backend should have:

- `GET /api/prices/current` - Fetch current live prices (stocks from Yahoo, gold from GoodReturns)
- `GET /api/prices/latest-captures` - Get today's captures with data_changed flags
- `GET /api/prices/history` - Get all captured prices with filters (date range, tags, etc.)
- `GET /api/prices/weekly-analysis` - Get weekly gain/loss with actual dates used
- `GET /api/prices/monthly-analysis` - Get monthly gain/loss with actual dates used
- `GET /api/prices/daily-status` - Get capture status for today (completed/pending)
- `GET /api/prices/calendar` - Get capture calendar for date picker visualization

- `GET /api/health` - Health check endpoint
- `GET /api/gold/history` - Get daily gold price history with 30-day chart data

---

## TECHNICAL REQUIREMENTS

### 1. Environment Variables (.env)

```env
DATABASE_URL=postgresql://...
PORT=3000
NODE_ENV=production
TZ=Asia/Kolkata
YAHOO_FINANCE_API_URL=https://query1.finance.yahoo.com
GOODRETURNS_GOLD_URL=https://www.goodreturns.in/gold-rates/
```

### 2. Yahoo Finance Integration

- Use axios to fetch stock market data
- Handle rate limits and errors gracefully
- Parse JSON response correctly
- Implement retry logic with exponential backoff (max 3 attempts)
- Cache responses briefly (1-2 minutes) to avoid duplicate API calls

### 3. GoodReturns Gold Scraping

**Required Packages**:
```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "cheerio": "^1.0.0-rc.12"
  }
}
```

**Implementation Requirements**:
- Use Cheerio for lightweight HTML parsing
- Implement user-agent rotation to avoid blocking
- Add reasonable delays between requests (capture once daily is sufficient)
- Cache gold prices in memory
- Fallback to last known price if scraping fails
- Log all scraping attempts (success/failure)
- Parse only 24K gold price per 10 grams
- Handle different HTML structures (website might change)
- Implement error handling and retries (max 3 attempts)

### 4. Data Change Detection Logic

```javascript
class DataChangeDetector {
  async detectChanges(currentCapture, previousCapture) {
    if (!previousCapture) {
      return {

        nifty_changed: true,
        nasdaq_changed: true,
        gold_changed: true
      };
    }
    
    const threshold = 0.01; // Minimum change to consider "changed"
    
    return {

      nifty_changed: Math.abs(currentCapture.nifty - previousCapture.nifty) > threshold,
      nasdaq_changed: Math.abs(currentCapture.nasdaq - previousCapture.nasdaq) > threshold,
      gold_changed: Math.abs(currentCapture.gold - previousCapture.gold) > threshold
    };
  }
  
  async updatePreviousCaptures(capture) {
    // Update the previous_captures table for next comparison
    await db.query(`
      INSERT INTO previous_captures (asset, last_price, last_capture_id)
      VALUES 

        ('nifty', $2, $5),
        ('nasdaq', $3, $5),
        ('gold', $4, $5)
      ON CONFLICT (asset) 
      DO UPDATE SET 
        last_price = EXCLUDED.last_price,
        last_capture_id = EXCLUDED.last_capture_id,
        updated_at = CURRENT_TIMESTAMP
    `, [capture.nifty, capture.nasdaq, capture.gold, capture.id]);
  }
}
```

### 5. Error Handling

- Retry failed API calls (max 3 retries with exponential backoff)
- Retry failed scraping attempts (max 3 retries with 10-second delays)
- Log errors to console with timestamps and context
- Send meaningful error messages to frontend
- Store failed capture attempts
- Email notifications for critical failures (optional)
- Use cached gold price if scraping fails repeatedly
- If data fetching fails, mark capture as incomplete but still store timestamp

### 6. Railway Deployment

- Include `Procfile`: `web: node server.js`
- Include `railway.json`:
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node server.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```
- Set up PostgreSQL service on Railway
- Configure environment variables in Railway dashboard
- Enable automatic deployments from GitHub
- Set up health check endpoint for monitoring

---

## PROJECT STRUCTURE

```
market-tracker/
├── server/
│   ├── server.js                      # Main Express app
│   ├── routes/
│   │   ├── prices.js                  # Price-related endpoints
│   │   ├── gold.js                    # Gold-specific endpoints
│   │   └── analysis.js                # Weekly/monthly analysis endpoints
│   ├── services/
│   │   ├── yahooFinance.js            # Yahoo Finance API integration
│   │   ├── goldScraper.js             # GoodReturns gold scraping
│   │   ├── dataChangeDetector.js      # Data change detection logic
│   │   ├── smartTagging.js            # Week/month start/end detection
│   │   ├── cronJobs.js                # Cron job definitions (capture + tagging)
│   │   └── captureService.js          # Main capture orchestration
│   ├── db/
│   │   ├── database.js                # PostgreSQL connection
│   │   └── migrations/                # Database migrations
│   └── utils/
│       ├── helpers.js                 # General helper functions
│       ├── cache.js                   # Caching utilities
│       └── logger.js                  # Logging utilities
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── LivePrices.jsx
│   │   │   ├── DailyCaptureStatus.jsx   # Shows today's captures
│   │   │   ├── PriceCard.jsx
│   │   │   ├── GoldPriceCard.jsx
│   │   │   ├── WeeklyAnalysis.jsx
│   │   │   ├── MonthlyAnalysis.jsx
│   │   │   ├── GoldDailyChart.jsx
│   │   │   ├── CaptureCalendar.jsx      # Calendar view of captures
│   │   │   ├── HistoryTable.jsx
│   │   │   └── DataChangeIndicator.jsx  # Shows if market was open/closed
│   │   ├── services/
│   │   │   └── api.js                   # Frontend API calls
│   │   └── utils/
│   │       └── formatters.js            # Data formatting utilities
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── package.json
├── .env.example
├── .gitignore
├── Procfile
├── railway.json
└── README.md
```

---



### Cron Jobs
- [ ] Morning captures execute at correct times (9:20 AM, 8:05 PM IST)
- [ ] Evening captures execute at correct times (3:35 PM, 2:35 AM IST)
- [ ] Gold daily capture executes at 12:00 PM IST
- [ ] All captures run every day (no skipping weekends/holidays)

### Smart Tagging
- [ ] Week start detection finds first day with data change
- [ ] Week end detection finds last day with data change
- [ ] Month start detection finds first working day correctly
- [ ] Month end detection finds last working day correctly
- [ ] Tagging jobs run at scheduled times and complete successfully

### Calculations
- [ ] Weekly gain/loss calculations are mathematically accurate
- [ ] Monthly gain/loss calculations handle month boundaries correctly
- [ ] Correct captures are used based on tags (week_start, week_end, etc.)
- [ ] Currency display is correct (INR vs USD)

### Data Integrity
- [ ] No duplicate captures for same time period
- [ ] All timestamps stored in UTC, displayed in IST
- [ ] Missing captures are logged and handled gracefully
- [ ] Previous captures table always has latest data

### Gold Scraping
- [ ] Gold scraping extracts correct 24K price from GoodReturns
- [ ] Gold daily capture works every day including weekends
- [ ] Gold fallback to cached price when scraping fails
- [ ] Scraping doesn't get blocked (user-agent, delays)
- [ ] Gold price validates within reasonable range (40k-150k INR)

### UI/UX
- [ ] Dashboard displays current prices correctly
- [ ] Daily capture status shows completed/pending captures
- [ ] Weekly/monthly analysis shows actual dates used (with adjustments noted)
- [ ] Capture calendar visualizes data correctly
- [ ] Data change indicators show market open/closed status
- [ ] Loading states appear appropriately
- [ ] Error messages are user-friendly
- [ ] Responsive design works on mobile devices

### Performance
- [ ] Database queries execute efficiently with proper indexes
- [ ] Historical data queries use pagination
- [ ] API responses are fast (<500ms for most endpoints)
- [ ] Cron jobs don't overlap or cause conflicts

### Deployment
- [ ] Railway deployment successful and stable
- [ ] Database migrations run without errors
- [ ] Environment variables configured correctly
- [ ] Health check endpoint responds correctly
- [ ] Logs are accessible and informative

---



## IMPORTANT IMPLEMENTATION NOTES

### Data Change Detection
- Use a reasonable threshold (0.01 or 0.1) to avoid false negatives due to rounding
- Always compare with immediate previous capture, not just previous day
- Handle first capture case (no previous data to compare)
- Log when data hasn't changed for anomaly detection

### Smart Tagging Algorithms
- Run tagging jobs AFTER captures are complete
- Tag jobs should be idempotent (can run multiple times safely)
- Store multiple tags per capture (e.g., a Monday capture can be both 'week_start' and 'month_start')
- Allow manual override of automatic tagging

### Timezone Handling
- Always use IST for cron scheduling
- Store all timestamps in UTC in database
- Convert to IST for display
- Be consistent across all captures

### Database Performance
- Use indexes on frequently queried columns (captured_at, tags)
- Use GIN index for array fields (tags)
- Implement pagination for historical queries
- Consider partitioning if data grows very large (millions of records)

### Cron Job Reliability
- Log every cron execution (start, end, success/failure)
- Implement job monitoring to detect missed executions
- Use Railway's persistent storage for cron state
- Consider using a distributed cron service for critical reliability

### Error Recovery
- If capture fails, log it but don't stop future captures
- Implement manual retry mechanism for failed captures
- Alert if consecutive captures fail (3+ times)
- Store partial data even if some assets fail

### Data Validation
- Validate price ranges before storing:

  - Nifty: 21,000 - 28,000
  - Nasdaq: 15,000 - 25,000
  - Gold 24K: 40,000 - 150,000 INR per 10g
- Flag anomalous data for review
- Don't reject data automatically, but mark for attention

### Security
- Use parameterized queries for all database operations
- Implement rate limiting on API endpoints (100 requests/minute)
- Sanitize all user inputs
- Use HTTPS in production (Railway provides this)
- Don't expose database credentials in logs
- Implement CORS properly for frontend-backend communication

### Monitoring & Observability
- Log all captures with timestamps
- Track data change detection results
- Monitor scraping success rate
- Alert on repeated failures
- Track API response times
- Monitor database query performance

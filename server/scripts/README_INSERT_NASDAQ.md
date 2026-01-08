# How to Insert NASDAQ Opening Data from Terminal

## Prerequisites

1. **Database Connection**
   - Ensure `DATABASE_URL` is set in your `.env` file or environment
   - Format: `postgresql://username:password@host:port/database`
   - The database must be accessible from where you're running the script

2. **Node.js and Dependencies**
   - Node.js must be installed
   - Run `npm install` in the `server` directory to install dependencies

## Steps to Run

1. **Navigate to the server directory:**
   ```bash
   cd server
   ```

2. **Ensure .env file exists with DATABASE_URL:**
   ```bash
   # Check if .env exists
   ls -la .env
   
   # If not, create it or set environment variable:
   export DATABASE_URL="postgresql://user:password@host:port/database"
   ```

3. **Run the script:**
   ```bash
   node scripts/insertNasdaqJan6.js
   ```

## Alternative: Direct Database Insert (if you have psql access)

If you prefer to insert directly via SQL:

```sql
-- First, calculate the correct timestamp for Jan 6, 2026 NASDAQ opening
-- Jan 6, 2026 US trading day opening = Jan 6, 2026 9:30 AM ET
-- Converted to IST: approximately Jan 6, 2026 8:00 PM IST (varies with EST/EDT)

INSERT INTO price_captures 
(nifty, nasdaq, gold_24k_per_1g, capture_time, captured_at, is_auto_captured, nifty_changed, nasdaq_changed, gold_changed)
VALUES 
(NULL, 25462.06, NULL, 'nasdaq_opening', '2026-01-06 20:00:00+05:30', false, false, true, false);
```

**Note:** The exact IST time depends on whether it's EST or EDT. The script automatically calculates this.

## Troubleshooting

- **"database does not exist"**: Check your DATABASE_URL
- **"Cannot find module"**: Run `npm install` in the server directory
- **Connection timeout**: Verify database is accessible and credentials are correct


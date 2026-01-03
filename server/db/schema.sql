-- Main price captures table
CREATE TABLE IF NOT EXISTS price_captures (
  id SERIAL PRIMARY KEY,
  
  -- Price data
  nifty DECIMAL(10,2),
  nasdaq DECIMAL(10,2),
  gold_24k_per_1g DECIMAL(10,2),
  
  -- Metadata
  captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  capture_time VARCHAR(20), -- 'nifty_opening', 'nifty_closing', 'nasdaq_opening', 'nasdaq_closing', 'gold_daily'
  
  -- Data change detection
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
CREATE INDEX IF NOT EXISTS idx_captured_at ON price_captures(captured_at);
CREATE INDEX IF NOT EXISTS idx_capture_time ON price_captures(capture_time);
CREATE INDEX IF NOT EXISTS idx_tags ON price_captures USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_data_changed ON price_captures(nifty_changed, nasdaq_changed, gold_changed);

-- Previous captures cache (for comparison)
CREATE TABLE IF NOT EXISTS previous_captures (
  id SERIAL PRIMARY KEY,
  asset VARCHAR(20) UNIQUE, -- 'nifty', 'nasdaq', 'gold'
  last_price DECIMAL(10,2),
  last_capture_id INTEGER REFERENCES price_captures(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gold scraping log
CREATE TABLE IF NOT EXISTS gold_scraping_log (
  id SERIAL PRIMARY KEY,
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  success BOOLEAN,
  price_captured DECIMAL(10,2),
  error_message TEXT
);

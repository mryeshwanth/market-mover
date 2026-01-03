-- Main price captures table
CREATE TABLE IF NOT EXISTS price_captures (
  id SERIAL PRIMARY KEY,
  
  -- Price data
  nifty DECIMAL(10,2),
  nasdaq DECIMAL(10,2),
  gold_24k_per_1g DECIMAL(10,2),
  
  -- Metadata
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL,
  capture_time VARCHAR(20) NOT NULL, -- 'nifty_opening', 'nifty_closing', 'nasdaq_opening', 'nasdaq_closing', 'gold_daily'
  
  -- Data change detection
  nifty_changed BOOLEAN DEFAULT false,
  nasdaq_changed BOOLEAN DEFAULT false,
  gold_changed BOOLEAN DEFAULT false,
  
  -- Tracking
  is_auto_captured BOOLEAN DEFAULT false
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_captured_at ON price_captures(captured_at);
CREATE INDEX IF NOT EXISTS idx_capture_time ON price_captures(capture_time);
CREATE INDEX IF NOT EXISTS idx_data_changed ON price_captures(nifty_changed, nasdaq_changed, gold_changed);

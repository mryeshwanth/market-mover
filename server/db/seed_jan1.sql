-- Manual Insert for Jan 1, 2026
-- I am effectively using defaults for the boolean/tracking columns here.
-- This query now explicitly lists all columns to match the table structure.

INSERT INTO price_captures (
    nifty, 
    nasdaq, 
    gold_24k_per_10g, 
    captured_at, 
    capture_time, 
    notes, 
    is_auto_captured,
    nifty_changed,
    nasdaq_changed,
    gold_changed,
    tags,
    scraping_success
)
VALUES 
(
    26173.30,           -- nifty
    NULL,               -- nasdaq
    NULL,               -- gold_24k_per_10g
    '2026-01-01 09:20:00+05:30', -- captured_at
    'morning',          -- capture_time
    'Manual Entry Jan 1 Open', -- notes
    false,              -- is_auto_captured
    false,              -- nifty_changed
    false,              -- nasdaq_changed
    false,              -- gold_changed
    NULL,               -- tags
    true                -- scraping_successI d
),
(
    26197.55,           -- nifty
    NULL,               -- nasdaq
    NULL,               -- gold_24k_per_10g
    '2026-01-01 15:35:00+05:30', -- captured_at
    'evening',          -- capture_time
    'Manual Entry Jan 1 Close', -- notes
    false,              -- is_auto_captured
    false,              -- nifty_changed
    false,              -- nasdaq_changed
    false,              -- gold_changed
    NULL,               -- tags
    true                -- scraping_success
);

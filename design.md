<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Market Mover - Track Your Markets</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #f5f7fa;
            min-height: 100vh;
            padding: 40px 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        header {
            text-align: center;
            margin-bottom: 60px;
            color: #1a1a1a;
        }

        h1 {
            font-size: 3.5rem;
            font-weight: 700;
            margin-bottom: 15px;
        }

        .tagline {
            font-size: 1.3rem;
            opacity: 0.7;
            font-weight: 300;
        }

        .markets-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
            gap: 30px;
            margin-bottom: 40px;
        }

        .market-card {
            background: rgba(255, 255, 255, 0.98);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .market-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 25px 70px rgba(0,0,0,0.4);
        }

        .market-header {
            margin-bottom: 25px;
            padding-bottom: 20px;
            border-bottom: 2px solid #f0f0f0;
        }

        .market-icon {
            display: none;
        }

        .nifty-icon { display: none; }
        .nasdaq-icon { display: none; }
        .gold-icon { display: none; }

        .market-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: #1a1a1a;
        }

        .period-card {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 15px;
            transition: background 0.2s ease;
        }

        .period-card:hover {
            background: #f0f2f5;
        }

        .period-label {
            font-size: 0.85rem;
            font-weight: 600;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
        }

        .price-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }

        .price-label {
            font-size: 0.75rem;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .price-label:first-child {
            text-align: left;
        }

        .price-label:last-child {
            text-align: right;
        }

        .price-values {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
        }

        .price-value {
            font-size: 1.4rem;
            font-weight: 600;
            color: #1a1a1a;
        }

        .price-value:last-child {
            text-align: right;
        }

        .change-info {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 0;
        }

        .change-badge {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 6px 12px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 0.9rem;
        }

        .change-positive {
            background: #d4edda;
            color: #155724;
        }

        .change-negative {
            background: #f8d7da;
            color: #721c24;
        }

        .timestamp {
            font-size: 0.75rem;
            color: #999;
            margin-top: 8px;
            display: flex;
            align-items: center;
            gap: 5px;
        }

        .arrow {
            font-size: 0.7rem;
        }

        @media (max-width: 768px) {
            h1 {
                font-size: 2.5rem;
            }

            .markets-grid {
                grid-template-columns: 1fr;
            }

            .price-value {
                font-size: 1.2rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Market Mover</h1>
        </header>

        <div class="markets-grid">
            <!-- Nifty 50 -->
            <div class="market-card">
                <div class="market-header">
                    <div class="market-title">Nifty 50</div>
                </div>

                <div class="period-card">
                    <div class="period-label">Daily</div>
                    <div class="price-row">
                        <span class="price-label">Opening</span>
                        <span class="price-label">Closing</span>
                    </div>
                    <div class="price-values">
                        <span class="price-value">₹26,124.20</span>
                        <span class="price-value">₹25,876.85</span>
                    </div>
                    <div class="change-info">
                        <span class="change-badge change-negative">
                            ▼ 0.95% (₹247.35)
                        </span>
                    </div>
                    <div class="timestamp">
                        Thu, 8 Jan 2026 9:20 am <span class="arrow">→</span> Thu, 8 Jan 2026 3:40 pm
                    </div>
                </div>

                <div class="period-card">
                    <div class="period-label">Weekly</div>
                    <div class="price-row">
                        <span class="price-label">Opening</span>
                        <span class="price-label">Closing</span>
                    </div>
                    <div class="price-values">
                        <span class="price-value">₹26,340.25</span>
                        <span class="price-value">₹25,876.85</span>
                    </div>
                    <div class="change-info">
                        <span class="change-badge change-negative">
                            ▼ 1.76% (₹463.40)
                        </span>
                    </div>
                    <div class="timestamp">
                        Mon, 5 Jan 2026 9:20 am <span class="arrow">→</span> Thu, 8 Jan 2026 3:40 pm
                    </div>
                </div>

                <div class="period-card">
                    <div class="period-label">Monthly</div>
                    <div class="price-row">
                        <span class="price-label">Opening</span>
                        <span class="price-label">Closing</span>
                    </div>
                    <div class="price-values">
                        <span class="price-value">₹26,173.30</span>
                        <span class="price-value">₹25,876.85</span>
                    </div>
                    <div class="change-info">
                        <span class="change-badge change-negative">
                            ▼ 1.13% (₹296.45)
                        </span>
                    </div>
                    <div class="timestamp">
                        Thu, 1 Jan 2026 9:20 am <span class="arrow">→</span> Thu, 8 Jan 2026 3:40 pm
                    </div>
                </div>
            </div>

            <!-- Nasdaq 100 -->
            <div class="market-card">
                <div class="market-header">
                    <div class="market-title">Nasdaq 100</div>
                </div>

                <div class="period-card">
                    <div class="period-label">Daily</div>
                    <div class="price-row">
                        <span class="price-label">Opening</span>
                        <span class="price-label">Closing</span>
                    </div>
                    <div class="price-values">
                        <span class="price-value">$21,245.80</span>
                        <span class="price-value">$21,387.50</span>
                    </div>
                    <div class="change-info">
                        <span class="change-badge change-positive">
                            ▲ 0.67% ($141.70)
                        </span>
                    </div>
                    <div class="timestamp">
                        Wed, 7 Jan 2026 9:30 am <span class="arrow">→</span> Wed, 7 Jan 2026 4:00 pm
                    </div>
                </div>

                <div class="period-card">
                    <div class="period-label">Weekly</div>
                    <div class="price-row">
                        <span class="price-label">Opening</span>
                        <span class="price-label">Closing</span>
                    </div>
                    <div class="price-values">
                        <span class="price-value">$20,985.30</span>
                        <span class="price-value">$21,387.50</span>
                    </div>
                    <div class="change-info">
                        <span class="change-badge change-positive">
                            ▲ 1.92% ($402.20)
                        </span>
                    </div>
                    <div class="timestamp">
                        Mon, 5 Jan 2026 9:30 am <span class="arrow">→</span> Wed, 7 Jan 2026 4:00 pm
                    </div>
                </div>

                <div class="period-card">
                    <div class="period-label">Monthly</div>
                    <div class="price-row">
                        <span class="price-label">Opening</span>
                        <span class="price-label">Closing</span>
                    </div>
                    <div class="price-values">
                        <span class="price-value">$20,725.60</span>
                        <span class="price-value">$21,387.50</span>
                    </div>
                    <div class="change-info">
                        <span class="change-badge change-positive">
                            ▲ 3.19% ($661.90)
                        </span>
                    </div>
                    <div class="timestamp">
                        Thu, 1 Jan 2026 9:30 am <span class="arrow">→</span> Wed, 7 Jan 2026 4:00 pm
                    </div>
                </div>
            </div>

            <!-- Gold -->
            <div class="market-card">
                <div class="market-header">
                    <div class="market-title">Gold</div>
                </div>

                <div class="period-card">
                    <div class="period-label">Daily</div>
                    <div class="price-row">
                        <span class="price-label">Opening</span>
                        <span class="price-label">Closing</span>
                    </div>
                    <div class="price-values">
                        <span class="price-value">$2,648.30</span>
                        <span class="price-value">$2,664.85</span>
                    </div>
                    <div class="change-info">
                        <span class="change-badge change-positive">
                            ▲ 0.62% ($16.55)
                        </span>
                    </div>
                    <div class="timestamp">
                        Thu, 8 Jan 2026 8:00 am <span class="arrow">→</span> Thu, 8 Jan 2026 5:00 pm
                    </div>
                </div>

                <div class="period-card">
                    <div class="period-label">Weekly</div>
                    <div class="price-row">
                        <span class="price-label">Opening</span>
                        <span class="price-label">Closing</span>
                    </div>
                    <div class="price-values">
                        <span class="price-value">$2,625.40</span>
                        <span class="price-value">$2,664.85</span>
                    </div>
                    <div class="change-info">
                        <span class="change-badge change-positive">
                            ▲ 1.50% ($39.45)
                        </span>
                    </div>
                    <div class="timestamp">
                        Mon, 5 Jan 2026 8:00 am <span class="arrow">→</span> Thu, 8 Jan 2026 5:00 pm
                    </div>
                </div>

                <div class="period-card">
                    <div class="period-label">Monthly</div>
                    <div class="price-row">
                        <span class="price-label">Opening</span>
                        <span class="price-label">Closing</span>
                    </div>
                    <div class="price-values">
                        <span class="price-value">$2,638.75</span>
                        <span class="price-value">$2,664.85</span>
                    </div>
                    <div class="change-info">
                        <span class="change-badge change-positive">
                            ▲ 0.99% ($26.10)
                        </span>
                    </div>
                    <div class="timestamp">
                        Thu, 1 Jan 2026 8:00 am <span class="arrow">→</span> Thu, 8 Jan 2026 5:00 pm
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
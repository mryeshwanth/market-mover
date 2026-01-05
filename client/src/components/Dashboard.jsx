import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { fetchLivePrices } from '../services/api';

const PriceCard = ({ title, openingPrice, closingPrice, performance, currency = '₹', startDate, endDate, isGold = false }) => {
    const isPositive = performance.change >= 0;
    const isNeutral = performance.change === 0;
    const color = isNeutral ? '#888' : (isPositive ? '#4caf50' : '#f44336');
    const Icon = isNeutral ? Minus : (isPositive ? TrendingUp : TrendingDown);

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const formattedDate = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        return `${dayName}, ${formattedDate}`;
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    // Check if the end date is very recent (within last 10 minutes) to show "Live" indicator
    // This indicates the market is still open and showing current/live price
    const isLive = (endDate) => {
        if (!endDate) return false;
        const end = new Date(endDate);
        const now = new Date();
        const diffMinutes = (now - end) / (1000 * 60);
        // Show "Live" if the timestamp is within the last 10 minutes
        // This means we're using current price, not a captured closing price
        return diffMinutes >= 0 && diffMinutes < 10;
    };

    // Format date range ensuring chronological order
    const formatDateRange = (startDate, endDate) => {
        if (!startDate || !endDate) return null;
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Check if dates are in correct order (start should be before or equal to end)
        // If not, it might be a timezone issue - display as-is but log a warning
        const startFormatted = `${formatDate(start)} ${formatTime(start)}`;
        const endFormatted = isLive(endDate) 
            ? 'Live' 
            : `${formatDate(end)} ${formatTime(end)}`;
        
        // Always display opening → closing in chronological order
        // If end is before start, it's likely a data issue, but display end first for clarity
        if (start > end) {
            // This shouldn't happen, but if it does, show both dates
            return `${endFormatted} → ${startFormatted}`;
        }
        
        return `${startFormatted} → ${endFormatted}`;
    };

    // For Gold, use different labels
    const leftLabel = isGold ? 'START' : 'OPENING';
    const rightLabel = isGold ? 'END' : 'CLOSING';

    return (
        <div className="card" style={{ 
            background: '#ffffff', 
            color: '#000000', 
            borderRadius: '12px', 
            padding: '20px', 
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            width: '100%',
            maxWidth: '100%',
            minHeight: '200px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
            overflow: 'hidden'
        }}>
            <h3 style={{ 
                margin: '0 0 16px 0', 
                color: '#666', 
                fontSize: '0.85em', 
                textTransform: 'uppercase', 
                letterSpacing: '1px', 
                textAlign: 'center' 
            }}>{title}</h3>

            {/* Row 1: Opening and Closing Labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8em', color: '#888', fontWeight: '600' }}>{leftLabel}</span>
                <span style={{ fontSize: '0.8em', color: '#888', fontWeight: '600' }}>{rightLabel}</span>
            </div>

            {/* Row 2: Opening and Closing Prices */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '1.3em', fontWeight: 'bold', color: '#000' }}>
                    {currency}{(openingPrice !== null && openingPrice !== undefined) ? openingPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '---'}
                </span>
                <span style={{ fontSize: '1.3em', fontWeight: 'bold', color: '#000' }}>
                    {currency}{(closingPrice !== null && closingPrice !== undefined) ? closingPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '---'}
                </span>
            </div>

            {/* Row 3: Percentage and Change Amount */}
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '6px', 
                color: color, 
                fontWeight: '600', 
                fontSize: '1em',
                marginBottom: '12px'
            }}>
                <Icon size={18} />
                {Math.abs(performance.percent).toFixed(2)}%
                <span style={{ fontSize: '0.85em' }}>
                    ({performance.change > 0 ? '+' : ''}{currency}{Math.abs(performance.change).toFixed(2)})
                </span>
            </div>

            {/* Timestamps */}
            {startDate && endDate && (
                <div style={{ 
                    marginTop: 'auto', 
                    paddingTop: '10px', 
                    borderTop: '1px solid #eee', 
                    fontSize: '0.65em', 
                    color: '#999', 
                    textAlign: 'center' 
                }}>
                    <div>{formatDateRange(startDate, endDate)}</div>
                </div>
            )}
        </div>
    );
};

const Dashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        const result = await fetchLivePrices();
        if (result) {
            setData(result);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    if (loading && !data) return <div style={{ padding: '20px', color: '#000' }}>Loading market data...</div>;

    if (!data) {
        return <div style={{ padding: '20px', color: '#f44336' }}>Error: Unable to load market data. Check console for details.</div>;
    }

    const daily = data?.daily || {
        nifty: { change: 0, percent: 0, openingPrice: 0, closingPrice: 0 },
        nasdaq: { change: 0, percent: 0, openingPrice: 0, closingPrice: 0 },
        gold: { change: 0, percent: 0, openingPrice: 0, closingPrice: 0 }
    };
    const weekly = data?.weekly || {
        nifty: { change: 0, percent: 0, openingPrice: 0, closingPrice: 0 },
        nasdaq: { change: 0, percent: 0, openingPrice: 0, closingPrice: 0 },
        gold: { change: 0, percent: 0, openingPrice: 0, closingPrice: 0 }
    };
    const monthly = data?.monthly || {
        nifty: { change: 0, percent: 0, openingPrice: 0, closingPrice: 0 },
        nasdaq: { change: 0, percent: 0, openingPrice: 0, closingPrice: 0 },
        gold: { change: 0, percent: 0, openingPrice: 0, closingPrice: 0 }
    };

    // Responsive styles
    const containerStyle = {
        padding: '20px',
        maxWidth: '1400px',
        margin: '0 auto',
        backgroundColor: '#f5f5f5',
        minHeight: '100vh',
        width: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden'
    };

    const headerStyle = {
        marginBottom: '30px',
        textAlign: 'center',
        width: '100%'
    };

    const sectionTitleStyle = {
        fontSize: '1.2em',
        margin: '0 0 20px 0',
        color: '#000',
        fontWeight: '600',
        textAlign: 'left'
    };

    const cardsGridStyle = {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '20px',
        marginBottom: '40px',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        gridAutoRows: 'minmax(auto, 1fr)'
    };

    // Media query styles will be handled via CSS
    return (
        <>
            <style>{`
                * {
                    box-sizing: border-box;
                }
                @media (max-width: 768px) {
                    body, html {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        overflow-x: hidden !important;
                    }
                    .dashboard-container {
                        padding: 12px !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        box-sizing: border-box !important;
                    }
                    header {
                        text-align: center !important;
                        width: 100% !important;
                        margin: 0 auto 20px auto !important;
                        padding: 0 !important;
                    }
                    header h1 {
                        text-align: center !important;
                        margin: 0 auto !important;
                        padding: 0 !important;
                    }
                    .section-title {
                        font-size: 1em !important;
                        margin-bottom: 12px !important;
                        text-align: left !important;
                        width: 100% !important;
                        padding: 0 !important;
                    }
                    .cards-grid {
                        display: grid !important;
                        grid-template-columns: 1fr !important;
                        gap: 12px !important;
                        margin-bottom: 25px !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        padding: 0 !important;
                        margin-left: 0 !important;
                        margin-right: 0 !important;
                        box-sizing: border-box !important;
                    }
                    .card {
                        padding: 14px !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        box-sizing: border-box !important;
                        min-width: 0 !important;
                    }
                    .card h3 {
                        font-size: 0.75em !important;
                    }
                    .card span {
                        font-size: 1.1em !important;
                    }
                }
                @media (min-width: 769px) and (max-width: 1024px) {
                    .dashboard-container {
                        padding: 20px !important;
                        width: 100% !important;
                    }
                    .cards-grid {
                        display: grid !important;
                        grid-template-columns: repeat(3, 1fr) !important;
                        gap: 15px !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        box-sizing: border-box !important;
                    }
                    .card {
                        padding: 18px !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        box-sizing: border-box !important;
                        overflow: hidden !important;
                    }
                    .card span {
                        font-size: 1.2em !important;
                    }
                }
                @media (min-width: 1025px) {
                    .dashboard-container {
                        width: 100% !important;
                    }
                    .cards-grid {
                        display: grid !important;
                        grid-template-columns: repeat(3, 1fr) !important;
                        gap: 20px !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        box-sizing: border-box !important;
                    }
                    .card {
                        width: 100% !important;
                        max-width: 100% !important;
                        box-sizing: border-box !important;
                        overflow: hidden !important;
                    }
                }
            `}</style>
            <div className="dashboard-container" style={containerStyle}>
                {/* Row 1: Header */}
                <header style={headerStyle}>
                    <h1 style={{ fontSize: '1.8em', margin: 0, color: '#000', fontWeight: '700' }}>Market Mover</h1>
                </header>

                {/* Row 2: Nifty 50 Title */}
                <h2 className="section-title" style={sectionTitleStyle}>Nifty 50</h2>
                
                {/* Row 3: Nifty Cards (Daily, Weekly, Monthly) */}
                <div className="cards-grid" style={cardsGridStyle}>
                    <PriceCard
                        title="Daily"
                        openingPrice={daily.nifty.openingPrice}
                        closingPrice={daily.nifty.closingPrice}
                        performance={daily.nifty}
                        startDate={daily.nifty.startDate}
                        endDate={daily.nifty.endDate}
                    />
                    <PriceCard
                        title="Weekly"
                        openingPrice={weekly.nifty.openingPrice}
                        closingPrice={weekly.nifty.closingPrice}
                        performance={weekly.nifty}
                        startDate={weekly.nifty.startDate}
                        endDate={weekly.nifty.endDate}
                    />
                    <PriceCard
                        title="Monthly"
                        openingPrice={monthly.nifty.openingPrice}
                        closingPrice={monthly.nifty.closingPrice}
                        performance={monthly.nifty}
                        startDate={monthly.nifty.startDate}
                        endDate={monthly.nifty.endDate}
                    />
                </div>

                {/* Row 4: Nasdaq 100 Title */}
                <h2 className="section-title" style={sectionTitleStyle}>Nasdaq 100</h2>
                
                {/* Row 5: Nasdaq Cards (Daily, Weekly, Monthly) */}
                <div className="cards-grid" style={cardsGridStyle}>
                    <PriceCard
                        title="Daily"
                        openingPrice={daily.nasdaq.openingPrice}
                        closingPrice={daily.nasdaq.closingPrice}
                        performance={daily.nasdaq}
                        currency="$"
                        startDate={daily.nasdaq.startDate}
                        endDate={daily.nasdaq.endDate}
                    />
                    <PriceCard
                        title="Weekly"
                        openingPrice={weekly.nasdaq.openingPrice}
                        closingPrice={weekly.nasdaq.closingPrice}
                        performance={weekly.nasdaq}
                        currency="$"
                        startDate={weekly.nasdaq.startDate}
                        endDate={weekly.nasdaq.endDate}
                    />
                    <PriceCard
                        title="Monthly"
                        openingPrice={monthly.nasdaq.openingPrice}
                        closingPrice={monthly.nasdaq.closingPrice}
                        performance={monthly.nasdaq}
                        currency="$"
                        startDate={monthly.nasdaq.startDate}
                        endDate={monthly.nasdaq.endDate}
                    />
                </div>

                {/* Row 6: Gold 24k 1G Title */}
                <h2 className="section-title" style={sectionTitleStyle}>Gold 24K (1g)</h2>
                
                {/* Row 7: Gold Cards (Daily, Weekly, Monthly) */}
                <div className="cards-grid" style={cardsGridStyle}>
                    <PriceCard
                        title="Daily"
                        openingPrice={daily.gold.openingPrice}
                        closingPrice={daily.gold.closingPrice}
                        performance={daily.gold}
                        startDate={daily.gold.startDate}
                        endDate={daily.gold.endDate}
                        isGold={true}
                    />
                    <PriceCard
                        title="Weekly"
                        openingPrice={weekly.gold.openingPrice}
                        closingPrice={weekly.gold.closingPrice}
                        performance={weekly.gold}
                        startDate={weekly.gold.startDate}
                        endDate={weekly.gold.endDate}
                        isGold={true}
                    />
                    <PriceCard
                        title="Monthly"
                        openingPrice={monthly.gold.openingPrice}
                        closingPrice={monthly.gold.closingPrice}
                        performance={monthly.gold}
                        startDate={monthly.gold.startDate}
                        endDate={monthly.gold.endDate}
                        isGold={true}
                    />
                </div>
            </div>
        </>
    );
};

export default Dashboard;

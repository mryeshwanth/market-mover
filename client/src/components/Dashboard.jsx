import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { fetchLivePrices } from '../services/api';

const PeriodCard = ({ periodLabel, openingPrice, closingPrice, performance, currency = '₹', startDate, endDate, isGold = false }) => {
    const isPositive = performance.change >= 0;
    const isNeutral = performance.change === 0;
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

    const isLive = (endDate) => {
        if (!endDate) return false;
        const end = new Date(endDate);
        const now = new Date();
        const diffMinutes = (now - end) / (1000 * 60);
        
        // If endDate is very recent (within last 10 minutes), show Live
        if (diffMinutes >= 0 && diffMinutes < 10) {
            const endIST = new Date(end.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
            const endHour = endIST.getHours();
            const endMinute = endIST.getMinutes();
            
            // Don't show Live at closing times
            const isNiftyClosingTime = (endHour === 15 && endMinute >= 39 && endMinute <= 41);
            const isNasdaqClosingTime = (endHour === 2 && endMinute >= 0 && endMinute <= 30);
            
            return !isNiftyClosingTime && !isNasdaqClosingTime;
        }
        
        return false;
    };

    const formatDateRange = (startDate, endDate) => {
        if (!startDate || !endDate) return null;
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        const startFormatted = `${formatDate(start)} ${formatTime(start)}`;
        const endFormatted = isLive(endDate) 
            ? 'Live' 
            : `${formatDate(end)} ${formatTime(end)}`;
        
        // For NASDAQ, opening is in the evening and closing is next day early morning
        // So start timestamp might be > end timestamp, but we always show opening → closing
        // Only swap if the dates are clearly wrong (more than 12 hours difference and end is clearly before start)
        const hoursDiff = (start - end) / (1000 * 60 * 60);
        if (hoursDiff > 12) {
            // Opening is more than 12 hours after closing, which means they're swapped
            // This happens when opening is evening and closing is next day morning
            // In this case, we still show opening → closing (don't swap)
            return `${startFormatted} → ${endFormatted}`;
        }
        
        // Normal case: start comes before end
        return `${startFormatted} → ${endFormatted}`;
    };

    const leftLabel = isGold ? 'START' : 'OPENING';
    const rightLabel = isGold ? 'END' : 'CLOSING';

    const openingDisplay = (openingPrice !== null && openingPrice !== undefined) 
        ? openingPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) 
        : '---';
    const closingDisplay = (closingPrice !== null && closingPrice !== undefined) 
        ? closingPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) 
        : '---';

    return (
        <div className="period-card">
            <div className="period-label">{periodLabel}</div>
            <div className="price-row">
                <span className="price-label">{leftLabel}</span>
                <span className="price-label">{rightLabel}</span>
            </div>
            <div className="price-values">
                <span className="price-value">{currency}{openingDisplay}</span>
                <span className="price-value">{currency}{closingDisplay}</span>
            </div>
            <div className="change-info">
                <span className={`change-badge ${isPositive ? 'change-positive' : 'change-negative'}`}>
                    <Icon size={16} />
                    {isPositive ? '▲' : '▼'} {Math.abs(performance.percent).toFixed(2)}%
                    ({isPositive ? '+' : ''}{currency}{Math.abs(performance.change).toFixed(2)})
                </span>
            </div>
            {startDate && endDate && (
                <div className="timestamp">
                    {formatDateRange(startDate, endDate)}
                </div>
            )}
        </div>
    );
};

const MarketCard = ({ marketTitle, daily, weekly, monthly, currency = '₹', isGold = false }) => {
    return (
        <div className="market-card">
            <div className="market-header">
                <div className="market-title">{marketTitle}</div>
            </div>
            <PeriodCard
                periodLabel="Daily"
                openingPrice={daily.openingPrice}
                closingPrice={daily.closingPrice}
                performance={daily}
                currency={currency}
                startDate={daily.startDate}
                endDate={daily.endDate}
                isGold={isGold}
            />
            <PeriodCard
                periodLabel="Weekly"
                openingPrice={weekly.openingPrice}
                closingPrice={weekly.closingPrice}
                performance={weekly}
                currency={currency}
                startDate={weekly.startDate}
                endDate={weekly.endDate}
                isGold={isGold}
            />
            <PeriodCard
                periodLabel="Monthly"
                openingPrice={monthly.openingPrice}
                closingPrice={monthly.closingPrice}
                performance={monthly}
                currency={currency}
                startDate={monthly.startDate}
                endDate={monthly.endDate}
                isGold={isGold}
            />
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

    if (loading && !data) {
        return (
            <div className="container">
                <div style={{ padding: '20px', color: '#000', textAlign: 'center' }}>Loading market data...</div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="container">
                <div style={{ padding: '20px', color: '#f44336', textAlign: 'center' }}>
                    Error: Unable to load market data. Check console for details.
                </div>
            </div>
        );
    }

    const daily = data?.daily || {
        nifty: { change: 0, percent: 0, openingPrice: 0, closingPrice: 0, startDate: null, endDate: null },
        nasdaq: { change: 0, percent: 0, openingPrice: 0, closingPrice: 0, startDate: null, endDate: null },
        gold: { change: 0, percent: 0, openingPrice: 0, closingPrice: 0, startDate: null, endDate: null }
    };
    const weekly = data?.weekly || {
        nifty: { change: 0, percent: 0, openingPrice: 0, closingPrice: 0, startDate: null, endDate: null },
        nasdaq: { change: 0, percent: 0, openingPrice: 0, closingPrice: 0, startDate: null, endDate: null },
        gold: { change: 0, percent: 0, openingPrice: 0, closingPrice: 0, startDate: null, endDate: null }
    };
    const monthly = data?.monthly || {
        nifty: { change: 0, percent: 0, openingPrice: 0, closingPrice: 0, startDate: null, endDate: null },
        nasdaq: { change: 0, percent: 0, openingPrice: 0, closingPrice: 0, startDate: null, endDate: null },
        gold: { change: 0, percent: 0, openingPrice: 0, closingPrice: 0, startDate: null, endDate: null }
    };

    return (
        <div className="container">
            <header>
                <h1>Market Mover</h1>
            </header>

            <div className="markets-grid">
                <MarketCard
                    marketTitle="Nifty 50"
                    daily={daily.nifty}
                    weekly={weekly.nifty}
                    monthly={monthly.nifty}
                    currency="₹"
                />
                <MarketCard
                    marketTitle="Nasdaq 100"
                    daily={daily.nasdaq}
                    weekly={weekly.nasdaq}
                    monthly={monthly.nasdaq}
                    currency="$"
                />
                <MarketCard
                    marketTitle="Gold"
                    daily={daily.gold}
                    weekly={weekly.gold}
                    monthly={monthly.gold}
                    currency="₹"
                    isGold={true}
                />
            </div>
        </div>
    );
};

export default Dashboard;

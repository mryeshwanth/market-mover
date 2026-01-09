import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { fetchLivePrices } from '../services/api';

const PeriodCard = ({ periodLabel, openingPrice, closingPrice, performance, currency = '₹', startDate, endDate, isGold = false, marketTitle = '' }) => {
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

    const isLive = (endDate, startDate, periodLabel, currency, marketTitle) => {
        if (!endDate) return false;
        const end = new Date(endDate);
        const now = new Date();
        const diffMinutes = (now - end) / (1000 * 60);
        
        // Check if endDate is very recent (within last 2 hours)
        if (diffMinutes < 0 || diffMinutes >= 120) return false;
        
        // Get current IST time
        const nowIST = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        const nowHour = nowIST.getHours();
        const nowMinute = nowIST.getMinutes();
        const nowDay = nowIST.getDay(); // 0 = Sunday, 6 = Saturday
        const isWeekend = nowDay === 0 || nowDay === 6;
        
        // Check if NASDAQ market is currently open (7:00 PM - 2:30 AM IST on weekdays)
        const isNasdaqMarketOpen = !isWeekend && 
            (nowHour >= 19 || nowHour < 2 || (nowHour === 2 && nowMinute <= 30));
        
        // Check if Nifty market is currently open (9:20 AM - 3:40 PM IST on weekdays)
        const isNiftyMarketOpen = !isWeekend && 
            ((nowHour > 9 || (nowHour === 9 && nowMinute >= 20)) && 
             (nowHour < 15 || (nowHour === 15 && nowMinute <= 40)));
        
        // For daily period, check if startDate is today and market is open
        if (periodLabel === 'Daily' && startDate) {
            const start = new Date(startDate);
            const startIST = new Date(start.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
            const nowISTDate = new Date(nowIST.getFullYear(), nowIST.getMonth(), nowIST.getDate());
            const startISTDate = new Date(startIST.getFullYear(), startIST.getMonth(), startIST.getDate());
            
            // If startDate is today and endDate is very recent, check market status
            if (startISTDate.getTime() === nowISTDate.getTime() && diffMinutes < 60) {
                // Determine which market based on currency or market title
                const isNasdaq = currency === '$' || marketTitle.toLowerCase().includes('nasdaq');
                const isNifty = currency === '₹' && !isGold && (marketTitle.toLowerCase().includes('nifty') || !marketTitle.toLowerCase().includes('gold'));
                
                // If the specific market is open, show Live
                if ((isNasdaq && isNasdaqMarketOpen) || (isNifty && isNiftyMarketOpen)) {
                    return true;
                }
            }
        }
        
        // Check if it's at closing time (don't show Live at closing time)
        const endIST = new Date(end.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        const endHour = endIST.getHours();
        const endMinute = endIST.getMinutes();
        
        const isNiftyClosingTime = (endHour === 15 && endMinute >= 39 && endMinute <= 41);
        const isNasdaqClosingTime = (endHour === 2 && endMinute >= 0 && endMinute <= 30);
        
        // If very recent (within 30 minutes) and not at closing time, show Live
        return diffMinutes < 30 && !isNiftyClosingTime && !isNasdaqClosingTime;
    };

    const formatDateRange = (startDate, endDate) => {
        if (!startDate || !endDate) return null;
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        const startFormatted = `${formatDate(start)} ${formatTime(start)}`;
        const endFormatted = isLive(endDate, startDate, periodLabel, currency, marketTitle || '') 
            ? 'Live' 
            : `${formatDate(end)} ${formatTime(end)}`;
        
        if (start > end) {
            return `${endFormatted} → ${startFormatted}`;
        }
        
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
                marketTitle={marketTitle}
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
                marketTitle={marketTitle}
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
                marketTitle={marketTitle}
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

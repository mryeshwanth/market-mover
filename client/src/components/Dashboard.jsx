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

    // For Gold, use different labels
    const leftLabel = isGold ? 'START' : 'OPENING';
    const rightLabel = isGold ? 'END' : 'CLOSING';

    return (
        <div className="card" style={{ background: '#ffffff', color: '#000000', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#666', fontSize: '0.9em', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>{title}</h3>

            {/* Row 1: Opening and Closing Labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85em', color: '#888', fontWeight: '600' }}>{leftLabel}</span>
                <span style={{ fontSize: '0.85em', color: '#888', fontWeight: '600' }}>{rightLabel}</span>
            </div>

            {/* Row 2: Opening and Closing Prices */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#000' }}>
                    {currency}{(openingPrice !== null && openingPrice !== undefined) ? openingPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '---'}
                </span>
                <span style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#000' }}>
                    {currency}{(closingPrice !== null && closingPrice !== undefined) ? closingPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '---'}
                </span>
            </div>

            {/* Row 3: Percentage and Change Amount */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: color, fontWeight: '600', fontSize: '1.1em' }}>
                <Icon size={20} />
                {Math.abs(performance.percent).toFixed(2)}%
                <span style={{ fontSize: '0.9em' }}>
                    ({performance.change > 0 ? '+' : ''}{currency}{Math.abs(performance.change).toFixed(2)})
                </span>
            </div>

            {/* Timestamps */}
            {startDate && endDate && (
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #eee', fontSize: '0.7em', color: '#999', textAlign: 'center' }}>
                    <div>{formatDate(startDate)} {formatTime(startDate)} → {formatDate(endDate)} {formatTime(endDate)}</div>
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

    const current = data?.current || { nifty: 0, nasdaq: 0, gold: 0 };
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

    return (
        <div className="dashboard-container" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
            <header style={{ marginBottom: '30px', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2em', margin: 0, color: '#000' }}>Market Mover</h1>
            </header>

            {/* Weekly Performance Section */}
            <h2 style={{ fontSize: '1.2em', marginBottom: '12px', textAlign: 'center', color: '#000' }}>Weekly Performance</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                <PriceCard
                    title="Nifty 50"
                    openingPrice={weekly.nifty.openingPrice}
                    closingPrice={weekly.nifty.closingPrice}
                    performance={weekly.nifty}
                    startDate={weekly.nifty.startDate}
                    endDate={weekly.nifty.endDate}
                />
                <PriceCard
                    title="Nasdaq 100"
                    openingPrice={weekly.nasdaq.openingPrice}
                    closingPrice={weekly.nasdaq.closingPrice}
                    performance={weekly.nasdaq}
                    currency="$"
                    startDate={weekly.nasdaq.startDate}
                    endDate={weekly.nasdaq.endDate}
                />
                <PriceCard
                    title="Gold 24K (1g)"
                    openingPrice={weekly.gold.openingPrice}
                    closingPrice={weekly.gold.closingPrice}
                    performance={weekly.gold}
                    startDate={weekly.gold.startDate}
                    endDate={weekly.gold.endDate}
                    isGold={true}
                />
            </div>

            {/* Monthly Performance Section */}
            <h2 style={{ fontSize: '1.2em', marginBottom: '15px', textAlign: 'center', color: '#000' }}>Monthly Performance</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                <PriceCard
                    title="Nifty 50"
                    openingPrice={monthly.nifty.openingPrice}
                    closingPrice={monthly.nifty.closingPrice}
                    performance={monthly.nifty}
                    startDate={monthly.nifty.startDate}
                    endDate={monthly.nifty.endDate}
                />
                <PriceCard
                    title="Nasdaq 100"
                    openingPrice={monthly.nasdaq.openingPrice}
                    closingPrice={monthly.nasdaq.closingPrice}
                    performance={monthly.nasdaq}
                    currency="$"
                    startDate={monthly.nasdaq.startDate}
                    endDate={monthly.nasdaq.endDate}
                />
                <PriceCard
                    title="Gold 24K (1g)"
                    openingPrice={monthly.gold.openingPrice}
                    closingPrice={monthly.gold.closingPrice}
                    performance={monthly.gold}
                    startDate={monthly.gold.startDate}
                    endDate={monthly.gold.endDate}
                    isGold={true}
                />
            </div>

        </div>
    );
};

export default Dashboard;

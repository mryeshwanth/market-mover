import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { fetchLivePrices } from '../services/api';

const PriceCard = ({ title, openingPrice, closingPrice, performance, currency = '₹', startDate, endDate }) => {
    const isPositive = performance.change >= 0;
    const isNeutral = performance.change === 0;
    const color = isNeutral ? '#888' : (isPositive ? '#4caf50' : '#f44336');
    const Icon = isNeutral ? Minus : (isPositive ? TrendingUp : TrendingDown);

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    return (
        <div className="card" style={{ background: '#ffffff', color: '#000000', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#666', fontSize: '0.9em', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>{title}</h3>

            {/* Row 1: Opening and Closing Labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85em', color: '#888', fontWeight: '600' }}>OPENING</span>
                <span style={{ fontSize: '0.85em', color: '#888', fontWeight: '600' }}>CLOSING</span>
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
        console.log('Dashboard received data:', result);
        if (result) {
            setData(result);
        } else {
            console.error('No data received from API');
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    if (loading && !data) return <div style={{ padding: '20px', color: '#fff' }}>Loading market data...</div>;

    if (!data) {
        return <div style={{ padding: '20px', color: '#f44336' }}>Error: Unable to load market data. Check console for details.</div>;
    }

    const current = data?.current || { nifty: 0, nasdaq: 0, gold: 0 };
    const weekly = data?.weekly || { nifty: { change: 0, percent: 0 }, nasdaq: { change: 0, percent: 0 }, gold: { change: 0, percent: 0 } };
    const monthly = data?.monthly || { nifty: { change: 0, percent: 0 }, nasdaq: { change: 0, percent: 0 }, gold: { change: 0, percent: 0 } };

    return (
        <div className="dashboard-container" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: '30px' }}>
                <h1 style={{ fontSize: '2em', margin: 0 }}>Market Tracker</h1>
                <p style={{ color: '#888', margin: 0 }}>Automated Daily Tracking</p>
            </header>

            {/* Weekly Performance Section */}
            <h2 style={{ fontSize: '1.2em', marginBottom: '15px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>Weekly Performance</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                <PriceCard
                    title="Nifty 50"
                    openingPrice={weekly.openingPrices?.nifty}
                    closingPrice={weekly.closingPrices?.nifty}
                    performance={weekly.nifty}
                    startDate={weekly.startDate}
                    endDate={weekly.endDate}
                />
                <PriceCard
                    title="Nasdaq 100"
                    openingPrice={weekly.openingPrices?.nasdaq}
                    closingPrice={weekly.closingPrices?.nasdaq}
                    performance={weekly.nasdaq}
                    currency="$"
                    startDate={weekly.startDate}
                    endDate={weekly.endDate}
                />
                <PriceCard
                    title="Gold 24K (1g)"
                    openingPrice={weekly.openingPrices?.gold}
                    closingPrice={weekly.closingPrices?.gold}
                    performance={weekly.gold}
                    startDate={weekly.startDate}
                    endDate={weekly.endDate}
                />
            </div>

            {/* Monthly Performance Section */}
            <h2 style={{ fontSize: '1.2em', marginBottom: '15px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>Monthly Performance</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                <PriceCard
                    title="Nifty 50"
                    openingPrice={monthly.openingPrices?.nifty}
                    closingPrice={monthly.closingPrices?.nifty}
                    performance={monthly.nifty}
                    startDate={monthly.startDate}
                    endDate={monthly.endDate}
                />
                <PriceCard
                    title="Nasdaq 100"
                    openingPrice={monthly.openingPrices?.nasdaq}
                    closingPrice={monthly.closingPrices?.nasdaq}
                    performance={monthly.nasdaq}
                    currency="$"
                    startDate={monthly.startDate}
                    endDate={monthly.endDate}
                />
                <PriceCard
                    title="Gold 24K (1g)"
                    openingPrice={monthly.openingPrices?.gold}
                    closingPrice={monthly.closingPrices?.gold}
                    performance={monthly.gold}
                    startDate={monthly.startDate}
                    endDate={monthly.endDate}
                />
            </div>

        </div>
    );
};

export default Dashboard;

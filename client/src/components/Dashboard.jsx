import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { fetchLivePrices } from '../services/api';

const PriceCard = ({ title, price, performance, currency = '₹' }) => {
    const isPositive = performance.change >= 0;
    const isNeutral = performance.change === 0;
    const color = isNeutral ? '#888' : (isPositive ? '#4caf50' : '#f44336');
    const Icon = isNeutral ? Minus : (isPositive ? TrendingUp : TrendingDown);

    return (
        <div className="card" style={{ background: '#ffffff', color: '#000000', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '0.9em', textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</h3>
            <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#000' }}>
                {currency}{(price !== null && price !== undefined) ? price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '---'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: color, marginTop: '10px', fontWeight: '600' }}>
                <Icon size={20} />
                {Math.abs(performance.percent).toFixed(2)}%
                <span style={{ color: '#888', fontSize: '0.8em', fontWeight: '400' }}>
                    ({performance.change > 0 ? '+' : ''}{performance.change.toFixed(2)})
                </span>
            </div>
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

    if (loading && !data) return <div style={{ padding: '20px', color: '#fff' }}>Loading market data...</div>;

    const current = data?.current || { nifty: 0, nasdaq: 0, gold: 0 };
    const weekly = data?.weekly || { nifty: { change: 0, percent: 0 }, nasdaq: { change: 0, percent: 0 }, gold: { change: 0, percent: 0 } };
    const monthly = data?.monthly || { nifty: { change: 0, percent: 0 }, nasdaq: { change: 0, percent: 0 }, gold: { change: 0, percent: 0 } };

    return (
        <div className="dashboard-container" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2em', margin: 0 }}>Market Tracker</h1>
                    <p style={{ color: '#888', margin: 0 }}>Automated Daily Tracking</p>
                </div>
                <button onClick={loadData} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw size={16} className={loading ? 'spin' : ''} /> {loading ? 'Refreshing...' : 'Refresh'}
                </button>
            </header>

            {/* Weekly Performance Section */}
            <h2 style={{ fontSize: '1.2em', marginBottom: '15px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>Weekly Performance (Last 7 Days)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                <PriceCard title="Nifty 50" price={current.nifty} performance={weekly.nifty} />
                <PriceCard title="Nasdaq 100" price={current.nasdaq} performance={weekly.nasdaq} currency="$" />
                <PriceCard title="Gold 24K (10g)" price={current.gold} performance={weekly.gold} />
            </div>

            {/* Monthly Performance Section */}
            <h2 style={{ fontSize: '1.2em', marginBottom: '15px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>Monthly Performance (Last 30 Days)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                <PriceCard title="Nifty 50" price={current.nifty} performance={monthly.nifty} />
                <PriceCard title="Nasdaq 100" price={current.nasdaq} performance={monthly.nasdaq} currency="$" />
                <PriceCard title="Gold 24K (10g)" price={current.gold} performance={monthly.gold} />
            </div>

            {/* Chart Section */}
            <section style={{ height: '400px', background: '#1e1e1e', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ marginBottom: '20px' }}>Performance Trend (Mock)</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[
                        { name: 'Mon', nifty: 21200, nasdaq: 16400 },
                        { name: 'Tue', nifty: 21350, nasdaq: 16450 },
                        { name: 'Wed', nifty: 21300, nasdaq: 16480 },
                        { name: 'Thu', nifty: 21450, nasdaq: 16500 },
                        { name: 'Fri', nifty: 21500, nasdaq: 16550 },
                    ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="name" stroke="#666" />
                        <YAxis stroke="#666" />
                        <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} />
                        <Legend />
                        <Line type="monotone" dataKey="nifty" stroke="#8884d8" name="Nifty 50" />
                        <Line type="monotone" dataKey="nasdaq" stroke="#82ca9d" name="Nasdaq 100" />
                    </LineChart>
                </ResponsiveContainer>
            </section>

        </div>
    );
};

export default Dashboard;

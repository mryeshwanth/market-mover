import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { fetchLivePrices } from '../services/api';

const Dashboard = () => {
    const [data, setData] = useState({ nifty: 0, nasdaq: 0, gold: 0 });
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        const prices = await fetchLivePrices();
        if (prices) {
            setData(prices);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    // Card Style: White Background, Black Text
    const cardStyle = {
        background: '#ffffff',
        color: '#000000',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    };

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

            {/* Price Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>

                {/* Nifty Card */}
                <div className="card" style={cardStyle}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '0.9em', textTransform: 'uppercase', letterSpacing: '1px' }}>Nifty 50</h3>
                    <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#000' }}>
                        ₹{data.nifty ? data.nifty.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '---'}
                    </div>
                    {/* Mock Trend for now until we have history comparison */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4caf50', marginTop: '10px', fontWeight: '600' }}>
                        <TrendingUp size={20} /> +0.00% <span style={{ color: '#888', fontSize: '0.8em', fontWeight: '400' }}>(Today)</span>
                    </div>
                </div>

                {/* Nasdaq Card */}
                <div className="card" style={cardStyle}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '0.9em', textTransform: 'uppercase', letterSpacing: '1px' }}>Nasdaq 100</h3>
                    <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#000' }}>
                        ${data.nasdaq ? data.nasdaq.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '---'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f44336', marginTop: '10px', fontWeight: '600' }}>
                        <TrendingDown size={20} /> -0.00% <span style={{ color: '#888', fontSize: '0.8em', fontWeight: '400' }}>(Today)</span>
                    </div>
                </div>

                {/* Gold Card */}
                <div className="card" style={cardStyle}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '0.9em', textTransform: 'uppercase', letterSpacing: '1px' }}>Gold 24K (10g)</h3>
                    <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#000' }}>
                        ₹{data.gold ? data.gold.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '---'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4caf50', marginTop: '10px', fontWeight: '600' }}>
                        <TrendingUp size={20} /> +0.00% <span style={{ color: '#888', fontSize: '0.8em', fontWeight: '400' }}>(Today)</span>
                    </div>
                </div>
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

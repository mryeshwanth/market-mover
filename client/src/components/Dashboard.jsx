import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { triggerManualCapture } from '../services/api';

const Dashboard = () => {
    const [data, setData] = useState({ nifty: 21500, nasdaq: 16500, gold: 62000 });
    const [loading, setLoading] = useState(false);

    const handleManualCapture = async (type) => {
        setLoading(true);
        try {
            const res = await triggerManualCapture(type);
            if (res.success) {
                alert('Capture triggered successfully!');
                // In real app, we would refresh data here
            }
        } catch (e) {
            console.error(e);
            alert('Failed to trigger capture');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="dashboard-container" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2em', margin: 0 }}>Market Tracker</h1>
                    <p style={{ color: '#888', margin: 0 }}>Automated Daily Tracking</p>
                </div>
                <button onClick={() => window.location.reload()} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw size={16} /> Refresh
                </button>
            </header>

            {/* Price Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>

                {/* Nifty Card */}
                <div className="card" style={{ background: '#1e1e1e', borderRadius: '12px', padding: '24px' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#aaa' }}>Nifty 50</h3>
                    <div style={{ fontSize: '2.5em', fontWeight: 'bold' }}>
                        ₹{data.nifty.toLocaleString()}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4caf50', marginTop: '10px' }}>
                        <TrendingUp size={20} /> +0.45% <span style={{ color: '#666', fontSize: '0.8em' }}>(Today)</span>
                    </div>
                </div>

                {/* Nasdaq Card */}
                <div className="card" style={{ background: '#1e1e1e', borderRadius: '12px', padding: '24px' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#aaa' }}>Nasdaq 100</h3>
                    <div style={{ fontSize: '2.5em', fontWeight: 'bold' }}>
                        ${data.nasdaq.toLocaleString()}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f44336', marginTop: '10px' }}>
                        <TrendingDown size={20} /> -0.12% <span style={{ color: '#666', fontSize: '0.8em' }}>(Today)</span>
                    </div>
                </div>

                {/* Gold Card */}
                <div className="card" style={{ background: '#1e1e1e', borderRadius: '12px', padding: '24px' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#aaa' }}>Gold 24K (10g)</h3>
                    <div style={{ fontSize: '2.5em', fontWeight: 'bold' }}>
                        ₹{data.gold.toLocaleString()}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4caf50', marginTop: '10px' }}>
                        <TrendingUp size={20} /> +0.20% <span style={{ color: '#666', fontSize: '0.8em' }}>(Today)</span>
                    </div>
                </div>
            </div>

            {/* Manual Controls (For Testing) */}
            <section style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '1.2em', marginBottom: '15px' }}>Manual Controls (Testing)</h2>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button disabled={loading} onClick={() => handleManualCapture('manual_morning')}>Test Morning Capture</button>
                    <button disabled={loading} onClick={() => handleManualCapture('manual_evening')}>Test Evening Capture</button>
                    <button disabled={loading} onClick={() => handleManualCapture('gold_daily')}>Test Gold Capture</button>
                </div>
            </section>

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

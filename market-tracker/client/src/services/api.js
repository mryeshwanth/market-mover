import axios from 'axios';

// Create axios instance
const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

export const fetchLivePrices = async () => {
    // Logic to fetch live data (mocked or real endpoint)
    // Currently checking DB captures for "current" or calling a fresh endpoint
    // Implementation depends on backend route availability.
    // For now, let's assume we have endpoints.
    try {
        // TODO: Implement /current endpoint in backend
        return {
            nifty: 0,
            nasdaq: 0,
            gold: 0
        };
    } catch (error) {
        console.error("Error fetching live prices", error);
        return null;
    }
};

export const triggerManualCapture = async (type) => {
    const response = await api.post('/test/capture', { type });
    return response.data;
};

export default api;

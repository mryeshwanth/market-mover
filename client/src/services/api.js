import axios from 'axios';

// Create axios instance
const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

export const fetchLivePrices = async () => {
    try {
        const response = await api.get('/prices/current');
        return response.data;
    } catch (error) {
        console.error("Error fetching live prices", error);
        return null;
    }
};

export default api;

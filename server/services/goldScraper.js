const axios = require('axios');

const GOLD_API_URL = process.env.GOLD_API_URL || 'https://api.indiagoldratesapi.com/rates';
const GOLD_API_KEY = process.env.GOLD_API_KEY || '';

async function scrapeGoldPrice() {
    try {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json'
        };

        // Add Authorization header if API key is provided
        if (GOLD_API_KEY) {
            headers['Authorization'] = `Bearer ${GOLD_API_KEY}`;
        }

        const response = await axios.get(GOLD_API_URL, {
            headers: headers,
            timeout: 10000 // 10 second timeout
        });

        if (response.status !== 200) {
            throw new Error(`API returned status ${response.status}`);
        }

        const data = response.data;

        // API typically returns gold_999 (24K) per 10g, so we need to divide by 10 for 1g
        // Handle different possible response formats
        let pricePer10g = null;

        if (data.gold_999) {
            pricePer10g = parseFloat(data.gold_999);
        } else if (data.gold_24k) {
            pricePer10g = parseFloat(data.gold_24k);
        } else if (data.rate) {
            pricePer10g = parseFloat(data.rate);
        } else if (data.price) {
            pricePer10g = parseFloat(data.price);
        } else if (typeof data === 'number') {
            pricePer10g = parseFloat(data);
        } else {
            // Try to find any numeric value that looks like a gold price (typically 60000-80000 for 10g)
            const values = Object.values(data).filter(v => typeof v === 'number' && v > 10000 && v < 200000);
            if (values.length > 0) {
                pricePer10g = values[0];
            }
        }

        if (!pricePer10g || isNaN(pricePer10g) || pricePer10g <= 0) {
            throw new Error(`Failed to extract gold price from API response: ${JSON.stringify(data)}`);
        }

        // Convert from per 10g to per 1g (24K)
        const pricePer1g = pricePer10g / 10;

        if (pricePer1g <= 0 || isNaN(pricePer1g)) {
            throw new Error(`Invalid price calculated: ${pricePer1g} from ${pricePer10g}`);
        }

        return {
            price: pricePer1g,
            currency: 'INR',
            timestamp: new Date()
        };

    } catch (error) {
        console.error('Error fetching gold price from API:', error.message);
        if (error.response) {
            console.error('API Response Status:', error.response.status);
            console.error('API Response Data:', error.response.data);
        }
        throw error;
    }
}

module.exports = {
    scrapeGoldPrice
};

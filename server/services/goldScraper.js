const axios = require('axios');

const GOLD_API_URL = 'https://www.goldapi.io/api/XAU/INR';
const GOLD_API_KEY = process.env.GOLD_API_KEY || 'goldapi-f2bsmjziw2sq-io';

// Constants for conversion
const OUNCE_TO_GRAM = 31.1035; // 1 troy ounce = 31.1035 grams
const MARKUP_PERCENTAGE = 8.5; // 8.5% markup for charges

async function scrapeGoldPrice() {
    try {
        console.log('Fetching gold price from goldapi.io...');
        
        const headers = {
            'x-access-token': GOLD_API_KEY,
            'Content-Type': 'application/json'
        };

        const response = await axios.get(GOLD_API_URL, {
            headers: headers,
            timeout: 10000 // 10 second timeout
        });

        if (response.status !== 200) {
            throw new Error(`API returned status ${response.status}`);
        }

        const data = response.data;

        // Log the full API response for debugging
        console.log('API Response:', JSON.stringify(data, null, 2));

        // API returns price per ounce in INR
        // Expected response format: { price: 123456.78, currency: "INR", ... }
        let pricePerOunce = null;

        if (data.price) {
            pricePerOunce = parseFloat(data.price);
        } else if (data.rate) {
            pricePerOunce = parseFloat(data.rate);
        } else if (typeof data === 'number') {
            pricePerOunce = parseFloat(data);
        } else {
            // Try to find price in response
            const priceKeys = ['price', 'rate', 'value', 'amount', 'cost'];
            for (const key of priceKeys) {
                if (data[key] && typeof data[key] === 'number') {
                    pricePerOunce = parseFloat(data[key]);
                    break;
                }
            }
        }

        if (!pricePerOunce || isNaN(pricePerOunce) || pricePerOunce <= 0) {
            throw new Error(`Failed to extract gold price from API response: ${JSON.stringify(data)}`);
        }

        // Convert from per ounce to per gram
        const pricePerGram = pricePerOunce / OUNCE_TO_GRAM;

        // Add 8.5% markup for charges
        const pricePerGramWithMarkup = pricePerGram * (1 + MARKUP_PERCENTAGE / 100);

        console.log(`✓ Successfully fetched gold price from goldapi.io`);
        console.log(`   Spot price per ounce: ₹${pricePerOunce.toFixed(2)}`);
        console.log(`   Spot price per gram: ₹${pricePerGram.toFixed(2)}`);
        console.log(`   Price per gram (with ${MARKUP_PERCENTAGE}% markup): ₹${pricePerGramWithMarkup.toFixed(2)}`);

        return {
            price: pricePerGramWithMarkup,
            currency: 'INR',
            timestamp: new Date(),
            source: 'goldapi.io',
            spotPricePerOunce: pricePerOunce,
            spotPricePerGram: pricePerGram,
            markup: MARKUP_PERCENTAGE
        };

    } catch (error) {
        console.error('Error fetching gold price from goldapi.io:', error.message);
        if (error.response) {
            console.error('API Response Status:', error.response.status);
            console.error('API Response Data:', error.response.data);
        }
        throw new Error(`Gold price fetch failed: ${error.message}`);
    }
}

module.exports = {
    scrapeGoldPrice
};

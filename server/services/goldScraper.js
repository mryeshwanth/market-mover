const axios = require('axios');
const cheerio = require('cheerio');

const GOLD_URL = process.env.GOODRETURNS_GOLD_URL || 'https://www.goodreturns.in/gold-rates/';

async function scrapeGoldPrice() {
    try {
        const response = await axios.get(GOLD_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(response.data);

        // Selector for 24K Gold per 1g - Adjust selector based on actual site structure
        // This is a common pattern, but might need adjustment if site changes
        // Usually in a table, looking for "24 Carat" and "1 Gram" or "1g"

        // Improved selector logic: Look for the table row containing "24 Carat gold" and "1 gram"
        // Note: This is an implementation guess and might need refinement against the live site

        let priceText = '';

        // Example strategy: search for specific text or class
        // Often GoodReturns has tables with classes or IDs
        // Let's assume a generic robust search

        // Finding the table that likely contains the rates
        $('.gold_silver_table').first().find('tr').each((i, row) => {
            const rowText = $(row).text().toLowerCase();
            // Look for 24 carat and 1 gram (or 1g)
            if (rowText.includes('24 carat') && (rowText.includes('1 gram') || rowText.includes('1g') || rowText.includes('per gram'))) {
                // The price is usually in the second column or last column
                priceText = $(row).find('td').eq(1).text().trim(); // Adjust index as needed
            }
        });
        
        // If not found, try alternative: sometimes 10g price is shown, we need to divide by 10
        if (!priceText) {
            $('.gold_silver_table').first().find('tr').each((i, row) => {
                const rowText = $(row).text().toLowerCase();
                if (rowText.includes('24 carat') && (rowText.includes('10 gram') || rowText.includes('10g'))) {
                    const price10g = $(row).find('td').eq(1).text().trim();
                    const price10gNum = parseFloat(price10g.replace(/[^0-9.]/g, ''));
                    if (!isNaN(price10gNum) && price10gNum > 0) {
                        // Convert 10g price to 1g price
                        priceText = (price10gNum / 10).toString();
                    }
                }
            });
        }

        if (!priceText) {
            // Fallback: Try a more specific selector if generic search fails
            // Checks for common specific elements
            const specificEl = $('#current-price-24k'); // Hypothetical ID
            if (specificEl.length) priceText = specificEl.text().trim();
        }

        // Clean the price string (remove symbols, commas)
        const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));

        if (isNaN(price) || price === 0) {
            throw new Error(`Failed to parse gold price from text: "${priceText}"`);
        }

        return {
            price: price,
            currency: 'INR',
            timestamp: new Date()
        };

    } catch (error) {
        console.error('Error scraping gold price:', error.message);
        throw error;
    }
}

module.exports = {
    scrapeGoldPrice
};

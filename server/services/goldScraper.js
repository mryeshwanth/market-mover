const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Multiple sources to try for gold prices
const GOLD_SOURCES = [
    {
        name: 'goodreturns.in',
        url: 'https://www.goodreturns.in/gold-rates/',
        selector: '.gold_silver_table tr:nth-child(2) td:nth-child(2), .gold-rate-24k, [data-gold-rate]',
        extractPrice: (text) => {
            // Extract price from text like "₹13,584" or "13584"
            const match = text.replace(/[₹,\s]/g, '').match(/(\d+)/);
            const price = match ? parseFloat(match[1]) : null;
            // If price is > 10000, it's likely per 10g, so divide by 10
            return price && price > 10000 ? price / 10 : price;
        }
    },
    {
        name: 'goldprice.org',
        url: 'https://www.goldprice.org/gold-price-india.html',
        selector: '.current-price, .gold-price, [class*="price"]',
        extractPrice: (text) => {
            // Extract price per gram (usually shown as per 10g, so divide by 10)
            const match = text.replace(/[₹,\s]/g, '').match(/(\d+)/);
            const price = match ? parseFloat(match[1]) : null;
            // If price is > 10000, it's likely per 10g, so divide by 10
            return price && price > 10000 ? price / 10 : price;
        }
    },
    {
        name: 'monex.com',
        url: 'https://www.monex.com/gold-prices/',
        selector: '.gold-price-india, .price, [data-price]',
        extractPrice: (text) => {
            const match = text.replace(/[₹,\s]/g, '').match(/(\d+)/);
            const price = match ? parseFloat(match[1]) : null;
            return price && price > 10000 ? price / 10 : price;
        }
    }
];

async function scrapeGoldPriceFromSource(source) {
    let browser = null;
    try {
        console.log(`Attempting to scrape gold price from ${source.name}...`);
        
        // Configure Puppeteer for production environments
        const launchOptions = {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--disable-extensions',
                '--disable-background-networking',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-breakpad',
                '--disable-client-side-phishing-detection',
                '--disable-default-apps',
                '--disable-features=TranslateUI',
                '--disable-hang-monitor',
                '--disable-ipc-flooding-protection',
                '--disable-popup-blocking',
                '--disable-prompt-on-repost',
                '--disable-renderer-backgrounding',
                '--disable-sync',
                '--metrics-recording-only',
                '--mute-audio',
                '--no-first-run',
                '--safebrowsing-disable-auto-update',
                '--enable-automation',
                '--password-store=basic',
                '--use-mock-keychain'
            ]
        };

        // For production environments, try to find Chrome/Chromium in common locations
        // First, try to get Chrome from Puppeteer's cache
        const puppeteerCacheDir = process.env.PUPPETEER_CACHE_DIR || 
                                   path.join(process.cwd(), 'node_modules', '.cache', 'puppeteer');
        
        // Try to find Chrome in Puppeteer's cache directory
        let puppeteerChromePath = null;
        try {
            const chromeVersionsDir = path.join(puppeteerCacheDir, 'chrome');
            if (fs.existsSync(chromeVersionsDir)) {
                const versions = fs.readdirSync(chromeVersionsDir);
                if (versions.length > 0) {
                    const latestVersion = versions.sort().reverse()[0];
                    const chromePath = path.join(chromeVersionsDir, latestVersion, 
                        process.platform === 'win32' ? 'chrome-win' : 
                        process.platform === 'darwin' ? 'chrome-mac' : 'chrome-linux',
                        process.platform === 'win32' ? 'chrome.exe' : 
                        process.platform === 'darwin' ? 'Google Chrome.app/Contents/MacOS/Google Chrome' : 'chrome');
                    if (fs.existsSync(chromePath)) {
                        puppeteerChromePath = chromePath;
                    }
                }
            }
        } catch (e) {
            // Ignore errors
        }

        const possibleChromePaths = [
            process.env.CHROME_PATH,
            process.env.PUPPETEER_EXECUTABLE_PATH,
            puppeteerChromePath,
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/snap/bin/chromium',
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : null,
            process.platform === 'win32' ? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' : null
        ].filter(Boolean);

        // Try to find an existing Chrome/Chromium executable
        for (const chromePath of possibleChromePaths) {
            try {
                if (fs.existsSync(chromePath)) {
                    launchOptions.executablePath = chromePath;
                    console.log(`Using Chrome at: ${chromePath}`);
                    break;
                }
            } catch (e) {
                // Continue to next path
            }
        }

        // If no Chrome found and we're in production, try to use puppeteer's default
        // but with better error handling
        if (!launchOptions.executablePath && process.env.NODE_ENV === 'production') {
            console.log('No system Chrome found, using Puppeteer default (will download if needed)');
        }

        browser = await puppeteer.launch(launchOptions);

        const page = await browser.newPage();
        
        // Set a realistic user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Set viewport
        await page.setViewport({ width: 1920, height: 1080 });

        // Navigate to the page with timeout
        await page.goto(source.url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Wait a bit for dynamic content to load
        await page.waitForTimeout(2000);

        // Try to find the price element
        try {
            await page.waitForSelector(source.selector, { timeout: 10000 });
        } catch (e) {
            // If selector not found, try to find any element containing gold price
            console.log(`Selector ${source.selector} not found, trying alternative approach...`);
        }

        // Extract price text - try multiple selectors
        const selectors = source.selector.split(', ').map(s => s.trim());
        let priceText = null;
        
        for (const sel of selectors) {
            try {
                priceText = await page.evaluate((selector) => {
                    const element = document.querySelector(selector);
                    if (element) {
                        return element.textContent || element.innerText;
                    }
                    return null;
                }, sel);
                if (priceText) break;
            } catch (e) {
                continue;
            }
        }

        // If no selector worked, try to find price in page text
        if (!priceText) {
            priceText = await page.evaluate(() => {
                // Try to find any element with "24k" or "gold" and a price
                const allText = document.body.innerText;
                // Look for patterns like "₹13,584" or "13584" near "24k" or "gold"
                const priceMatch = allText.match(/(?:24[Kk]|gold).*?₹?\s*(\d{1,2}[,\d]{3,})/i) ||
                                 allText.match(/₹?\s*(\d{1,2}[,\d]{3,}).*?(?:24[Kk]|gold)/i);
                if (priceMatch) {
                    return priceMatch[1];
                }
                // Try to find any number between 5000-10000 (reasonable per gram price)
                const numbers = allText.match(/\b(\d{4,5})\b/g);
                if (numbers) {
                    const validPrice = numbers.find(n => {
                        const num = parseInt(n.replace(/,/g, ''));
                        return num >= 5000 && num <= 10000;
                    });
                    if (validPrice) return validPrice;
                }
                return null;
            });
        }

        if (!priceText) {
            throw new Error(`Could not find price element on ${source.name}`);
        }

        // Extract price using the source's extractPrice function
        const pricePer1g = source.extractPrice(priceText);

        if (!pricePer1g || isNaN(pricePer1g) || pricePer1g <= 0) {
            throw new Error(`Invalid price extracted from ${source.name}: ${priceText}`);
        }

        // Validate price is reasonable (24K gold in India is typically 5000-8000 per gram)
        if (pricePer1g < 5000 || pricePer1g > 10000) {
            throw new Error(`Price out of reasonable range: ${pricePer1g} (expected 5000-10000)`);
        }

        console.log(`✓ Successfully scraped gold price from ${source.name}: ₹${pricePer1g.toFixed(2)} per gram`);
        
        await browser.close();
        browser = null;

        return {
            price: pricePer1g,
            currency: 'INR',
            timestamp: new Date(),
            source: source.name
        };

    } catch (error) {
        if (browser) {
            await browser.close();
        }
        console.error(`✗ Failed to scrape from ${source.name}:`, error.message);
        throw error;
    }
}

async function scrapeGoldPrice() {
    const errors = [];
    
    // Try each source in order
    for (const source of GOLD_SOURCES) {
        try {
            const result = await scrapeGoldPriceFromSource(source);
            return result;
        } catch (error) {
            errors.push(`${source.name}: ${error.message}`);
            // Continue to next source
            continue;
        }
    }

    // If all sources failed, throw error with all error messages
    throw new Error(`All gold price sources failed:\n${errors.join('\n')}`);
}

module.exports = {
    scrapeGoldPrice
};

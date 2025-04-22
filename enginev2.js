// tweet_scraper_console.js
const puppeteer = require('puppeteer');
const UserAgent = require('user-agents');

// Utility sleep function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry logic with exponential backoff
async function scrapePageWithRetry(page, url, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Attempt ${attempt}: Loading ${url}`);
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

            const data = await page.evaluate(() => {
                const tweets = Array.from(document.querySelectorAll('.timeline .timeline-item'));
                return tweets.map(tweet => {
                    const description = tweet.querySelector('.tweet-content.media-body')?.innerText.trim() || '';
                    return { description };
                }).filter(item => item.description); // Remove empty ones
            });

            return data;
        } catch (err) {
            console.error(`❌ Attempt ${attempt} failed: ${err.message}`);
            if (attempt === maxRetries) {
                console.error(`❌ Skipping ${url} after ${maxRetries} attempts.`);
                return [];
            }
            const delay = 2000 * attempt;
            console.log(`⏳ Retrying in ${delay}ms...`);
            await sleep(delay);
        }
    }
}

const executeTask = async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox']
    });

    const page = await browser.newPage();

    // Random User-Agent
    const ua = new UserAgent();
    await page.setUserAgent(ua.toString());

    // Bypass CSP
    await page.setBypassCSP(true);

    // Block unnecessary resources
    await page.setRequestInterception(true);
    page.on('request', req => {
        const type = req.resourceType();
        if (['image', 'stylesheet', 'font'].includes(type)) {
            req.abort();
        } else {
            req.continue();
        }
    });

    const url = 'https://nitter.net/HamdanMohammed';
    const tweets = await scrapePageWithRetry(page, url);

    await browser.close();

    // Output as JSON to console
    console.log(JSON.stringify(tweets, null, 2));
};

executeTask();

// Import Puppeteer
const puppeteer = require('puppeteer');
const path = require('path');
const UserAgent = require('user-agents');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Documented Records by province
//https://www.canada411.ca/search/si-alph/${pageNum}/-/Alberta/
//https://www.canada411.ca/search/si-alph/${pageNum}/-/Columbia/
//https://www.canada411.ca/search/si-alph/${pageNum}/-/Canada/
//https://www.canada411.ca/search/si-alph/${pageNum}/-/Manitoba/
//https://www.canada411.ca/search/si-alph/${pageNum}/-/Brunswick/
//https://www.canada411.ca/search/si-alph/${pageNum}/-/Newfoundland/
//https://www.canada411.ca/search/si-alph/${pageNum}/-/Labrador/
//https://www.canada411.ca/search/si-alph/${pageNum}/-/Nova+Scotia/
//https://www.canada411.ca/search/si-alph/${pageNum}/-/Scotia/
//https://www.canada411.ca/search/si-alph/${pageNum}/-/Nunavut/
//https://www.canada411.ca/search/si-alph/${pageNum}/-/Ontario/
//https://www.canada411.ca/search/si-alph/${pageNum}/-/Prince+Edward/
//https://www.canada411.ca/search/si-alph/${pageNum}/-/Saskatchewan/
//https://www.canada411.ca/search/si-alph/${pageNum}/-/Yukon/

// Documented by cardinal points
//https://www.canada411.ca/search/si-alph/${pageNum}/-/Northwest/
//https://www.canada411.ca/search/si-alph/${pageNum}/-/Southwest/
//https://www.canada411.ca/search/si-alph/${pageNum}/-/Southeast/
//https://www.canada411.ca/search/si-alph/${pageNum}/-/Northeast/

//Documented by cities
//https://www.canada411.ca/search/si-alph/${pageNum}/A/Vancouver+BC/
//https://www.canada411.ca/search/si/${pageNum}/A/Montreal+QC/
//https://www.canada411.ca/search/si-alph/${pageNum}/B/Montreal+QC/
//https://www.canada411.ca/search/si-alph/${pageNum}/C/Montreal+QC/
//https://www.canada411.ca/search/si-alph/${pageNum}/D/Montreal+QC/
//https://www.canada411.ca/search/si-alph/${pageNum}/E/Montreal+QC/
//https://www.canada411.ca/search/si-alph/${pageNum}/F/Montreal+QC/
//https://www.canada411.ca/search/si-alph/${pageNum}/K/Montreal+QC/
//https://www.canada411.ca/search/si-alph/${pageNum}/-/Beaver+Creek/

// Utility functions
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
                const listings = Array.from(document.querySelectorAll('.c411Listing'));
                return listings.map(listing => {
                    const name = listing.querySelector('.c411ListedName')?.innerText.trim() || '';
                    const address = listing.querySelector('.c411ListingGeo .adr')?.innerText.trim() || '';
                    const phone = listing.querySelector('.c411Phone')?.innerText.trim() || '';
                    return { name, address, phone };
                });
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
        args: ['--no-sandbox'],
    });

    const page = await browser.newPage();

    // Apply random User-Agent
    const ua = new UserAgent();
    await page.setUserAgent(ua.toString());

    // Bypass CSP
    await page.setBypassCSP(true);

    // Block images, styles, fonts
    await page.setRequestInterception(true);
    page.on('request', req => {
        const type = req.resourceType();
        if (['image', 'stylesheet', 'font'].includes(type) || req.url().includes('sharethrough.com')) {
            req.abort();
        } else {
            req.continue();
        }
    });

    const results = [];
    const TOTAL_PAGES = 59;

    for (let pageNum = 1; pageNum <= TOTAL_PAGES; pageNum++) {
        const url = `https://www.canada411.ca/search/si-alph/${pageNum}/L/Montreal+QC/`;
        console.log(`\n🔎 Scraping page (${pageNum}/${TOTAL_PAGES}) → ${url}`);

        const data = await scrapePageWithRetry(page, url);
        results.push(...data);
        console.log(`✅ Extracted ${data.length} entries.`);

        await sleep(5 + Math.random() * 5); // Light delay between pages
    }

    await browser.close();

    // Save results to CSV
    const csvPath = path.resolve(__dirname, 'K_Montreal_QC.csv');
    const csvWriter = createCsvWriter({
        path: csvPath,
        header: [
            { id: 'name', title: 'Name' },
            { id: 'address', title: 'Address' },
            { id: 'phone', title: 'Phone' }
        ]
    });

    await csvWriter.writeRecords(results);
    console.log(`\n✅ Done! ${results.length} total entries saved to: ${csvPath}`);
};

executeTask();


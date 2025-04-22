// Import Puppeteer and filesystem
const puppeteer = require('puppeteer');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;


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

      // Extract listings
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

(async () => {
  // Launch browser
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  // Bypass CSP and block unnecessary resources
  await page.setBypassCSP(true);
  await page.setRequestInterception(true);
  page.on('request', req => {
    const type = req.resourceType();
    if (['image', 'stylesheet', 'font'].includes(type)) req.abort();
    else req.continue();
  });

  const letters = ['F','G'];
  const resultsByLetter = {};

  for (const letter of letters) {
    console.log(`\n🔍 Starting letter: ${letter}`);
    let pageNum = 1;
    const results = [];

    while (true) {
      const url = `https://www.canada411.ca/search/si-alph/${pageNum}/${letter}/Mayo+YT`;
      console.log(`Scraping ${url}`);

      const data = await scrapePageWithRetry(page, url);
      if (!data.length) {
        console.log(`No more results for ${letter} at page ${pageNum}. Moving to next letter.`);
        break;
      }

      results.push(...data);
      console.log(`✅ ${data.length} entries added for letter ${letter} page ${pageNum}`);

      pageNum += 1;
      await sleep(3000 + Math.random() * 2000);
    }

    resultsByLetter[letter] = results;

    // Save results to CSV
        const csvPath = path.resolve(__dirname, `./${letter}_Montreal_QC_results.csv`);
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
  }

  await browser.close();

  // Write out a JSON file mapping each letter to its results

  console.log('All done! Results saved');
})();

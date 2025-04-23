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

  // const letters = ['H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
  const letters = ['k','ka','ke','ki','ko','ku','kab','kac','kaca','kace','kaci','kaco','kacu','kad','kada','kade','kadi','kado','kadu','kae','kaea','kaee','kaei','kaeo','kaeu','kab','kaba','kabe','kabi','kabo','kabu','kac','kaca','kace','kaci','kaco','kacu','kad','kada','kade','kadi','kado','kadu','kae','kaea','kaee','kaei','kaeo','kaeu','kaf','kafa','kafe','kafi','kafo','kafu','kag','kaga','kage','kagi','kago','kagu','kah','kaha','kahe','kahi','kaho','kahu','kai','kaia','kaie','kaii','kaio','kaiu','kaj','kaja','kaje','kaji','kajo','kaju','kak','kaka','kake','kaki','kako','kaku','kal','kala','kale','kali','kalo','kalu','kam','kama','kame','kami','kamo','kamu','kan','kana','kane','kani','kano','kanu','kao','kaoa','kaoe','kaoi','kaoo','kaou','kap','kapa','kape','kapi','kapo','kapu','kaq','kaqa','kaqe','kaqi','kaqo','kaqu','kar','kara','kare','kari','karo','karu','kas','kasa','kase','kasi','kaso','kasu','kat','kata','kate','kati','kato','katu','kau','kaua','kaue','kaui','kauo','kauu','kav','kava','kave','kavi','kavo','kavu','kaw','kawa','kawe','kawi','kawo','kawu','kax','kaxa','kaxe','kaxi','kaxo','kaxu','kay','kaya','kaye','kayi','kayo','kayu','kaz','kaza','kaze','kazi','kazo','kazu',
                  'l','la','le','li','lo','lu','lab','lac','laca','lace','laci','laco','lacu','lad','lada','lade','ladi','lado','ladu','lae','laea','laee','laei','laeo','laeu','lab','laba','labe','labi','labo','labu','lac','laca','lace','laci','laco','lacu','lad','lada','lade','ladi','lado','ladu','lae','laea','laee','laei','laeo','laeu','laf','lafa','lafe','lafi','lafo','lafu','lag','laga','lage','lagi','lago','lagu','lah','laha','lahe','lahi','laho','lahu','lai','laia','laie','lalii','laio','laiu','laj','laja','laje','laji','lajo','laju','lal','lala','lale','lali','lalo','lalu','lam','lama','lame','lami','lamo','lamu','lan','lana','lane','lani','lano','lanu','lao','laoa','laoe','laoi','laoo','laou','lap','lapa','lape','lapi','lapo','lapu','laq','laqa','laqe','laqi','laqo','laqu','lar','lara','lare','lari','laro','laru','las','lasa','lase','lasi','laso','lasu','lat','lata','late','lati','lato','latu','lau','laua','laue','laui','lauo','lauu','lav','lava','lave','lavi','lavo','lavu','law','lawa','lawe','lawi','lawo','lawu','lax','laxa','laxe','laxi','laxo','laxu','lay','laya','laye','layi','layo','layu','laz','laza','laze','lazi','lazo','lazu',
                  'n','na','ne','ni','no','nu','nab','nac','naca','nace','naci','naco','nacu','nad','nada','nade','nadi','nado','nadu','nae','naea','naee','naei','naeo','naeu','nab','naba','nabe','nabi','nabo','nabu','nac','naca','nace','naci','naco','nacu','nad','nada','nade','nadi','nado','nadu','nae','naea','naee','naei','naeo','naeu','naf','nafa','nafe','nafi','nafo','nafu','nag','naga','nage','nagi','nago','nagu','nah','naha','nahe','nahi','naho','nahu','nai','naia','naie','naii','naio','nain','naj','naja','naje','naji','najo','naju','nan','nana','nane','nani','nano','nanu','nal','nala','nale','nali','nalo','nalu','nam','nama','name','nami','namo','namu','nan','nana','nane','nani','nano','nanu','nao','naoa','naoe','naoi','naoo','naou','nap','napa','nape','napi','napo','napu','naq','naqa','naqe','naqi','naqo','naqu','nar','nara','nare','nari','naro','naru','nas','nasa','nase','nasi','naso','nasu','nat','nata','nate','nati','nato','natu','nau','naua','naue','naui','nauo','nauu','nav','nava','nave','navi','navo','navu','naw','nawa','nawe','nawi','nawo','nawu','nax','naxa','naxe','naxi','naxo','naxu','nay','naya','naye','nayi','nayo','nayu','naz','naza','naze','nazi','nazo','nazu',
                  'p','pa','pe','pi','po','pu','pab','pac','paca','pace','paci','paco','pacu','pad','pada','pade','padi','pado','padu','pae','paea','paee','paei','paeo','paeu','pab','paba','pabe','pabi','pabo','pabu','pac','paca','pace','paci','paco','pacu','pad','pada','pade','padi','pado','padu','pae','paea','paee','paei','paeo','paeu','paf','pafa','pafe','pafi','pafo','pafu','pag','paga','page','pagi','pago','pagu','pah','paha','pahe','pahi','paho','pahu','pai','paia','paie','paii','paio','paiu','paj','paja','paje','paji','pajo','paju','pap','papa','pape','papi','papo','papu','pal','pala','pale','pali','palo','palu','pam','pama','pame','pami','pamo','pamu','pan','pana','pane','pani','pano','panu','pao','paoa','paoe','paoi','paoo','paou','pap','papa','pape','papi','papo','papu','paq','paqa','paqe','paqi','paqo','paqu','par','para','pare','pari','paro','paru','pas','pasa','pase','pasi','paso','pasu','pat','pata','pate','pati','pato','patu','pau','paua','paue','paui','pauo','pauu','pav','pava','pave','pavi','pavo','pavu','paw','pawa','pawe','pawi','pawo','pawu','pax','paxa','paxe','paxi','paxo','paxu','pay','paya','paye','payi','payo','payu','paz','paza','paze','pazi','pazo','pazu'
  ];
  const resultsByLetter = {};

  for (const letter of letters) {
    console.log(`\n🔍 Starting letter: ${letter}`);
    let pageNum = 1;
    const results = [];

    while (true) {
      const url = `https://www.canada411.ca/search/si-alph/${pageNum}/${letter}/Calgary+AB/`;
      console.log(`Scraping ${url}`);

      const data = await scrapePageWithRetry(page, url);
      if (!data.length) {
        console.log(`No more results for ${letter} at page ${pageNum}. Moving to next letter.`);
        break;
      }

      try {
        await page.waitForSelector('.ypalert.ypalert--warning', { timeout: 5000 });

        const warningText = await page.$eval('.ypalert.ypalert--warning', el => el.innerText.trim());
        console.log('⚠️ Warning found:', warningText);
        const re = new RegExp("We didn't find any residential listings, but we found business listings matching");
        if (re.test(warningText)) {
          break;
        }
      } catch (e) {
        console.log('✅ No warnings.');
      }


      results.push(...data);
      console.log(`✅ ${data.length} entries added for letter ${letter} page ${pageNum}`);

      pageNum += 1;
      await sleep(1000 + Math.random() * 5);
    }

    resultsByLetter[letter] = results;

    // Save results to CSV
    const csvPath = path.resolve(__dirname, `./${letter}_Calgary_AB_entries_${results.length}.csv`);
    const csvWriter = createCsvWriter({
      path: csvPath,
      header: [
        { id: 'name', title: 'Name' },
        { id: 'address', title: 'Address' },
        { id: 'phone', title: 'Phone' }
      ]
    });

    await csvWriter.writeRecords(results);
    console.log(`\n✅ Done! ${results.length} total entries saved`);
  }

  await browser.close();

  // Write out a JSON file mapping each letter to its results

  console.log('All done! Results saved');
})();
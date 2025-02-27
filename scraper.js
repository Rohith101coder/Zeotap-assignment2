const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

// URLs of documentation
const urls = {
    segment: "https://segment.com/docs/connections/sources/catalog/",
    mparticle: "https://docs.mparticle.com/developers/sdk/",
    lytics: "https://docs.lytics.com/",
    zeotap: "https://docs.zeotap.com/home/en-us/"
};

// Directory for storing scraped data
const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// Rotate User-Agent to avoid blocks
const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.96 Safari/537.36"
];

const getRandomUserAgent = () => userAgents[Math.floor(Math.random() * userAgents.length)];

/**
 * Scrapes documentation using Axios + Cheerio
 */
async function scrapeDocumentation(platform, url) {
    try {
        const response = await axios.get(url, {
            headers: { "User-Agent": getRandomUserAgent() }
        });

        console.log(`✅ Successfully fetched ${platform}: ${response.status}`);
        console.log(`🔹 URL: ${url}`);

        const $ = cheerio.load(response.data);
        let content = [];

        $("h2, h3, p").each((_, element) => {
            const text = $(element).text().trim();
            if (text) content.push(text);
        });

        fs.writeFileSync(path.join(DATA_DIR, `${platform}.json`), JSON.stringify(content, null, 2));
        console.log(`✅ Data scraped for ${platform}`);
    } catch (error) {
        console.error(`❌ Error scraping ${platform}:`, error.response?.status || "Unknown", error.message);
        if (error.response) console.error("Response Headers:", error.response.headers);
    }
}

/**
 * Scrapes JavaScript-rendered pages using Puppeteer
 */
async function scrapeWithPuppeteer(platform, url) {
    console.log(`🚀 Launching Puppeteer for ${platform}...`);

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent(getRandomUserAgent());

    await page.goto(url, { waitUntil: "networkidle2" });

    const content = await page.evaluate(() => {
        return document.body.innerText; // Extracts all readable text
    });

    fs.writeFileSync(path.join(DATA_DIR, `${platform}.json`), JSON.stringify(content, null, 2));
    console.log(`✅ Puppeteer scraped data for ${platform}`);

    await browser.close();
}

/**
 * Run scraping for all platforms
 */
async function scrapeAll() {
    for (const [platform, url] of Object.entries(urls)) {
        if (platform === "segment") {
            await scrapeWithPuppeteer(platform, url);  // Use Puppeteer for Segment
        } else {
            await scrapeDocumentation(platform, url);  // Use Axios for others
        }
    }
}

// Export the function for use in `server.js`
module.exports = { scrapeAll, scrapeDocumentation };

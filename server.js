require("dotenv").config(); // Load environment variables
const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { scrapeAll } = require("./scraper");

const app = express();
app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, "data");

// Load data from JSON files
const loadData = (platform) => {
    try {
      const filePath = path.join(DATA_DIR, `${platform}.json`);
      
      if (!fs.existsSync(filePath)) {
        console.error(`🚨 Error: File not found for ${platform}`);
        return [];
      }
  
      const data = fs.readFileSync(filePath, "utf-8");
  
      if (!data) {
        console.error(`🚨 Error: File is empty for ${platform}`);
        return [];
      }
  
      const parsedData = JSON.parse(data);
  
      console.log(`🔍 Full JSON for ${platform}:`, parsedData);
  
      // If it's an object, extract the correct field
      if (Array.isArray(parsedData)) {
        return parsedData; // ✅ Already an array
      } else if (parsedData && typeof parsedData === "object") {
        return Object.values(parsedData).flat(); // ✅ Extract all values and flatten to an array
      }
  
      console.error(`🚨 Unexpected JSON structure for ${platform}:`, parsedData);
      return [];
  
    } catch (error) {
      console.error(`🚨 JSON Parsing Error for ${platform}:`, error.message);
      return [];
    }
  };
  

// Search function
const searchDocumentation = (query) => {
    const platforms = ["segment", "mparticle", "lytics", "zeotap"];
    let results = [];
  
    platforms.forEach((platform) => {
      const docs = loadData(platform);
      
      // Debugging logs
      console.log(`📌 Checking platform: ${platform}`);
      console.log("📜 Loaded docs type:", typeof docs);
      console.log("📜 Loaded docs:", docs);
  
      if (!Array.isArray(docs)) {
        console.error(`❌ Error: Expected an array but got ${typeof docs} for ${platform}`);
        return;
      }
  
      const matched = docs.filter((text) => text.toLowerCase().includes(query.toLowerCase()));
  
      if (matched.length > 0) {
        results.push({ platform, matched });
      }
    });
  
    return results;
  };
  

// API Endpoint for Searching Documentation
app.get("/search", (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Query parameter is required." });

  const results = searchDocumentation(query);
  res.json(results.length > 0 ? results : { message: "No relevant information found." });
});

// Fetch documentation using Axios
async function fetchSegmentDocsWithAxios() {
  try {
    const response = await axios.get("https://segment.com/docs/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
      }
    });

    const $ = cheerio.load(response.data);
    const title = $("h1").text().trim();
    console.log("Segment Docs Title (Axios):", title || "No title found");

  } catch (error) {
    console.error("Error fetching Segment docs (Axios):", error.response?.status, error.message);
  }
}

// Fetch documentation using Puppeteer
async function fetchSegmentDocsWithPuppeteer() {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    );

    await page.goto("https://segment.com/docs/", { waitUntil: "networkidle2" });

    const content = await page.content();
    const $ = cheerio.load(content);
    const title = $("h1").text().trim();
    
    console.log("Segment Docs Title (Puppeteer):", title || "No title found");

  } catch (error) {
    console.error("Error fetching Segment docs (Puppeteer):", error.message);
  } finally {
    if (browser) await browser.close();
  }
}

// Run scrapers on startup
fetchSegmentDocsWithAxios();
fetchSegmentDocsWithPuppeteer();
scrapeAll();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

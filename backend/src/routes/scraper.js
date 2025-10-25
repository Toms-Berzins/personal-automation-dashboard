import express from 'express';
import {
  searchProducts,
  scrapeUrl,
  searchAndScrape,
  getPriceHistory,
  getLatestPrices
} from '../controllers/scraperController.js';

const router = express.Router();

// Search for products
router.post('/search', searchProducts);

// Scrape a specific URL
router.post('/scrape', scrapeUrl);

// Smart Search & Scrape - One-click solution
router.post('/search-and-scrape', searchAndScrape);

// Get price history for a product
router.get('/history', getPriceHistory);

// Get latest prices for all products
router.get('/prices/latest', getLatestPrices);

export default router;

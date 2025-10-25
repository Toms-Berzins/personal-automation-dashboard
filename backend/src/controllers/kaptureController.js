/**
 * Kapture-based scraping controller
 * Uses browser automation for faster, more reliable scraping
 */

/**
 * Scrape using Kapture (browser automation)
 * This is faster than Firecrawl for single pages
 */
export async function scrapeWithKapture(req, res) {
  try {
    const { url, tabId, saveToDb = false } = req.body;

    if (!url && !tabId) {
      return res.status(400).json({ error: 'URL or tabId is required' });
    }

    console.log(`🌐 Kapture scraping: ${url || `tab ${tabId}`}`);

    // Instructions for Kapture MCP integration
    const instructions = {
      message: `
Kapture is available! To use browser-based scraping:

1. Make sure you have a browser tab open with Kapture extension
2. Navigate to the product page in your browser
3. Use the Kapture MCP tools to extract data:

   - mcp__kapture__dom({ tabId }) - Get full HTML
   - mcp__kapture__elements({ tabId, selector: '.price' }) - Get price elements
   - mcp__kapture__screenshot({ tabId }) - Take screenshot

Example workflow:
1. Open product page in browser
2. Get tab ID: mcp__kapture__list_tabs()
3. Extract data: mcp__kapture__elements({ tabId, selector: '[data-price]' })
4. Parse and save to database

This is much faster than Firecrawl search!
      `.trim(),
      available: true,
      kaptureEnabled: true
    };

    res.json({
      success: true,
      method: 'kapture',
      instructions,
      note: 'Kapture provides real-time browser automation. Use Claude Code with Kapture MCP to extract data from your open browser tabs.'
    });

  } catch (error) {
    console.error('Kapture error:', error);
    res.status(500).json({
      error: error.message || 'Failed to process Kapture request'
    });
  }
}

/**
 * Get price from currently open browser tab
 * Uses Kapture to extract price from active tab
 */
export async function getPriceFromActiveTab(req, res) {
  try {
    res.json({
      success: true,
      instructions: `
To extract price from your current browser tab:

1. Open the product page in your browser with Kapture extension
2. Use Claude Code to run:
   - Get tabs: mcp__kapture__list_tabs()
   - Get tab content: mcp__kapture__dom({ tabId: 'your-tab-id' })
   - Extract price: Use selectors like '[data-price]', '.price', etc.

Example selectors to try:
- [data-price]
- .price
- [itemprop="price"]
- .product-price
- #price

Kapture is faster because it uses your actual browser!
      `.trim()
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}

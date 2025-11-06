/**
 * Product Normalization Utility
 *
 * Handles standardization of product names and specifications
 * to enable matching across different retailers.
 */

/**
 * Normalize product name for matching
 * @param {string} productName - Original product name
 * @param {Object} specifications - Product specifications
 * @returns {string} Normalized name
 */
function normalizeProductName(productName, specifications = {}) {
  // Strategy: Use the actual product name with some normalization
  // This preserves uniqueness while still allowing similar products to match

  let normalized = productName.toLowerCase()
    .trim()
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    // Remove common prefixes/suffixes that don't affect identity
    .replace(/^(premium|standarts?|kokskaidu|wood pellets?)\s+/gi, '')
    .replace(/\s+(premium|standarts?|a1|din\+?)$/gi, '')
    // Normalize separators
    .replace(/[-_]/g, ' ')
    // Remove special characters but keep letters, numbers, spaces
    .replace(/[^\w\s]/g, '');

  // Extract key identifiers
  const weight = extractWeight(productName, specifications);
  const packaging = extractPackaging(productName);

  // Only append weight/packaging if they were found (not "unknown")
  if (weight !== 'unknown') {
    normalized += ` ${weight}`;
  }

  if (packaging !== 'unknown' && packaging !== 'bags') {
    // Don't append "bags" as it's too common
    normalized += ` ${packaging}`;
  }

  return normalized.trim().replace(/\s+/g, '_');
}

/**
 * Extract weight from product name or specifications
 * @param {string} productName - Product name
 * @param {Object} specifications - Product specifications
 * @returns {string} Normalized weight (e.g., "15kg", "975kg")
 */
function extractWeight(productName, specifications) {
  // Priority 1: Check specifications.weight
  if (specifications && specifications.weight) {
    return normalizeWeight(specifications.weight);
  }

  // Priority 2: Extract from product name
  const weightPatterns = [
    /(\d+)\s*kg/i,
    /(\d+)\s*kilogram/i,
    /(\d+)\s*ton/i,
  ];

  for (const pattern of weightPatterns) {
    const match = productName.match(pattern);
    if (match) {
      const value = parseInt(match[1], 10);
      return `${value}kg`;
    }
  }

  // Default: unknown
  return 'unknown';
}

/**
 * Normalize weight string to standard format
 * @param {string} weight - Weight string (e.g., "15 kg", "1 ton")
 * @returns {string} Normalized weight (e.g., "15kg", "1000kg")
 */
function normalizeWeight(weight) {
  const weightStr = weight.toString().toLowerCase().replace(/\s+/g, '');

  // Extract number and unit
  const match = weightStr.match(/(\d+(?:\.\d+)?)(kg|kilogram|ton|tonne|t)?/);

  if (!match) return 'unknown';

  const value = parseFloat(match[1]);
  const unit = match[2] || 'kg';

  // Convert to kg
  if (unit === 'ton' || unit === 'tonne' || unit === 't') {
    return `${value * 1000}kg`;
  }

  return `${value}kg`;
}

/**
 * Extract packaging type from product name
 * @param {string} productName - Product name
 * @returns {string} Packaging type (bags, bulk, bigbag, pallets)
 */
function extractPackaging(productName) {
  const nameLower = productName.toLowerCase();

  if (nameLower.includes('maiso') || nameLower.includes('bag') || nameLower.includes('maisu')) {
    return 'bags';
  }

  if (nameLower.includes('big bag') || nameLower.includes('bigbag')) {
    return 'bigbag';
  }

  if (nameLower.includes('pallet') || nameLower.includes('palete')) {
    return 'pallets';
  }

  if (nameLower.includes('bulk') || nameLower.includes('beramā')) {
    return 'bulk';
  }

  // Default
  return 'unknown';
}

/**
 * Extract specifications from scraped data
 * @param {Object} scrapedData - Raw scraped data
 * @returns {Object} Structured specifications
 */
function extractSpecifications(scrapedData) {
  const specs = scrapedData.specifications || {};

  // Extract additional info from description if available
  if (scrapedData.description) {
    const description = scrapedData.description.toLowerCase();

    // Extract diameter
    const diameterMatch = description.match(/(\d+)\s*mm/);
    if (diameterMatch && !specs.diameter) {
      specs.diameter = `${diameterMatch[1]} mm`;
    }

    // Extract type
    if (!specs.type) {
      if (description.includes('kokskaidu') || description.includes('wood')) {
        specs.type = 'kokskaidu granulas';
      }
    }
  }

  // Ensure weight is included
  if (scrapedData.product_name && !specs.weight) {
    const weight = extractWeight(scrapedData.product_name, {});
    if (weight !== 'unknown') {
      specs.weight = weight;
    }
  }

  return specs;
}

/**
 * Validate scraped data before insertion
 * @param {Object} data - Scraped data
 * @returns {Object} Validation result { valid: boolean, errors: Array }
 */
function validateScrapedData(data) {
  const errors = [];

  // Required fields
  if (!data.product_name || data.product_name.trim() === '') {
    errors.push('product_name is required');
  }

  if (!data.brand || data.brand.trim() === '') {
    errors.push('brand is required');
  }

  if (typeof data.price !== 'number' || data.price <= 0) {
    errors.push('price must be a positive number');
  }

  if (!data.currency || !['EUR', 'USD', 'GBP'].includes(data.currency)) {
    errors.push('currency must be EUR, USD, or GBP');
  }

  if (typeof data.in_stock !== 'boolean') {
    errors.push('in_stock must be a boolean');
  }

  // Optional fields validation
  if (data.url && !data.url.startsWith('http')) {
    errors.push('url must be a valid HTTP/HTTPS URL');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate similarity between two product names (simple Levenshtein-based)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score (0-1, 1 = identical)
 */
function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) {
    return 1.0;
  }

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Edit distance
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Convert currency symbol to ISO code
 * @param {string} currency - Currency symbol or code
 * @returns {string} ISO currency code (EUR, USD, GBP)
 */
function normalizeCurrency(currency) {
  if (!currency) return 'EUR';

  const currencyStr = currency.toString().trim();

  // Currency symbol mapping
  const symbolMap = {
    '€': 'EUR',
    '$': 'USD',
    '£': 'GBP',
    '¥': 'JPY',
    'EUR': 'EUR',
    'USD': 'USD',
    'GBP': 'GBP',
  };

  // Check for exact match (case-insensitive for codes)
  const upperCurrency = currencyStr.toUpperCase();
  if (symbolMap[upperCurrency]) {
    return symbolMap[upperCurrency];
  }

  // Check for symbol
  if (symbolMap[currencyStr]) {
    return symbolMap[currencyStr];
  }

  // Default to EUR for unknown currencies
  return 'EUR';
}

/**
 * Clean and standardize scraped data
 * @param {Object} scrapedData - Raw scraped data
 * @returns {Object} Cleaned data ready for insertion
 */
function cleanScrapedData(scrapedData) {
  return {
    product_name: scrapedData.product_name?.trim() || '',
    brand: scrapedData.brand?.trim() || '',
    price: parseFloat(scrapedData.price) || 0,
    currency: normalizeCurrency(scrapedData.currency),
    in_stock: Boolean(scrapedData.in_stock),
    url: scrapedData.url || '',
    description: scrapedData.description?.trim() || '',
    specifications: extractSpecifications(scrapedData),
  };
}

export {
  normalizeProductName,
  extractWeight,
  normalizeWeight,
  extractPackaging,
  extractSpecifications,
  validateScrapedData,
  calculateSimilarity,
  cleanScrapedData,
  normalizeCurrency,
};

export default {
  normalizeProductName,
  extractWeight,
  normalizeWeight,
  extractPackaging,
  extractSpecifications,
  validateScrapedData,
  calculateSimilarity,
  cleanScrapedData,
  normalizeCurrency,
};

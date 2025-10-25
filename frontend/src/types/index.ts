export interface ProductData {
  product_name: string;
  price: number;
  currency: string;
  brand?: string;
  in_stock: boolean;
  description?: string;
  specifications?: Record<string, any>;
}

export interface ScrapeResult {
  success: boolean;
  data?: {
    products: ProductData[];
    count: number;
  };
  url: string;
  timestamp: string;
  saved: boolean;
  savedCount?: number;
  error?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  description?: string;
}

export interface PriceHistoryItem {
  id: number;
  timestamp: string;
  product_name: string;
  price: number;
  currency: string;
  brand?: string;
  url: string;
  in_stock: boolean;
}

export interface ScrapeRequest {
  url: string;
  saveToDb: boolean;
}

export interface SearchRequest {
  query: string;
  limit: number;
}

export type ScraperMode = 'search' | 'scrape';

export interface ScraperState {
  mode: ScraperMode;
  loading: boolean;
  error: string | null;
  searchResults: SearchResult[];
  scrapeResult: ScrapeResult | null;
}

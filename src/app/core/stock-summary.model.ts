/** Mirrors the backend's StockSummary DTO (GET /api/stocks/search, GET /api/favorites). */
export interface StockSummary {
  stockId: string;
  stockName: string;
  industryCategory: string | null;
}

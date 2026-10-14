export interface FavoriteStockUpdateRow {
  stockId: string;
  stockName: string;
  latestPrice: number | null;
  targetPrice: number | null;
  targetPriceLabel: string | null;
  gapRatio: number | null;
  latestDataQuarter: string | null;
  investmentStrategy: string | null;
  errorMessage: string | null;
}

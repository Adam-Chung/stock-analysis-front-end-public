/** View model for the SA-01 「股票目標價」screen. Mirrors prototype/target-price-prototype.html. */

export interface TargetPriceTier {
  /** 1~6, matches SA-01「目標價選擇」options (1便宜價..6爆炸貴). */
  n: number;
  label: string;
  value: number;
}

/**
 * Everything the screen needs, as it would come back from the backend GET endpoint (SA-01 3.2/3.3
 * read-only fields + settings). Field names mirror DB-01 where there's a 1:1 mapping.
 */
export interface TargetPriceData {
  stockId: string;
  stockName: string;
  industryCategory: string | null;

  currentPrice: number;
  low10: number;
  high10: number;
  tenYearAvgYield: number;
  dividendDate: string;
  lastUpdated: string;

  tiers: TargetPriceTier[];
  reasonablePriceIndex: number;

  investmentStrategy: string;
  epsAvgYears: 0 | 3 | 5 | 10;
  bpsAvgYears: 0 | 3 | 5 | 10;
  settingNote: string;
  targetPriceLevel: number;

  frontYear: number; // 前目標價出現 (server-computed, kept for API completeness - the screen
  // recomputes this itself from yearlyLowPrices so it updates instantly when 目標價選擇 changes)
  aiSuggestion: AiSuggestion | null;

  /**
   * 依年份新到舊排序的年度最低價，含當年度（若有即時最低價）——供畫面在使用者改變
   * 「目標價選擇」時，不必重新呼叫後端即可即時重算「前目標價出現」。
   */
  yearlyLowPrices: YearlyLowPrice[];
}

export interface YearlyLowPrice {
  year: number;
  lowPrice: number;
}

export interface AiSuggestion {
  text: string;
  updatedAt: string | null;
}

export interface TargetPriceSettings {
  investmentStrategy: string;
  epsAvgYears: 0 | 3 | 5 | 10;
  bpsAvgYears: 0 | 3 | 5 | 10;
  settingNote: string;
  targetPriceLevel: number;
}

export interface WeeklyPriceCandle {
  weekStart: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

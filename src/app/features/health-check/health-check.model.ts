/** View model for the SA-03「企業體質檢視」screen. Mirrors backend HealthCheckResponse (TASK-028). */

export type HealthCheckTemplate = 'GENERAL' | 'BANK';
export type HealthCheckEvalType = 'BOOLEAN' | 'GREATER_THAN' | 'LESS_THAN' | 'JUDGMENT';
export type HealthCheckStatus = 'PASS' | 'FAIL' | 'JUDGMENT' | 'NA';

export interface HealthCheckProfile {
  profile: string | null;
  customNote: string | null;
  lastReviewedQuarter: string | null;
  updatedAt: string | null;
}

export interface HealthCheckPeriodValue {
  period: string;
  value: number | null;
  status: HealthCheckStatus;
  note: string | null;
}

export interface HealthCheckMetric {
  key: string;
  name: string;
  unit: string;
  evalType: HealthCheckEvalType;
  threshold: number | null;
  thresholdLabel: string | null;
  /** 這個細項每一期代表一整年，畫面上只顯示年份、不顯示「Q4」（DEC-066）。 */
  isAnnual: boolean;
  /** 筆記欄位還沒存過任何內容時，預設帶入已算好的數值當起始文字（目前只有盈餘總分配率）。 */
  autofillNoteWithValue: boolean;
  periods: HealthCheckPeriodValue[];
}

export interface HealthCheckCategory {
  key: string;
  name: string;
  thresholdDescription: string;
  metrics: HealthCheckMetric[];
}

export interface HealthCheckYearlyPriceTrend {
  year: number;
  avgClosePrice: number | null;
  avgPer: number | null;
  avgPbr: number | null;
}

export interface AiSuggestion {
  text: string;
  updatedAt: string | null;
}

export interface HealthCheckData {
  stockId: string;
  stockName: string;
  industryCategory: string | null;
  template: HealthCheckTemplate;
  currentPrice: number | null;
  profile: HealthCheckProfile;
  categories: HealthCheckCategory[];
  /** 銀行模板「股價變化（近10年年均價/PBR/PER）」；一般模板固定為空陣列（DEC-031）。 */
  priceTrend: HealthCheckYearlyPriceTrend[];
  /** 本季不達標細項＋AI 投資建議快取；尚未產生過時為 null（DEC-068 後續實作）。 */
  aiSuggestion: AiSuggestion | null;
}

export interface HealthCheckProfileUpdate {
  profile: string;
  customNote: string;
}

export interface HealthCheckSnapshotEntry {
  metricKey: string;
  /** 'YYYYQ#'，或 bankRevenue.* 細項的 'YYYY-MM'（DEC-043）——每筆各自帶，不共用單一欄位。 */
  period: string;
  value: number | null;
  note: string | null;
}

export interface HealthCheckSnapshotUpdate {
  /** 用來更新「資料季度」，與 entries 各自的 period 是兩件獨立的事。 */
  reviewedQuarter: string;
  entries: HealthCheckSnapshotEntry[];
}

/** POST .../health-check/external-sync 的回應（DEC-046~050、DEC-053）。 */
export interface ExternalSyncResult {
  stockId: string;
  syncedMetricKeys: string[];
  /** TWSE/銀行局來源、FinMind來源各自獨立失敗時的說明；兩者皆成功時是空陣列（DEC-053）。 */
  warnings: string[];
}

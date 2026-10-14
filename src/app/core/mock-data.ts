import { StockSummary } from './stock-summary.model';
import { TargetPriceData } from '../features/target-price/target-price.model';
import {
  HealthCheckCategory,
  HealthCheckData,
  HealthCheckEvalType,
  HealthCheckMetric,
} from '../features/health-check/health-check.model';
import { evalHealthCheckStatus } from '../features/health-check/health-check-evaluator';
import { FavoriteStockUpdateRow } from '../features/favorite-update/favorite-update.model';

/** 僅供 useMockApi 模式使用的股票目錄。 */
export const MOCK_STOCKS: StockSummary[] = [
  { stockId: '2330', stockName: '台積電', industryCategory: '半導體業' },
  { stockId: '2317', stockName: '鴻海', industryCategory: '電子零組件業' },
  { stockId: '2454', stockName: '聯發科', industryCategory: '半導體業' },
  { stockId: '2881', stockName: '富邦金', industryCategory: '金融業' },
  { stockId: '2882', stockName: '國泰金', industryCategory: '金融業' },
  { stockId: '0050', stockName: '元大台灣50', industryCategory: 'ETF' },
  { stockId: '1301', stockName: '台塑', industryCategory: '塑膠工業' },
  { stockId: '2603', stockName: '長榮', industryCategory: '航運業' },
];

/** 僅供「我的最愛區」頁面檢查表格狀態的 fixture。 */
export const MOCK_FAVORITE_UPDATE_ROWS: FavoriteStockUpdateRow[] = [
  {
    stockId: '2330', stockName: '台積電', latestPrice: 1075, targetPrice: 810, targetPriceLabel: '合理價',
    gapRatio: 0.3272, latestDataQuarter: '2026 Q2', investmentStrategy: '長期持有，合理價以下分批布局。',
    errorMessage: null,
  },
  {
    stockId: '2317', stockName: '鴻海', latestPrice: 185, targetPrice: 203, targetPriceLabel: '爆炸貴',
    gapRatio: -0.0887, latestDataQuarter: '2026 Q2', investmentStrategy: '股價低於目標價時分批買進。',
    errorMessage: null,
  },
  {
    stockId: '2454', stockName: '聯發科', latestPrice: 1350, targetPrice: 1200, targetPriceLabel: '合理價',
    gapRatio: 0.125, latestDataQuarter: '2026 Q1', investmentStrategy: null,
    errorMessage: null,
  },
  {
    stockId: '2603', stockName: '長榮', latestPrice: null, targetPrice: null, targetPriceLabel: null,
    gapRatio: null, latestDataQuarter: null, investmentStrategy: null,
    errorMessage: '更新失敗，請稍後重試',
  },
];

const MOCK_TIERS = [
  { n: 1, label: '1 便宜價', value: 620 },
  { n: 2, label: '2 次便宜', value: 715 },
  { n: 3, label: '3 合理價', value: 810 },
  { n: 4, label: '4 昂貴價', value: 940 },
  { n: 5, label: '5 超貴價', value: 1020 },
  { n: 6, label: '6 爆炸貴', value: 1100 },
];

/** 僅供 useMockApi 模式使用的目標價 fixture。 */
export const MOCK_TARGET_PRICES: Record<string, TargetPriceData> = {
  '2330': createTargetPrice('2330', '台積電', '半導體業', 1075, MOCK_TIERS),
  '2317': createTargetPrice('2317', '鴻海', '電子零組件業', 185, [
    { n: 1, label: '1 便宜價', value: 110 },
    { n: 2, label: '2 次便宜', value: 130 },
    { n: 3, label: '3 合理價', value: 150 },
    { n: 4, label: '4 昂貴價', value: 170 },
    { n: 5, label: '5 超貴價', value: 187 },
    { n: 6, label: '6 爆炸貴', value: 203 },
  ]),
  '2454': createTargetPrice('2454', '聯發科', '半導體業', 1350, [
    { n: 1, label: '1 便宜價', value: 900 },
    { n: 2, label: '2 次便宜', value: 1050 },
    { n: 3, label: '3 合理價', value: 1200 },
    { n: 4, label: '4 昂貴價', value: 1350 },
    { n: 5, label: '5 超貴價', value: 1433 },
    { n: 6, label: '6 爆炸貴', value: 1517 },
  ]),
};

/** 建立結構一致的 mock 目標價資料。 */
function createTargetPrice(
  stockId: string,
  stockName: string,
  industryCategory: string,
  currentPrice: number,
  tiers: TargetPriceData['tiers'],
): TargetPriceData {
  return {
    stockId,
    stockName,
    industryCategory,
    currentPrice,
    low10: Math.min(...tiers.map((tier) => tier.value)) * 0.6,
    high10: Math.max(...tiers.map((tier) => tier.value)) * 1.08,
    tenYearAvgYield: stockId === '2317' ? 0.045 : 0.028,
    dividendDate: '2026-06-18',
    lastUpdated: '2026-07-29T01:15:00Z',
    tiers,
    reasonablePriceIndex: 2,
    investmentStrategy: '長期持有，依合理價分批布局。',
    epsAvgYears: 5,
    bpsAvgYears: 5,
    settingNote: 'EPS取近5年平均、BPS取近5年平均',
    targetPriceLevel: 3,
    frontYear: 2022,
    aiSuggestion: null,
    yearlyLowPrices: mockYearlyLowPrices(tiers[2]?.value ?? 0),
  };
}

/**
 * 產生近10個完整年度的最低價 mock：最近3年高於合理價，更早的年度低於合理價——讓畫面預設的
 * 「前目標價出現」落在一個相對「現在」固定往前推4個完整年度的位置，不會因為系統日期經過而
 * 顯示一個已經過期很久的絕對年份。
 */
// ---------------------------------------------------------------------------
// SA-03 企業體質檢視 mock（僅供 useMockApi 模式使用）。數值取材自使用者提供的
// 「選股.xlsx」範例（1216 統一／2884 玉山金），與 prototype/stock-health-prototype.html、
// 後端 HealthCheckTemplateDefinitions 的定義保持一致。
// ---------------------------------------------------------------------------

const HC_QUARTERS = ['2024Q4', '2023Q4', '2023Q3', '2022Q4', '2022Q3'];
/** isAnnual 細項專用：全部落在 Q4，畫面上會只顯示年份（DEC-066），避免跟季度資料混雜。 */
const HC_YEARS = ['2024Q4', '2023Q4', '2022Q4', '2021Q4', '2020Q4'];

/**
 * hcMetric() 原本是9~11個位置參數（依序 key/name/unit/evalType/threshold/values/notes/
 * thresholdLabel/quarters/isAnnual/autofillNoteWithValue），新增 isAnnual／
 * autofillNoteWithValue 這類尾端可選參數時很容易漏填或填錯位置（呼叫端只看得到一串值，
 * 編譯器抓不到「這個 true 到底對應哪個參數」）。改成單一 object 參數，每個欄位都要
 * 具名，之後再加新欄位也不會影響既有呼叫端。
 */
interface HcMetricOptions {
  key: string;
  name: string;
  unit: string;
  evalType: HealthCheckEvalType;
  threshold: number | null;
  values: Array<number | null>;
  notes?: Record<number, string>;
  thresholdLabel?: string;
  quarters?: string[];
  isAnnual?: boolean;
  autofillNoteWithValue?: boolean;
}

function hcMetric(options: HcMetricOptions): HealthCheckMetric {
  const {
    key,
    name,
    unit,
    evalType,
    threshold,
    values,
    notes,
    thresholdLabel,
    quarters = HC_QUARTERS,
    isAnnual = false,
    autofillNoteWithValue = false,
  } = options;
  return {
    key,
    name,
    unit,
    evalType,
    threshold,
    thresholdLabel: thresholdLabel ?? null,
    isAnnual,
    autofillNoteWithValue,
    periods: values.map((value, i) => ({
      period: quarters[i],
      value,
      status: evalHealthCheckStatus(evalType, threshold, value),
      note: notes?.[i] ?? null,
    })),
  };
}

function hcCategory(
  key: string,
  name: string,
  thresholdDescription: string,
  metrics: HealthCheckMetric[],
): HealthCheckCategory {
  return { key, name, thresholdDescription, metrics };
}

/** 一般模板 12 大項（1216 統一實際數值）。 */
function generalCategories(): HealthCheckCategory[] {
  return [
    hcCategory('profit', '是否賺錢', 'EPS，近10年只容許一年虧損', [
      hcMetric({
        key: 'profit.tenYearProfitable', name: '10年來是否年年賺錢', unit: '', evalType: 'BOOLEAN', threshold: null,
        values: [1, 1, 1, 1, 1], quarters: HC_YEARS, isAnnual: true,
      }),
    ]),
    hcCategory('reinvest', '盈餘再投資比率', '盈餘再投資比率 ＜ 200%', [
      hcMetric({
        key: 'reinvest.reinvestmentRatio', name: '盈餘再投資比率', unit: '%', evalType: 'LESS_THAN', threshold: 200,
        values: [123.27, 110, 92.26, 92.26, 75.4],
      }),
    ]),
    hcCategory('core', '靠本業賺錢', '本業收入比 ＞ 80%', [
      hcMetric({
        key: 'core.operatingIncomeRatioQuarter', name: '本業收入比(季)', unit: '%', evalType: 'GREATER_THAN', threshold: 80,
        values: [74.6, 69.7, 86.7, 85.1, 79.1], notes: { 1: '業外突然拉高，觀察' },
      }),
      hcMetric({
        key: 'core.operatingIncomeRatioYear', name: '本業收入比(年)', unit: '%', evalType: 'GREATER_THAN', threshold: 80,
        values: [80.1, 58.8, 82.1, 82.1, 78.3], quarters: HC_YEARS, isAnnual: true,
      }),
    ]),
    hcCategory('nonOperating', '業外是否虧損', '業外損失比率 ＞ -20%', [
      hcMetric({
        key: 'nonOperating.otherComprehensiveIncomeRatio', name: '其他綜合損益(季)／稅後淨利', unit: '%', evalType: 'GREATER_THAN', threshold: -20,
        values: [66.76, -249.87, 65.7, 61.88, 58.83], notes: { 1: '國外營運機構財務報表換算之兌換差額，突然拉高需要觀察' },
      }),
    ]),
    hcCategory('revenueInflation', '營收是否灌水', '營收灌水比例（應收+存貨/營收）＜ 30%', [
      hcMetric({
        key: 'revenueInflation.ratio', name: '營收灌水比例(年)', unit: '%', evalType: 'LESS_THAN', threshold: 30,
        values: [13.98, 14.66, 15.36, 15.36, 15.28], quarters: HC_YEARS, isAnnual: true,
      }),
    ]),
    hcCategory('cashFlow', '現金流', '現金 ＞ 0 才能發錢', [
      hcMetric({
        key: 'cashFlow.operating', name: '營業金流(億)(季)', unit: '億', evalType: 'GREATER_THAN', threshold: 0,
        values: [211, 164, 339, 186, 210],
      }),
      hcMetric({
        key: 'cashFlow.free', name: '自由金流(億)(季)', unit: '億', evalType: 'GREATER_THAN', threshold: 0,
        values: [142, 52.5, 214, 146, 136],
      }),
    ]),
    hcCategory('debt', '欠錢壓力', '負債總額佔比 ＜ 50%（含應付帳款，可另外檢視）', [
      hcMetric({
        key: 'debt.totalLiabilitiesRatio', name: '負債總額佔比(季)', unit: '%', evalType: 'LESS_THAN', threshold: 50,
        values: [70.5, 70.7, 70.4, 65.1, 65.6], notes: { 4: 'Q2發股利造成應付提高，負債都大於60%，其中應付佔20%左右' },
      }),
      hcMetric({
        key: 'debt.currentRatio', name: '流動資產對流動負債(季)', unit: '%', evalType: 'GREATER_THAN', threshold: 100,
        values: [97.7, 97.1, 91.8, 112, 107], thresholdLabel: '＞ 100%',
      }),
      hcMetric({
        key: 'debt.quickRatio', name: '速動資產對流動負債(季)', unit: '%', evalType: 'GREATER_THAN', threshold: 100,
        values: [68.1, 67.8, 66.5, 79, 78.4], thresholdLabel: '＞ 100%',
      }),
      hcMetric({
        key: 'debt.interestCoverageRatio', name: '利息保障倍數(季)', unit: '倍', evalType: 'GREATER_THAN', threshold: 5,
        values: [6.83, 7.59, 12.3, 8.81, 18.4], thresholdLabel: '＝(稅前淨利＋利息費用)÷利息費用 ＞ 5倍',
      }),
    ]),
    hcCategory('capital', '股本膨脹率', '今股本與5年前股本成長 ＜ 20%', [
      hcMetric({
        key: 'capital.expansionRatio', name: '股本膨脹率(年)', unit: '%', evalType: 'LESS_THAN', threshold: 20,
        values: [0, 0, 0, 0, 0],
      }),
    ]),
    hcCategory('insider', '內行人持有率', '董監持股比／法人持股比變化／董監質押', [
      hcMetric({
        key: 'insider.directorShareholdingRatio', name: '董監持股比(%)', unit: '%', evalType: 'JUDGMENT', threshold: null,
        values: [10.3, 10.1, 10.1, 10.1, 10.1],
      }),
      hcMetric({
        key: 'insider.institutionalHoldingQuarterlyChange', name: '法人持股比季變化(%)', unit: '%', evalType: 'JUDGMENT', threshold: null,
        values: [1.44, -0.89, -0.51, 0.62, 1.29],
      }),
      hcMetric({
        key: 'insider.directorPledgeRatio', name: '全體董監質押(%)', unit: '%', evalType: 'LESS_THAN', threshold: 33,
        values: [13.7, 14, 14, 14, 14], thresholdLabel: '＜ 33%',
      }),
    ]),
    hcCategory('payout', '盈餘分配率', '看是否穩定', [
      hcMetric({
        key: 'payout.totalPayoutRatio', name: '盈餘總分配率', unit: '%', evalType: 'JUDGMENT', threshold: null,
        values: [82.4, 92.9, 104, 104, 77.1], notes: { 3: '2022合併營收創新高但獲利降低，很久沒有超額配了，須關注' },
        quarters: HC_YEARS, isAnnual: true, autofillNoteWithValue: true,
      }),
    ]),
    hcCategory('margin', '毛利率', '看是否穩定or攀升', [
      hcMetric({
        key: 'margin.quarter', name: '毛利率(季)(%)', unit: '%', evalType: 'JUDGMENT', threshold: null,
        values: [31.6, 31.3, 32.3, 31.1, 32], notes: { 3: '原物料價格飆升影響成本' },
      }),
      hcMetric({
        key: 'margin.year', name: '年毛利率(%)', unit: '%', evalType: 'JUDGMENT', threshold: null,
        values: [32.4, 32.4, 33, 33, 33.9], quarters: HC_YEARS, isAnnual: true,
      }),
    ]),
    hcCategory('operations', '營業數據', '看是否穩定or攀升', [
      hcMetric({
        key: 'operations.operatingIncome', name: '營業利益(億)(季)', unit: '億', evalType: 'JUDGMENT', threshold: null,
        values: [50.4, 45.2, 94.8, 49.4, 90],
      }),
      hcMetric({
        key: 'operations.netIncome', name: '淨利(億)(季)', unit: '億', evalType: 'JUDGMENT', threshold: null,
        values: [31.4, 15.6, 55.7, 25.6, 55.3],
      }),
      hcMetric({
        key: 'operations.epsQuarter', name: 'EPS(季)', unit: '元', evalType: 'JUDGMENT', threshold: null,
        values: [0.55, 0.28, 0.98, 0.45, 0.97],
      }),
      hcMetric({
        key: 'operations.epsYear', name: 'EPS(年)', unit: '元', evalType: 'JUDGMENT', threshold: null,
        values: [3.64, 3.23, 3.02, 3.02, 3.5], quarters: HC_YEARS, isAnnual: true,
      }),
      hcMetric({
        key: 'operations.roe', name: 'ROE(年)', unit: '%', evalType: 'JUDGMENT', threshold: null,
        values: [16, 15.6, 14.2, 14.2, 15.9], quarters: HC_YEARS, isAnnual: true,
      }),
    ]),
  ];
}

/** 銀行模板：與一般模板共用 6 個大項的定義，實際數值改為 2884 玉山金真實資料。 */
function bankSharedCategories(): HealthCheckCategory[] {
  return [
    hcCategory('profit', '是否賺錢', 'EPS，近10年只容許一年虧損', [
      hcMetric({
        key: 'profit.tenYearProfitable', name: '10年來是否年年賺錢', unit: '', evalType: 'BOOLEAN', threshold: null,
        values: [1, 1, 1, 1, 1], quarters: HC_YEARS, isAnnual: true,
      }),
    ]),
    // 銀行財報結構沒有 PropertyAndPlantAndEquipment（資本支出），自由金流算不出來，
    // 銀行模板不顯示這個細項（DEC-055，比照後端 HealthCheckTemplateDefinitions.bankCashFlow()）。
    hcCategory('cashFlow', '現金流', '現金 ＞ 0 才能發錢', [
      hcMetric({
        key: 'cashFlow.operating', name: '營業金流(億)(季)', unit: '億', evalType: 'GREATER_THAN', threshold: 0,
        values: [-92, 439, -132, -196, 517], notes: { 0: '現金流還ok', 2: '現金流還ok', 3: '現金流還ok' },
      }),
    ]),
    hcCategory('capital', '股本膨脹率', '今股本與5年前股本成長 ＜ 20%', [
      hcMetric({
        key: 'capital.expansionRatio', name: '股本膨脹率(年)', unit: '%', evalType: 'LESS_THAN', threshold: 20,
        values: [37.69, 17.02, 53.68, 40.14, 62.83],
      }),
    ]),
    hcCategory('insider', '內行人持有率', '董監持股比／法人持股比變化／董監質押', [
      hcMetric({
        key: 'insider.directorShareholdingRatio', name: '董監持股比(%)', unit: '%', evalType: 'JUDGMENT', threshold: null,
        values: [1.58, 27.7, 1.61, 1.81, 1.81], notes: { 3: '董監減少持股，持續觀察', 4: '法人持股降低，注意' },
      }),
      hcMetric({
        key: 'insider.institutionalHoldingQuarterlyChange', name: '法人持股比季變化(%)', unit: '%', evalType: 'JUDGMENT', threshold: null,
        values: [-2.96, 0.31, -0.5, -1.87, 2.15],
      }),
      hcMetric({
        key: 'insider.directorPledgeRatio', name: '全體董監質押(%)', unit: '%', evalType: 'LESS_THAN', threshold: 33,
        values: [0, 0, 0, 0, 0], thresholdLabel: '＜ 33%',
      }),
    ]),
    hcCategory('payout', '盈餘分配率', '看是否穩定', [
      hcMetric({
        key: 'payout.totalPayoutRatio', name: '盈餘總分配率', unit: '%', evalType: 'JUDGMENT', threshold: null,
        values: [79.8, 69, 51.7, 54.5, 87.3], quarters: HC_YEARS, isAnnual: true, autofillNoteWithValue: true,
      }),
    ]),
    // 銀行 FinancialStatements 完全沒有 OperatingIncome 這個 type（沒有一般產業「營業利益」
    // 這個科目），銀行模板不顯示這個細項（DEC-055）。
    hcCategory('operations', '營業數據', '看是否穩定or攀升', [
      hcMetric({
        key: 'operations.netIncome', name: '淨利(億)(季)', unit: '億', evalType: 'JUDGMENT', threshold: null,
        values: [52.3, 27.5, 53.4, 41.1, 45.6],
      }),
      hcMetric({
        key: 'operations.epsQuarter', name: 'EPS(季)', unit: '元', evalType: 'JUDGMENT', threshold: null,
        values: [0.33, 0.19, 0.35, 0.29, 0.32],
      }),
      hcMetric({
        key: 'operations.epsYear', name: 'EPS(年)', unit: '元', evalType: 'JUDGMENT', threshold: null,
        values: [1.63, 1.17, 1.1, 1.1, 1.54], quarters: HC_YEARS, isAnnual: true,
      }),
      hcMetric({
        key: 'operations.roe', name: 'ROE(年)', unit: '%', evalType: 'JUDGMENT', threshold: null,
        values: [10.7, 7.66, 8.06, 8.06, 11], quarters: HC_YEARS, isAnnual: true,
      }),
    ]),
  ];
}

/** 銀行模板專屬 3 大項：監理指標／籌碼變化（季）＋ 月營收（月，近3年，這裡精簡示範前6個月）。 */
function bankOnlyCategories(): HealthCheckCategory[] {
  const bankQuarters = ['2024Q4', '2023Q4', '2023Q3', '2022Q4', '2022Q3'];
  const months = ['2025-02', '2025-01', '2024-12', '2024-11', '2024-10', '2024-09'];
  return [
    hcCategory('bankRegulatory', '銀行監理指標(季)', '資本適足率／逾期放款比率／備抵呆帳覆蓋率', [
      // 排名筆記模擬後端 ExternalHealthDataSyncService.rankNote() 每次同步時的自動寫入結果
      // （DEC-053後續補充）：跟全體銀行（mock 假設 38 家）比較排出的名次，會覆蓋掉舊筆記，
      // 不是使用者手動填寫的欄位。
      hcMetric({
        key: 'bankRegulatory.capitalAdequacyRatio', name: '資本適足率(%)(季)', unit: '%', evalType: 'GREATER_THAN', threshold: 10.5,
        values: [15.26, 15.62, 14.96, 14.33, 13.61],
        notes: { 0: '排名18/38', 1: '排名14/38', 2: '排名20/38', 3: '排名26/38', 4: '排名30/38' },
        thresholdLabel: '越高越好（法定下限10.5%）', quarters: bankQuarters,
      }),
      hcMetric({
        key: 'bankRegulatory.overdueLoanRatio', name: '逾期放款比率(%)(季)', unit: '%', evalType: 'LESS_THAN', threshold: 3,
        values: [0.14, 0.16, 0.17, 0.17, 0.16],
        notes: { 0: '排名6/38', 1: '排名8/38', 2: '排名9/38', 3: '排名9/38', 4: '排名8/38' },
        thresholdLabel: '越低越好（近期以＜2%較佳）', quarters: bankQuarters,
      }),
      hcMetric({
        key: 'bankRegulatory.badDebtCoverageRatio', name: '備抵呆帳覆蓋率(%)(季)', unit: '%', evalType: 'GREATER_THAN', threshold: 100,
        values: [828, 753.36, 711.27, 701.45, 740.26],
        notes: { 0: '排名2/38', 1: '排名5/38', 2: '排名7/38', 3: '排名8/38', 4: '排名6/38' },
        thresholdLabel: '越高越好（＞100%）', quarters: bankQuarters,
      }),
    ]),
    hcCategory('bankFlows', '籌碼變化(季)', '外資、三大法人買賣超與持股變化', [
      hcMetric({
        key: 'bankFlows.foreignNetBuySellShares', name: '外資買賣超張數(季)', unit: '張', evalType: 'JUDGMENT', threshold: null,
        values: [1711, 1269, -8709, -60350, -16406], quarters: bankQuarters,
      }),
      hcMetric({
        key: 'bankFlows.foreignShareholdingRatio', name: '外資持股(%)(季)', unit: '%', evalType: 'JUDGMENT', threshold: null,
        values: [32.3, 31.5, 31, 31.3, 33.2], quarters: bankQuarters,
      }),
      hcMetric({
        key: 'bankFlows.institutionalNetBuySellShares', name: '三大法人買賣超張數(季)', unit: '張', evalType: 'JUDGMENT', threshold: null,
        values: [6060, 789, -8951, -51953, -20885], quarters: bankQuarters,
      }),
    ]),
    hcCategory('bankRevenue', '營收(月)', '近三年，每月（mock 精簡顯示近6個月）', [
      hcMetric({
        key: 'bankRevenue.monthlyRevenue', name: '月營收', unit: '億', evalType: 'JUDGMENT', threshold: null,
        values: [64.2, 58.9, 62.1, 60.4, 59.8, 57.3], quarters: months,
      }),
      hcMetric({
        key: 'bankRevenue.momGrowth', name: '單月營收月增(%)', unit: '%', evalType: 'JUDGMENT', threshold: null,
        values: [9, -5.2, 2.8, 1, 4.4, -1.3], quarters: months,
      }),
      hcMetric({
        key: 'bankRevenue.yoyGrowth', name: '單月營收年增(%)', unit: '%', evalType: 'JUDGMENT', threshold: null,
        values: [10.8, 8.1, 9.5, 7.2, 8.9, 6.5], quarters: months,
      }),
    ]),
  ];
}

export const MOCK_HEALTH_CHECKS: Record<string, HealthCheckData> = {
  '1216': {
    stockId: '1216',
    stockName: '統一',
    industryCategory: '食品工業',
    template: 'GENERAL',
    currentPrice: 73.8,
    profile: {
      profile:
        '國內食品股龍頭，2020年公司營收比重：乳品31.56%、飲料27.69%、方便麵11.8%、畜產與水產飼料4.57%、烘焙食品10.21%、調味品1.88%、麵粉2.35%、肉品1.25%、冰品0.67%、油脂0.1%。\n內銷為主，但銷售中國預估約8-18%',
      customNote:
        '2017年後股價就沒低於60，近幾年殖利率約3-4%\n-台灣最大食品廠，民生必需不會沒落，除非遇到食安、誠信問題\n-多產業集團可分散風險，作為存股風險不高 但獲利偏低',
      lastReviewedQuarter: '2024Q4',
      updatedAt: '2026-06-30T01:12:00Z',
    },
    categories: generalCategories(),
    priceTrend: [],
    aiSuggestion: null,
  },
  '2884': {
    stockId: '2884',
    stockName: '玉山金',
    industryCategory: '金融業（銀行）',
    template: 'BANK',
    currentPrice: 38.65,
    profile: {
      profile:
        '2021年各子公司獲利佔公司比重：銀行佔85％、證券佔8％，還有創投業務佔7％。2021金控資產排名 10/14。\n截至2021年11月，國內有139家分行通路。並布局海外據點共28處。',
      customNote:
        '每年固定配息配股，營收有跟上股本擴張，保持每年EPS約1.5左右\n過去股價PBR落在1-1.4，2019年後漲到1.8以上，希望能先落回1.4左右20.6元',
      lastReviewedQuarter: '2024Q4',
      updatedAt: '2026-06-28T13:47:00Z',
    },
    categories: [...bankSharedCategories(), ...bankOnlyCategories()],
    priceTrend: [
      { year: 2025, avgClosePrice: 28.6, avgPer: 18.4, avgPbr: 1.85 },
      { year: 2024, avgClosePrice: 26.4, avgPer: 19.6, avgPbr: 1.82 },
      { year: 2023, avgClosePrice: 25.1, avgPer: 19.8, avgPbr: 1.78 },
      { year: 2022, avgClosePrice: 24.6, avgPer: 21.4, avgPbr: 1.83 },
      { year: 2021, avgClosePrice: 24.9, avgPer: 20.1, avgPbr: 1.75 },
      { year: 2020, avgClosePrice: 22.8, avgPer: 19.2, avgPbr: 1.68 },
      { year: 2019, avgClosePrice: 23.5, avgPer: 17.8, avgPbr: 1.62 },
      { year: 2018, avgClosePrice: 19.1, avgPer: 15.9, avgPbr: 1.35 },
      { year: 2017, avgClosePrice: 18.0, avgPer: 15.1, avgPbr: 1.22 },
      { year: 2016, avgClosePrice: 16.2, avgPer: 14.3, avgPbr: 1.08 },
    ],
    aiSuggestion: null,
  },
};

/**
 * 僅供 useMockApi 模式使用的預設「我的最愛」清單——含 1216（一般模板）／2884（銀行模板），
 * 方便瀏覽器手動驗證體質檢視頁面時不用先手動加收藏。
 */
export const MOCK_FAVORITE_STOCKS: StockSummary[] = [
  MOCK_STOCKS[0],
  { stockId: '1216', stockName: MOCK_HEALTH_CHECKS['1216'].stockName, industryCategory: MOCK_HEALTH_CHECKS['1216'].industryCategory },
  { stockId: '2884', stockName: MOCK_HEALTH_CHECKS['2884'].stockName, industryCategory: MOCK_HEALTH_CHECKS['2884'].industryCategory },
];

function mockYearlyLowPrices(reasonablePrice: number): TargetPriceData['yearlyLowPrices'] {
  const currentCompleteYear = new Date().getFullYear() - 1;
  return Array.from({ length: 10 }, (_, i) => ({
    year: currentCompleteYear - i,
    lowPrice: Math.round(reasonablePrice * (i < 3 ? 1.1 : 0.7)),
  }));
}

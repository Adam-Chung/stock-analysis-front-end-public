import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { delay, map, Observable, of, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MOCK_HEALTH_CHECKS } from '../../core/mock-data';
import {
  AiSuggestion,
  ExternalSyncResult,
  HealthCheckCategory,
  HealthCheckData,
  HealthCheckMetric,
  HealthCheckPeriodValue,
  HealthCheckProfile,
  HealthCheckProfileUpdate,
  HealthCheckSnapshotUpdate,
  HealthCheckYearlyPriceTrend,
} from './health-check.model';

/**
 * 外部資料同步（DEC-046~050）一次要打多個 TWSE/銀行局端點，每個 host 之間有節流間隔，
 * 完整跑完可能耗時數十秒——給比一般 API 呼叫寬鬆很多的逾時，避免使用者以為卡死。
 */
const EXTERNAL_SYNC_TIMEOUT_MS = 120_000;

/** 串接 SA-03 企業體質檢視後端 API（TASK-028）。v1 全部手動輸入，前端不自行推算任何欄位。 */
@Injectable({ providedIn: 'root' })
export class HealthCheckDataService {
  constructor(private readonly http: HttpClient) {}

  /** 載入指定股票的完整畫面資料。 */
  load(stockId: string): Observable<HealthCheckData> {
    if (environment.useMockApi) {
      return of(mockHealthCheck(stockId)).pipe(delay(250));
    }
    return this.http.get<HealthCheckApiResponse>(this.url(stockId)).pipe(map(toViewModel));
  }

  /** 更新公司簡介／整體備註。 */
  updateProfile(stockId: string, update: HealthCheckProfileUpdate): Observable<HealthCheckData> {
    if (environment.useMockApi) {
      const data = mockHealthCheck(stockId);
      return of({
        ...data,
        profile: { ...data.profile, ...update, updatedAt: new Date().toISOString() },
      }).pipe(delay(200));
    }
    return this.http
      .put<HealthCheckApiResponse>(`${this.url(stockId)}/profile`, update)
      .pipe(map(toViewModel));
  }

  /** 「更新」按鈕：整批送出當季（或當月）數值／筆記。 */
  updateSnapshot(stockId: string, update: HealthCheckSnapshotUpdate): Observable<HealthCheckData> {
    if (environment.useMockApi) {
      return of(mockHealthCheck(stockId)).pipe(delay(500));
    }
    return this.http
      .put<HealthCheckApiResponse>(`${this.url(stockId)}/snapshot`, update)
      .pipe(map(toViewModel));
  }

  /**
   * 觸發外部資料來源同步（DEC-046~050：董監持股/質押、法人持股比季變化、銀行監理指標）。
   * 只回傳「同步了哪些 metric_key」，畫面資料要另外呼叫 {@link load} 才會拿到更新後的數值。
   */
  triggerExternalSync(stockId: string): Observable<ExternalSyncResult> {
    if (environment.useMockApi) {
      const template = mockHealthCheck(stockId).template;
      const syncedMetricKeys = [
        'insider.directorShareholdingRatio',
        'insider.directorPledgeRatio',
        'insider.institutionalHoldingQuarterlyChange',
        ...(template === 'BANK'
          ? ['bankRegulatory.capitalAdequacyRatio', 'bankRegulatory.overdueLoanRatio', 'bankRegulatory.badDebtCoverageRatio']
          : []),
      ];
      return of({ stockId, syncedMetricKeys, warnings: [] }).pipe(delay(1500));
    }
    return this.http
      .post<ExternalSyncResult>(`${this.url(stockId)}/external-sync`, null)
      .pipe(timeout(EXTERNAL_SYNC_TIMEOUT_MS));
  }

  /** 只有使用者按下按鈕時才要求後端產生並保存最新 AI 投資建議。 */
  requestAiSuggestion(stockId: string): Observable<AiSuggestion> {
    if (environment.useMockApi) {
      return of({
        text: 'Mock AI 建議（第一段）：本季不達標細項的可能原因說明。\n\n（第二段）值不值得投資的結論。\n\n（第三段）財報體質有沒有問題的結論。僅供研究參考，非投資建議',
        updatedAt: new Date().toISOString(),
      }).pipe(delay(500));
    }
    return this.http.post<AiSuggestion>(`${this.url(stockId)}/ai-suggestion`, null);
  }

  private url(stockId: string): string {
    return `${environment.apiBaseUrl}/api/stocks/${encodeURIComponent(stockId)}/health-check`;
  }
}

/** 取得指定股票 fixture；無專屬資料時退回一般模板的替代資料。 */
function mockHealthCheck(stockId: string): HealthCheckData {
  const data = MOCK_HEALTH_CHECKS[stockId];
  if (data) return data;
  return {
    ...MOCK_HEALTH_CHECKS['1216'],
    stockId,
    stockName: `股票 ${stockId}（Mock）`,
    industryCategory: null,
  };
}

/**
 * 後端 {@code HealthCheckResponse} 的原始 JSON 形狀——目前跟 {@link HealthCheckData} 逐欄位
 * 同名，但刻意宣告成獨立型別、經 {@link toViewModel} 逐欄位轉換，不直接把 HTTP 回應當
 * `HealthCheckData` 用。理由：body 直接假設「後端回應＝前端 view model」會讓後端任何欄位
 * 調整（改名、拆欄位、加轉換邏輯）直接打穿整個元件樹——這正是 `isAnnual` 欄位曾經在前端
 * 漏加、build 失敗才發現的那類風險（漏加是發生在 mock-data.ts，但這裡補上轉換層是同一個
 * 問題的通用解法：往後任一種後端欄位變動都只需要修這個函式，其餘畫面程式碼完全不受影響）。
 */
interface HealthCheckApiResponse {
  stockId: string;
  stockName: string;
  industryCategory: string | null;
  template: HealthCheckData['template'];
  currentPrice: number | null;
  profile: HealthCheckProfile;
  categories: HealthCheckCategory[];
  priceTrend: HealthCheckYearlyPriceTrend[];
  aiSuggestion: AiSuggestion | null;
}

function toViewModel(response: HealthCheckApiResponse): HealthCheckData {
  return {
    stockId: response.stockId,
    stockName: response.stockName,
    industryCategory: response.industryCategory,
    template: response.template,
    currentPrice: response.currentPrice,
    profile: toProfileViewModel(response.profile),
    categories: response.categories.map(toCategoryViewModel),
    priceTrend: response.priceTrend.map((row) => ({
      year: row.year,
      avgClosePrice: row.avgClosePrice,
      avgPer: row.avgPer,
      avgPbr: row.avgPbr,
    })),
    aiSuggestion: response.aiSuggestion
      ? { text: response.aiSuggestion.text, updatedAt: response.aiSuggestion.updatedAt }
      : null,
  };
}

function toProfileViewModel(profile: HealthCheckProfile): HealthCheckProfile {
  return {
    profile: profile.profile,
    customNote: profile.customNote,
    lastReviewedQuarter: profile.lastReviewedQuarter,
    updatedAt: profile.updatedAt,
  };
}

function toCategoryViewModel(category: HealthCheckCategory): HealthCheckCategory {
  return {
    key: category.key,
    name: category.name,
    thresholdDescription: category.thresholdDescription,
    metrics: category.metrics.map(toMetricViewModel),
  };
}

function toMetricViewModel(metric: HealthCheckMetric): HealthCheckMetric {
  return {
    key: metric.key,
    name: metric.name,
    unit: metric.unit,
    evalType: metric.evalType,
    threshold: metric.threshold,
    thresholdLabel: metric.thresholdLabel,
    isAnnual: metric.isAnnual,
    autofillNoteWithValue: metric.autofillNoteWithValue,
    periods: metric.periods.map(toPeriodViewModel),
  };
}

function toPeriodViewModel(period: HealthCheckPeriodValue): HealthCheckPeriodValue {
  return {
    period: period.period,
    value: period.value,
    status: period.status,
    note: period.note,
  };
}

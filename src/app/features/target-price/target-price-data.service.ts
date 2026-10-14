import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { delay, map, Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MOCK_TARGET_PRICES } from '../../core/mock-data';
import { AiSuggestion, TargetPriceData, TargetPriceSettings, WeeklyPriceCandle } from './target-price.model';

/** 串接股票目標價後端 API，不在前端保存或產生市場資料。 */
@Injectable({ providedIn: 'root' })
export class TargetPriceDataService {
  constructor(private readonly http: HttpClient) {}

  /** 載入指定股票的市場資料、估值結果、設定與既有 AI 建議。 */
  load(stockId: string): Observable<TargetPriceData> {
    if (environment.useMockApi) {
      return of(mockTargetPrice(stockId)).pipe(delay(250));
    }
    return this.http.get<TargetPriceApiResponse>(this.url(stockId)).pipe(map(toViewModel));
  }

  /** 手動同步 FinMind 市場資料並取得重新計算後的完整畫面。 */
  refresh(stockId: string): Observable<TargetPriceData> {
    if (environment.useMockApi) {
      return of({
        ...mockTargetPrice(stockId),
        lastUpdated: new Date().toISOString(),
      }).pipe(delay(500));
    }
    return this.http
      .post<TargetPriceApiResponse>(`${this.url(stockId)}/refresh`, null)
      .pipe(map(toViewModel));
  }

  /** 儲存使用者設定並取得重新計算後的完整畫面。 */
  updateSettings(stockId: string, settings: TargetPriceSettings): Observable<TargetPriceData> {
    if (environment.useMockApi) {
      return of({ ...mockTargetPrice(stockId), ...settings }).pipe(delay(250));
    }
    return this.http
      .put<TargetPriceApiResponse>(`${this.url(stockId)}/settings`, settings)
      .pipe(map(toViewModel));
  }

  /** 只有使用者按下按鈕時才要求後端產生並保存最新 AI 建議。 */
  requestAiSuggestion(stockId: string): Observable<AiSuggestion> {
    if (environment.useMockApi) {
      return of({
        text: 'Mock AI 建議（第一段）：可能機會的說明。\n\n（第二段）主要風險的說明，請依風險承受度審慎評估。僅供研究參考，非投資建議',
        updatedAt: new Date().toISOString(),
      }).pipe(delay(500));
    }
    return this.http.post<AiSuggestion>(`${this.url(stockId)}/ai-suggestion`, null);
  }

  /** 載入指定股票近三年、由舊至新排列的週 K OHLC 資料。 */
  loadWeeklyPrices(stockId: string, forceRefresh = false): Observable<WeeklyPriceCandle[]> {
    if (environment.useMockApi) {
      return of(mockWeeklyPrices()).pipe(delay(150));
    }
    return this.http.get<WeeklyPriceCandle[]>(
      `${environment.apiBaseUrl}/api/stocks/${encodeURIComponent(stockId)}/weekly-prices`,
      { params: forceRefresh ? { refresh: true } : {} },
    );
  }

  /** 建立指定股票 endpoint URL。 */
  private url(stockId: string): string {
    return `${environment.apiBaseUrl}/api/stocks/${encodeURIComponent(stockId)}/target-price`;
  }
}

/** 建立近三年的示意週 K，讓 mock 模式也能完整檢查圖表版面。 */
function mockWeeklyPrices(): WeeklyPriceCandle[] {
  const candles: WeeklyPriceCandle[] = [];
  const start = new Date();
  start.setDate(start.getDate() - 7 * 155);
  let previousClose = 620;
  for (let index = 0; index < 156; index += 1) {
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + index * 7);
    const open = previousClose;
    const close = Math.max(300, open + Math.sin(index / 5) * 18 + 2.5);
    const high = Math.max(open, close) + 12;
    const low = Math.min(open, close) - 10;
    candles.push({
      weekStart: weekStart.toISOString().slice(0, 10),
      open,
      high,
      low,
      close,
    });
    previousClose = close;
  }
  return candles;
}

/** 取得指定股票 fixture；無專屬資料時以 2330 結構建立清楚標示的替代資料。 */
function mockTargetPrice(stockId: string): TargetPriceData {
  return (
    MOCK_TARGET_PRICES[stockId] ?? {
      ...MOCK_TARGET_PRICES['2330'],
      stockId,
      stockName: `股票 ${stockId}（Mock）`,
      industryCategory: null,
    }
  );
}

interface TargetPriceApiResponse extends Omit<TargetPriceData, 'tiers' | 'reasonablePriceIndex'> {
  tiers: Array<{ level: number; label: string; price: number }>;
}

/** 將後端欄位名稱轉成既有畫面元件使用的 view model。 */
function toViewModel(response: TargetPriceApiResponse): TargetPriceData {
  return {
    ...response,
    tiers: response.tiers.map((tier) => ({
      n: tier.level,
      label: tier.label,
      value: tier.price,
    })),
    reasonablePriceIndex: 2,
  };
}

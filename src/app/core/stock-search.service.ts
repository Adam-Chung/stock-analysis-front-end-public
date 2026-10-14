import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { delay, Observable, of } from 'rxjs';
import { StockSummary } from './stock-summary.model';
import { environment } from '../../environments/environment';
import { MOCK_STOCKS } from './mock-data';

/** 透過後端 API 搜尋 Neon 中已同步的股票目錄。 */
@Injectable({ providedIn: 'root' })
export class StockSearchService {
  private readonly url = `${environment.apiBaseUrl}/api/stocks/search`;

  constructor(private readonly http: HttpClient) {}

  /** 空白關鍵字不送出請求，其餘交由後端依代號或名稱搜尋。 */
  search(query: string): Observable<StockSummary[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return of([]);
    }
    if (environment.useMockApi) {
      return of(
        MOCK_STOCKS.filter(
          (stock) => stock.stockId.includes(trimmed) || stock.stockName.includes(trimmed),
        ),
      ).pipe(delay(150));
    }
    return this.http.get<StockSummary[]>(this.url, {
      params: new HttpParams().set('q', trimmed),
    });
  }
}

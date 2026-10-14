import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { delay, Observable, of, tap } from 'rxjs';
import { StockSummary } from './stock-summary.model';
import { environment } from '../../environments/environment';
import { MOCK_FAVORITE_STOCKS } from './mock-data';

/** 維護後端收藏清單，signal 僅保存最近一次成功的 API 結果。 */
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly url = `${environment.apiBaseUrl}/api/favorites`;
  private readonly _favorites = signal<StockSummary[]>([]);

  readonly favorites = this._favorites.asReadonly();

  constructor(private readonly http: HttpClient) {}

  /** 讀取並取代目前收藏清單。 */
  load(): Observable<StockSummary[]> {
    if (environment.useMockApi) {
      const favorites = MOCK_FAVORITE_STOCKS;
      this._favorites.set(favorites);
      return of(favorites).pipe(delay(100));
    }
    return this.http
      .get<StockSummary[]>(this.url)
      .pipe(tap((favorites) => this._favorites.set(favorites)));
  }

  /** 新增收藏；後端成功後才更新畫面，避免顯示未落地狀態。 */
  add(stock: StockSummary): Observable<void> {
    if (environment.useMockApi) {
      if (!this._favorites().some((item) => item.stockId === stock.stockId)) {
        this._favorites.update((list) => [...list, stock]);
      }
      return of(undefined);
    }
    return this.http
      .post<void>(`${this.url}/${encodeURIComponent(stock.stockId)}`, null)
      .pipe(
        tap(() => {
          if (!this._favorites().some((item) => item.stockId === stock.stockId)) {
            this._favorites.update((list) => [...list, stock]);
          }
        }),
      );
  }

  /** 移除收藏；後端成功後才更新畫面。 */
  remove(stockId: string): Observable<void> {
    if (environment.useMockApi) {
      this._favorites.update((list) => list.filter((stock) => stock.stockId !== stockId));
      return of(undefined);
    }
    return this.http
      .delete<void>(`${this.url}/${encodeURIComponent(stockId)}`)
      .pipe(tap(() => this._favorites.update((list) => list.filter((s) => s.stockId !== stockId))));
  }
}

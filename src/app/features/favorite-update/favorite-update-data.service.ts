import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MOCK_FAVORITE_UPDATE_ROWS } from '../../core/mock-data';
import { FavoriteStockUpdateRow } from './favorite-update.model';

@Injectable({ providedIn: 'root' })
export class FavoriteUpdateDataService {
  private readonly http = inject(HttpClient);

  /** 要求後端循序更新全部收藏股票。 */
  refreshAll(): Observable<FavoriteStockUpdateRow[]> {
    if (environment.useMockApi) {
      return of(MOCK_FAVORITE_UPDATE_ROWS).pipe(delay(500));
    }
    return this.http.post<FavoriteStockUpdateRow[]>(`${environment.apiBaseUrl}/api/favorites/refresh`, null);
  }
}

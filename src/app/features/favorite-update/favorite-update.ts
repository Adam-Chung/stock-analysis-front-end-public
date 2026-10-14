import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FavoriteUpdateDataService } from './favorite-update-data.service';
import { FavoriteStockUpdateRow } from './favorite-update.model';

@Component({
  selector: 'app-favorite-update',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './favorite-update.html',
  styleUrl: './favorite-update.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FavoriteUpdate {
  private readonly dataService = inject(FavoriteUpdateDataService);

  readonly rows = signal<FavoriteStockUpdateRow[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /** 更新所有收藏股票並以回傳結果取代表格內容。 */
  refreshAll(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.dataService.refreshAll().subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('批次更新失敗，請稍後再試。');
        this.loading.set(false);
      },
    });
  }

  /** 建立該股票的 Goodinfo 詳細資料網址。 */
  goodinfoUrl(stockId: string): string {
    return `https://goodinfo.tw/tw/StockDetail.asp?STOCK_ID=${encodeURIComponent(stockId)}`;
  }
}

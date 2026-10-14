import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { FavoritesService } from '../favorites.service';

/**
 * 「加入我的最愛」星星按鈕，目標價分析／企業體質檢視兩頁原本各自維護一份幾乎逐行相同的
 * markup 與 isFavorite／onToggleFavorite 邏輯，抽成共用元件（比照 styles.scss 抽 CSS
 * 的既有模式，這裡連邏輯一起抽）。
 */
@Component({
  selector: 'app-favorite-toggle',
  template: `
    <button
      type="button"
      class="favorite-toggle"
      [class.active]="isFavorite()"
      (click)="onToggle()"
      [attr.aria-label]="isFavorite() ? '從我的最愛移除' : '加到我的最愛'"
      [title]="isFavorite() ? '從我的最愛移除' : '加到我的最愛'"
    >
      {{ isFavorite() ? '★' : '☆' }}
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FavoriteToggleComponent {
  private readonly favoritesService = inject(FavoritesService);

  readonly stockId = input.required<string>();
  readonly stockName = input.required<string>();
  readonly industryCategory = input<string | null>(null);

  /** 加入/移除收藏失敗時觸發，訊息文字交給父層顯示在各自既有的 actionMessage 位置。 */
  readonly error = output<string>();

  readonly isFavorite = computed(() =>
    this.favoritesService.favorites().some((s) => s.stockId === this.stockId()),
  );

  onToggle(): void {
    if (this.isFavorite()) {
      this.favoritesService.remove(this.stockId()).subscribe({
        error: () => this.error.emit('移除收藏失敗，請稍後再試。'),
      });
    } else {
      this.favoritesService
        .add({
          stockId: this.stockId(),
          stockName: this.stockName(),
          industryCategory: this.industryCategory(),
        })
        .subscribe({
          error: () => this.error.emit('加入收藏失敗，請稍後再試。'),
        });
    }
  }
}

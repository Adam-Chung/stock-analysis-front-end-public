import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StockSearchService } from './core/stock-search.service';
import { FavoritesService } from './core/favorites.service';
import { StockSummary } from './core/stock-summary.model';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly router = inject(Router);
  private readonly searchService = inject(StockSearchService);
  protected readonly favoritesService = inject(FavoritesService);
  protected readonly authService = inject(AuthService);
  private favoritesLoaded = false;

  readonly searchQuery = signal('');
  readonly searchResults = signal<StockSummary[]>([]);
  readonly searchOpen = signal(false);
  readonly searchLoading = signal(false);
  readonly shellError = signal<string | null>(null);
  readonly favoritesLoading = signal(true);
  readonly sidebarVisible = signal(true);
  readonly mobileMenuOpen = signal(false);
  readonly menuItems = [
    { label: '關於本站', icon: '🔮', path: '/about' },
    { label: '目標價分析', icon: '📈', path: '/target-price/2884' },
    { label: '企業體質檢視', icon: '📝', path: '/health-check/2884' },
    { label: '我的最愛區', icon: '🔄', path: '/favorite-update' },
  ];

  constructor() {
    effect(() => {
      if (!this.authService.loggedIn() || this.favoritesLoaded) return;
      this.favoritesLoaded = true;
      this.favoritesService.load().subscribe({
        next: () => this.favoritesLoading.set(false),
        error: () => {
          this.favoritesLoading.set(false);
          this.shellError.set('無法載入我的最愛，請稍後再試。');
        },
      });
    });
  }

  /** 撤銷目前 Token 並回到登入頁。 */
  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }

  /** 展開或收合桌機版收藏清單。 */
  toggleSidebar(): void {
    this.sidebarVisible.update((visible) => !visible);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    if (!value.trim()) {
      this.searchResults.set([]);
      this.searchOpen.set(false);
      this.searchLoading.set(false);
    }
  }

  /** 使用者按下 Enter 後才送出搜尋，避免每次輸入都呼叫後端。 */
  onSearchSubmit(): void {
    const query = this.searchQuery();
    if (!query.trim() || this.searchLoading()) return;

    this.searchLoading.set(true);
    this.shellError.set(null);
    this.searchService.search(query).subscribe({
      next: (results) => {
        if (this.searchQuery() !== query) {
          this.searchLoading.set(false);
          return;
        }
        this.searchResults.set(results);
        this.searchOpen.set(true);
        this.searchLoading.set(false);
      },
      error: () => {
        this.searchResults.set([]);
        this.searchOpen.set(false);
        this.searchLoading.set(false);
        this.shellError.set('股票搜尋失敗，請確認網路連線後再試。');
      },
    });
  }

  onSearchFocus(): void {
    if (this.searchResults().length > 0) {
      this.searchOpen.set(true);
    }
  }

  onSearchBlur(): void {
    // Delay so a click on a result item still registers before the dropdown closes.
    setTimeout(() => this.searchOpen.set(false), 150);
  }

  /** 從側欄我的最愛清單直接移除，不需要先開啟該股票頁面。 */
  onRemoveFavorite(stockId: string, event: Event): void {
    event.stopPropagation();
    this.shellError.set(null);
    this.favoritesService.remove(stockId).subscribe({
      error: () => this.shellError.set('移除收藏失敗，請稍後再試。'),
    });
  }

  /**
   * 搜尋結果／我的最愛清單點擊股票時，導向「目前所在頁面類型」對應的路由——如果目前在體質
   * 檢視頁就開該股票的體質檢視，在目標價頁就開目標價，而不是永遠固定導去目標價頁。
   */
  openStock(stockId: string): void {
    this.searchOpen.set(false);
    this.searchQuery.set('');
    this.searchResults.set([]);
    const feature = this.router.url.startsWith('/health-check') ? 'health-check' : 'target-price';
    void this.router.navigate(['/' + feature, stockId]);
  }
}

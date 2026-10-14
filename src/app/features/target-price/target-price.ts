import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FavoriteToggleComponent } from '../../core/favorite-toggle/favorite-toggle';
import { TargetPriceDataService } from './target-price-data.service';
import { TargetPriceData, TargetPriceTier, WeeklyPriceCandle, YearlyLowPrice } from './target-price.model';

type MobileRow = { type: 'tier'; tier: TargetPriceTier } | { type: 'note' };
type AvgYears = 0 | 3 | 5 | 10;

/**
 * SA-01「股票目標價」畫面。Ported from prototype/target-price-prototype.html (this repo) -
 * the visual design/behaviour there has already been through several review rounds with the
 * user, so this keeps the same CSS/structure rather than re-styling with PrimeNG defaults.
 */
@Component({
  selector: 'app-target-price',
  imports: [DecimalPipe, FormsModule, RouterLink, FavoriteToggleComponent],
  templateUrl: './target-price.html',
  styleUrl: './target-price.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TargetPrice {
  private readonly dataService = inject(TargetPriceDataService);

  /** Bound from the :stockId route param via withComponentInputBinding() (app.config.ts). */
  readonly stockId = input.required<string>();

  readonly loaded = signal(false);
  readonly loadError = signal<string | null>(null);

  // --- loaded data (SA-01 3.2/3.3 read-only fields) ---
  readonly stockName = signal('');
  readonly industryCategory = signal<string | null>(null);
  readonly currentPrice = signal(0);
  readonly low10 = signal(0);
  readonly high10 = signal(0);
  readonly tenYearAvgYield = signal(0);
  readonly dividendDate = signal('');
  readonly lastUpdated = signal('');
  readonly displayedLastUpdated = computed(() => this.formatInBrowserTimeZone(this.lastUpdated()));
  readonly tiers = signal<TargetPriceTier[]>([]);
  readonly reasonablePriceIndex = signal(0);
  readonly yearlyLowPrices = signal<YearlyLowPrice[]>([]);

  // --- settings (SA-01 3.1) ---
  readonly investmentStrategy = signal('');
  readonly epsAvgYears = signal<AvgYears>(5);
  readonly bpsAvgYears = signal<AvgYears>(5);
  readonly settingNote = signal('');
  readonly targetPriceLevel = signal(3);
  /** DEC-5: once the user edits 設定備註 by hand, EPS/BPS changes stop overwriting it. */
  private settingNoteDirty = false;

  // --- UI state ---
  /**
   * 預設收合。桌機版的 CSS 沒有對應 `.collapsed` 規則（收合功能本來就只在手機版才會顯示
   * 展開/收合按鈕），所以這個預設值只在手機寬度才會實際生效，用來一開始就節省畫面空間。
   */
  readonly valuationCollapsed = signal(true);
  readonly refreshing = signal(false);
  readonly savingSettings = signal(false);
  readonly actionMessage = signal<string | null>(null);
  readonly aiLoading = signal(false);
  readonly aiText = signal(
    '尚未產生建議，點擊下方按鈕，取得 AI 依時事／基本面／技術面給出的短中期投資建議（200字以內）。',
  );
  readonly aiUpdatedAt = signal<string | null>(null);
  readonly weeklyPrices = signal<WeeklyPriceCandle[]>([]);
  readonly chartLoading = signal(false);
  readonly chartError = signal<string | null>(null);
  readonly hoveredCandle = signal<WeeklyPriceCandle | null>(null);
  readonly displayedAiUpdatedAt = computed(() =>
    this.aiUpdatedAt() ? this.formatInBrowserTimeZone(this.aiUpdatedAt()!) : '—',
  );

  // --- derived (SA-01 3.3) ---
  readonly reasonablePrice = computed(() => this.tiers()[this.reasonablePriceIndex()]?.value ?? 0);
  readonly targetPrice = computed(() => this.tiers()[this.targetPriceLevel() - 1]?.value ?? 0);

  /**
   * 前目標價出現：近10年（含當年度，若有即時最低價）中，最近一次「該年度最低價 ≤ 目標價」的
   * 年份。純前端計算，改「目標價選擇」下拉選單會立刻跟著變，不用先點「儲存設定」——跟後端
   * TargetPriceValuationService#findFrontYear 用的資料窗口與優先序（新到舊、當年度優先）
   * 完全一致，只是把運算搬到前端執行，資料本身仍來自後端回應的 yearlyLowPrices。
   */
  readonly frontYear = computed<number | null>(() => {
    const target = this.targetPrice();
    const match = this.yearlyLowPrices().find((p) => p.lowPrice <= target);
    return match ? match.year : null;
  });

  /** 目前股票在 Goodinfo 的本益比河流圖網址。 */
  readonly goodinfoPerUrl = computed(
    () =>
      `https://goodinfo.tw/tw/ShowK_ChartFlow.asp?RPT_CAT=PER&STOCK_ID=${encodeURIComponent(this.stockId())}&CHT_CAT=QUAR&PRICE_ADJ=F`,
  );

  /** 目前股票在 Goodinfo 的本淨比河流圖網址。 */
  readonly goodinfoPbrUrl = computed(
    () =>
      `https://goodinfo.tw/tw/ShowK_ChartFlow.asp?RPT_CAT=PBR&STOCK_ID=${encodeURIComponent(this.stockId())}&CHT_CAT=QUAR&PRICE_ADJ=F`,
  );

  /** 與目標價差比 = 現價/目標價 - 1 (DEC-1). */
  readonly gapRatio = computed(() => {
    const target = this.targetPrice();
    return target ? this.currentPrice() / target - 1 : 0;
  });
  readonly isExpensive = computed(() => this.gapRatio() > 0);
  readonly gapPercentAbs = computed(() => Math.abs(this.gapRatio()) * 100);

  readonly plusOneYearDividendPrice = computed(() => this.targetPrice() * (1 + this.tenYearAvgYield()));

  /** X年內買回。null 代表已達成 (現價 <= 目標價), 不顯示負值 (DEC-1). */
  readonly yearsToRecover = computed<number | null>(() => {
    const gap = this.gapRatio();
    if (gap <= 0) return null;
    return Math.log(1 + gap) / Math.log(1 + this.tenYearAvgYield());
  });

  /** 賣賺幾年。null 代表尚未獲利 (現價 <= 合理價), 不顯示負值 (DEC-7). */
  readonly yearsOfProfitIfSold = computed<number | null>(() => {
    const reasonable = this.reasonablePrice();
    if (!reasonable) return null;
    const ratio = this.currentPrice() / reasonable - 1;
    if (ratio <= 0) return null;
    return ratio / this.tenYearAvgYield();
  });

  readonly yieldPercent = computed(() => this.tenYearAvgYield() * 100);
  readonly chartHigh = computed(() => Math.max(...this.weeklyPrices().map((candle) => candle.high), 0));
  readonly chartLow = computed(() => Math.min(...this.weeklyPrices().map((candle) => candle.low), Infinity));
  readonly chartCandles = computed(() => {
    const high = this.chartHigh();
    const low = this.chartLow();
    const range = high - low || 1;
    return this.weeklyPrices().map((candle) => ({
      ...candle,
      wickTop: ((high - candle.high) / range) * 100,
      wickHeight: ((candle.high - candle.low) / range) * 100,
      bodyTop: ((high - Math.max(candle.open, candle.close)) / range) * 100,
      bodyHeight: Math.max((Math.abs(candle.close - candle.open) / range) * 100, 0.8),
      rising: candle.close >= candle.open,
    }));
  });
  readonly chartPriceTicks = computed(() => {
    const high = this.chartHigh();
    const low = this.chartLow();
    if (!Number.isFinite(low) || high <= 0) return [];
    return Array.from({ length: 5 }, (_, index) => ({
      value: high - ((high - low) * index) / 4,
      top: index * 25,
    }));
  });
  readonly chartTimeTicks = computed(() => {
    const candles = this.weeklyPrices();
    if (!candles.length) return [];
    const indexes = [
      0,
      Math.floor((candles.length - 1) / 3),
      Math.floor(((candles.length - 1) * 2) / 3),
      candles.length - 1,
    ];
    return [...new Set(indexes)].map((index) => ({
      label: candles[index].weekStart.slice(0, 7),
      left: candles.length === 1 ? 0 : (index / (candles.length - 1)) * 100,
    }));
  });

  /**
   * 桌面版價位帶的刻度標籤。當幾檔目標價彼此很接近時（例如便宜～昂貴四檔全擠在區間下段），
   * 固定寬度的文字標籤會左右重疊、疊字看不清楚——這裡用簡單的貪婪雙列演算法，遇到跟前一個
   * 同排標籤太近時就交錯放到第二排，兩排都放不下才退回第一排（極端情況下仍可能重疊，但比
   * 全部擠在同一排好很多）。
   */
  readonly tierTicks = computed(() => {
    const LABEL_COLLISION_PCT = 13;
    let lastRow0Pct = -Infinity;
    let lastRow1Pct = -Infinity;
    return this.tiers().map((t) => {
      const pct = this.pct(t.value);
      let row: 0 | 1;
      if (pct - lastRow0Pct >= LABEL_COLLISION_PCT) {
        row = 0;
        lastRow0Pct = pct;
      } else if (pct - lastRow1Pct >= LABEL_COLLISION_PCT) {
        row = 1;
        lastRow1Pct = pct;
      } else {
        row = 0;
        lastRow0Pct = pct;
      }
      return { ...t, pct, row };
    });
  });
  readonly currentPct = computed(() => this.pct(this.currentPrice()));

  readonly mobileRows = computed<MobileRow[]>(() => {
    const sorted = [...this.tiers()].sort((a, b) => b.value - a.value);
    const rows: MobileRow[] = [];
    let inserted = false;
    for (const tier of sorted) {
      if (!inserted && this.currentPrice() >= tier.value) {
        rows.push({ type: 'note' });
        inserted = true;
      }
      rows.push({ type: 'tier', tier });
    }
    if (!inserted) rows.push({ type: 'note' });
    return rows;
  });

  constructor() {
    // Re-loads whenever the routed :stockId changes (e.g. clicking a different favorite/search
    // result while already on this screen - the component instance is reused, not recreated).
    effect(() => {
      const stockId = this.stockId();
      this.loadStock(stockId);
      this.weeklyPrices.set([]);
      this.chartError.set(null);
    });
  }

  /** 載入近三年週 K；圖表失敗不影響目標價主資料顯示。 */
  loadWeeklyPrices(stockId: string, forceRefresh = false): void {
    this.chartLoading.set(true);
    this.chartError.set(null);
    this.weeklyPrices.set([]);
    this.dataService.loadWeeklyPrices(stockId, forceRefresh).subscribe({
      next: (candles) => {
        this.weeklyPrices.set(candles);
        this.chartLoading.set(false);
      },
      error: () => {
        this.chartLoading.set(false);
        this.chartError.set('無法載入股價 K 線，請稍後再試。');
      },
    });
  }

  /** 重新載入目前路由指定的股票資料。 */
  loadStock(stockId: string): void {
    this.loaded.set(false);
    this.loadError.set(null);
    this.actionMessage.set(null);
    this.dataService.load(stockId).subscribe({
      next: (data) => {
        this.applyData(data);
        this.loaded.set(true);
      },
      error: () => {
        this.loadError.set('無法載入股票資料，請確認後端服務與網路連線後重試。');
      },
    });
  }

  onEpsYearsChange(value: AvgYears): void {
    this.epsAvgYears.set(value);
    this.refreshSettingNoteIfNotDirty();
  }

  onBpsYearsChange(value: AvgYears): void {
    this.bpsAvgYears.set(value);
    this.refreshSettingNoteIfNotDirty();
  }

  onSettingNoteInput(value: string): void {
    this.settingNote.set(value);
    this.settingNoteDirty = true;
  }

  toggleValuationCollapsed(): void {
    this.valuationCollapsed.update((v) => !v);
  }

  onRefresh(): void {
    if (this.refreshing()) return;
    this.refreshing.set(true);
    this.actionMessage.set(null);
    this.dataService.refresh(this.stockId()).subscribe({
      next: (data) => {
        this.applyData(data);
        this.loadWeeklyPrices(this.stockId(), true);
        this.refreshing.set(false);
        this.actionMessage.set('市場資料已更新。');
      },
      error: () => {
        this.refreshing.set(false);
        this.actionMessage.set('市場資料更新失敗，請稍後再試。');
      },
    });
  }

  /** 儲存目前畫面中的設定，成功後套用後端重新計算的完整結果。 */
  onSaveSettings(): void {
    if (this.savingSettings()) return;
    if (this.epsAvgYears() === 0 && this.bpsAvgYears() === 0) {
      this.actionMessage.set('EPS 與 BPS 至少需要參考一項。');
      return;
    }
    this.savingSettings.set(true);
    this.actionMessage.set(null);
    this.dataService.updateSettings(this.stockId(), {
      investmentStrategy: this.investmentStrategy(),
      epsAvgYears: this.epsAvgYears(),
      bpsAvgYears: this.bpsAvgYears(),
      settingNote: this.settingNote(),
      targetPriceLevel: this.targetPriceLevel(),
    }).subscribe({
      next: (data) => {
        this.applyData(data);
        this.savingSettings.set(false);
        this.actionMessage.set('設定已儲存。');
      },
      error: () => {
        this.savingSettings.set(false);
        this.actionMessage.set('設定儲存失敗，請檢查內容後再試。');
      },
    });
  }

  onRequestAiSuggestion(): void {
    if (this.aiLoading()) return;
    this.aiLoading.set(true);
    this.actionMessage.set(null);
    this.dataService.requestAiSuggestion(this.stockId()).subscribe({
      next: (suggestion) => {
        this.aiText.set(suggestion.text);
        this.aiUpdatedAt.set(suggestion.updatedAt);
        this.aiLoading.set(false);
        this.actionMessage.set('AI 投資建議已更新。');
      },
      error: () => {
        this.aiLoading.set(false);
        this.actionMessage.set('AI 投資建議產生失敗，原有建議已保留，請稍後再試。');
      },
    });
  }

  tierColor(n: number): string {
    return `var(--tier-${n})`;
  }

  /** 建立 K 棒滑鼠提示文字，顯示交易週與 OHLC 金額。 */
  candleTooltip(candle: WeeklyPriceCandle): string {
    const money = new Intl.NumberFormat('zh-TW', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    return [
      `日期：${candle.weekStart}`,
      `開盤：${money.format(candle.open)}`,
      `最高：${money.format(candle.high)}`,
      `最低：${money.format(candle.low)}`,
      `收盤：${money.format(candle.close)}`,
    ].join('\n');
  }

  private refreshSettingNoteIfNotDirty(): void {
    if (this.settingNoteDirty) return;
    const epsNote = this.epsAvgYears() === 0 ? 'EPS不參考' : `EPS取近${this.epsAvgYears()}年平均`;
    const bpsNote = this.bpsAvgYears() === 0 ? 'BPS不參考' : `BPS取近${this.bpsAvgYears()}年平均`;
    this.settingNote.set(`${epsNote}、${bpsNote}`);
  }

  /** 將後端完整 response 套用到畫面 signals。 */
  private applyData(data: TargetPriceData): void {
    this.stockName.set(data.stockName);
    this.industryCategory.set(data.industryCategory);
    this.currentPrice.set(data.currentPrice);
    this.low10.set(data.low10);
    this.high10.set(data.high10);
    this.tenYearAvgYield.set(data.tenYearAvgYield);
    this.dividendDate.set(data.dividendDate || '—');
    this.lastUpdated.set(data.lastUpdated || '—');
    this.tiers.set(data.tiers);
    this.reasonablePriceIndex.set(data.reasonablePriceIndex);
    this.yearlyLowPrices.set(data.yearlyLowPrices);
    this.investmentStrategy.set(data.investmentStrategy || '');
    this.epsAvgYears.set(data.epsAvgYears);
    this.bpsAvgYears.set(data.bpsAvgYears);
    this.settingNote.set(data.settingNote || '');
    this.targetPriceLevel.set(data.targetPriceLevel);
    this.aiText.set(data.aiSuggestion?.text ?? '目前尚無 AI 投資建議。');
    this.aiUpdatedAt.set(data.aiSuggestion?.updatedAt ?? null);
    this.settingNoteDirty = false;
  }

  private pct(value: number): number {
    const lo = this.low10();
    const hi = this.high10();
    if (hi === lo) return 0;
    return Math.max(0, Math.min(100, ((value - lo) / (hi - lo)) * 100));
  }

  /** 將後端 ISO timestamp 轉成瀏覽器所在時區；無法解析時保留原值。 */
  private formatInBrowserTimeZone(value: string): string {
    if (!value || value === '—') return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);
  }
}

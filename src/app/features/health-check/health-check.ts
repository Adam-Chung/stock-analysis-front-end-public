import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FavoriteToggleComponent } from '../../core/favorite-toggle/favorite-toggle';
import { HealthCheckDataService } from './health-check-data.service';
import { HealthCheckCategoryComponent } from './health-check-category/health-check-category';
import type { HealthCheckNoteChange } from './health-check-category/health-check-category';
import { HealthCheckData, HealthCheckMetric } from './health-check.model';

/** 銀行模板「營收(月)」表格的一列（DEC-062：三個 metric 合併成一張表，共用一個筆記欄位）。 */
interface BankRevenueRow {
  period: string;
  monthlyRevenue: number | null;
  momGrowth: number | null;
  yoyGrowth: number | null;
}

/**
 * SA-03「企業體質檢視」畫面。一般模板／銀行模板由後端依 DEC-028 自動判斷（{@link HealthCheckData.template}），
 * 這個頁面元件是兩種模板共用的單一路由進入點——差異只在於是否顯示銀行專屬的「股價變化」表格，
 * 其餘（公司資訊／總覽／檢視項目清單）完全共用 {@link HealthCheckCategoryComponent} 等建構元件，
 * 因為模板差異在後端已經反映成「回傳哪些 categories」，前端不需要另外用 if/else 分支重複組一次畫面。
 *
 * ⚠️ 與 SA-03 §3 原始規劃（一般/銀行各自獨立 route/component）的差異：後端要先組完
 * GET 回應才知道套用哪個模板，路由層無法在打 API 之前就決定要導去哪個 component；因此改為
 * 單一路由 + 依 template 分支渲染銀行專屬區塊，而非兩個獨立 route。已在對話中向使用者說明，
 * 如果仍想要兩個實體路由，之後可以再拆。
 *
 * 細項數值不開放直接編輯（改版後的決定）——資料來源是「更新本季資料」按鈕觸發的外部同步
 * （DEC-046~050）或既有資料；筆記則是每項各自獨立儲存（見 {@link onSaveNote}），跟「更新
 * 本季資料」按鈕（純外部同步）互不相關。
 */
@Component({
  selector: 'app-health-check',
  imports: [HealthCheckCategoryComponent, RouterLink, FormsModule, DatePipe, FavoriteToggleComponent],
  templateUrl: './health-check.html',
  styleUrl: './health-check.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HealthCheck {
  private readonly dataService = inject(HealthCheckDataService);

  /** Bound from the :stockId route param via withComponentInputBinding() (app.config.ts). */
  readonly stockId = input.required<string>();

  readonly loaded = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly data = signal<HealthCheckData | null>(null);

  /** 進頁面預設收合，跟 prototype 一致（先收起來，需要再展開）。 */
  readonly infoPanelCollapsed = signal(true);
  /** 銀行模板專屬兩張表格（營收(月)／股價變化）預設收合，跟其餘檢視項目大項一致。 */
  readonly bankRevenueCollapsed = signal(true);
  readonly priceTrendCollapsed = signal(true);
  readonly profileText = signal('');
  readonly customNoteText = signal('');
  readonly savingProfile = signal(false);
  readonly externalSyncing = signal(false);
  readonly actionMessage = signal<string | null>(null);

  /** AI 投資建議卡片（DEC-068 後續實作）：載入時顯示已快取的建議，按鈕觸發才重新產生。 */
  readonly aiLoading = signal(false);
  readonly aiText = signal<string | null>(null);
  readonly aiUpdatedAt = signal<string | null>(null);

  /** key 為 metricKey；使用者本輪還沒送出／已送出的筆記文字（純本地暫存，見 onNoteInput）。 */
  readonly edits = signal<Record<string, HealthCheckNoteChange>>({});
  /** 目前正在呼叫後端儲存筆記的 metricKey 集合。 */
  readonly savingNoteKeys = signal<ReadonlySet<string>>(new Set());

  /** 進頁面預設全部收合，配合 HealthCheckCategoryComponent 自己的預設收合狀態。 */
  readonly allExpanded = signal(false);
  readonly collapseSignal = signal<{ value: boolean; token: number } | null>(null);
  private collapseTokenSeq = 0;

  readonly overallCounts = computed(() => {
    const data = this.data();
    if (!data) return { pass: 0, evaluated: 0 };
    let pass = 0;
    let evaluated = 0;
    for (const category of data.categories) {
      for (const metric of category.metrics) {
        const status = metric.periods[0]?.status ?? 'NA';
        if (status === 'PASS' || status === 'FAIL') {
          evaluated++;
          if (status === 'PASS') pass++;
        }
      }
    }
    return { pass, evaluated };
  });

  readonly categoryCount = computed(() => this.data()?.categories.length ?? 0);

  /** 銀行模板「營收(月)」大項：不透過通用的 app-health-check-category 渲染，改成一張表
   *（DEC-062，使用者要求把 monthlyRevenue／momGrowth／yoyGrowth 三個 metric 合併顯示，
   * 只留一個筆記欄位，不是每個 metric 各自一個）。 */
  private readonly bankRevenueCategory = computed(
    () => this.data()?.categories.find((c) => c.key === 'bankRevenue') ?? null,
  );

  private readonly bankRevenueNoteMetric = computed<HealthCheckMetric | null>(
    () => this.bankRevenueCategory()?.metrics.find((m) => m.key === 'bankRevenue.monthlyRevenue') ?? null,
  );

  readonly bankRevenueRows = computed<BankRevenueRow[]>(() => {
    const category = this.bankRevenueCategory();
    if (!category) return [];
    const revenue = category.metrics.find((m) => m.key === 'bankRevenue.monthlyRevenue');
    const mom = category.metrics.find((m) => m.key === 'bankRevenue.momGrowth');
    const yoy = category.metrics.find((m) => m.key === 'bankRevenue.yoyGrowth');
    const valueAt = (metric: HealthCheckMetric | undefined, period: string) =>
      metric?.periods.find((p) => p.period === period)?.value ?? null;

    const periods = new Set<string>();
    for (const metric of [revenue, mom, yoy]) {
      metric?.periods.forEach((p) => periods.add(p.period));
    }
    return Array.from(periods)
      .sort((a, b) => b.localeCompare(a))
      .map((period) => ({
        period,
        monthlyRevenue: valueAt(revenue, period),
        momGrowth: valueAt(mom, period),
        yoyGrowth: valueAt(yoy, period),
      }));
  });

  constructor() {
    // Re-loads whenever the routed :stockId changes (component instance is reused).
    effect(() => {
      this.loadStock(this.stockId());
    });
  }

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
        this.loadError.set('無法載入企業體質資料，請確認後端服務與網路連線後重試。');
      },
    });
  }

  /** 輸入框內容變動：只更新本地暫存文字，不呼叫後端（見 {@link onSaveNote}）。 */
  onNoteInput(change: HealthCheckNoteChange): void {
    this.edits.update((current) => ({ ...current, [change.metricKey]: change }));
  }

  /** 單一細項的「儲存」按鈕：只送這一筆筆記，跟「更新本季資料」（外部同步）完全獨立。 */
  onSaveNote(change: HealthCheckNoteChange): void {
    this.savingNoteKeys.update((keys) => new Set(keys).add(change.metricKey));
    this.dataService
      .updateSnapshot(this.stockId(), {
        reviewedQuarter: nowQuarterLabel(),
        entries: [{ metricKey: change.metricKey, period: change.period, value: change.value, note: change.note || null }],
      })
      .subscribe({
        next: () => {
          this.savingNoteKeys.update((keys) => {
            const next = new Set(keys);
            next.delete(change.metricKey);
            return next;
          });
          this.actionMessage.set('筆記已儲存。');
        },
        error: () => {
          this.savingNoteKeys.update((keys) => {
            const next = new Set(keys);
            next.delete(change.metricKey);
            return next;
          });
          this.actionMessage.set('筆記儲存失敗，請稍後再試。');
        },
      });
  }

  /** 「營收(月)」表格共用的單一筆記欄位，綁定在 bankRevenue.monthlyRevenue 這個 metric 上。 */
  bankRevenueNote(): string {
    const metric = this.bankRevenueNoteMetric();
    if (!metric) return '';
    const edit = this.edits()[metric.key];
    if (edit) return edit.note;
    return metric.periods[0]?.note ?? '';
  }

  isBankRevenueNoteSaving(): boolean {
    const metric = this.bankRevenueNoteMetric();
    return metric ? this.savingNoteKeys().has(metric.key) : false;
  }

  onBankRevenueNoteInput(note: string): void {
    const metric = this.bankRevenueNoteMetric();
    const latest = metric?.periods[0];
    if (!metric || !latest) return;
    this.onNoteInput({ metricKey: metric.key, period: latest.period, value: latest.value, note });
  }

  onBankRevenueNoteSave(): void {
    const metric = this.bankRevenueNoteMetric();
    const latest = metric?.periods[0];
    if (!metric || !latest) return;
    this.onSaveNote({ metricKey: metric.key, period: latest.period, value: latest.value, note: this.bankRevenueNote() });
  }

  toggleInfoPanel(): void {
    this.infoPanelCollapsed.update((v) => !v);
  }

  toggleBankRevenueCollapsed(): void {
    this.bankRevenueCollapsed.update((v) => !v);
  }

  togglePriceTrendCollapsed(): void {
    this.priceTrendCollapsed.update((v) => !v);
  }

  toggleAllCategories(): void {
    const nextExpanded = !this.allExpanded();
    this.allExpanded.set(nextExpanded);
    this.collapseSignal.set({ value: !nextExpanded, token: ++this.collapseTokenSeq });
  }

  onSaveProfile(): void {
    if (this.savingProfile()) return;
    this.savingProfile.set(true);
    this.actionMessage.set(null);
    this.dataService
      .updateProfile(this.stockId(), { profile: this.profileText(), customNote: this.customNoteText() })
      .subscribe({
        next: (data) => {
          this.applyData(data);
          this.savingProfile.set(false);
          this.actionMessage.set('公司資訊已儲存。');
        },
        error: () => {
          this.savingProfile.set(false);
          this.actionMessage.set('公司資訊儲存失敗，請稍後再試。');
        },
      });
  }

  /**
   * 「更新本季資料」按鈕：只觸發外部資料同步（DEC-046~050），跟筆記儲存完全無關。成功後
   * 重新載入畫面取得同步寫入的最新數值。整個流程可能耗時數十秒，期間顯示提示文字。
   *
   * 後端同步實際上整合了兩個各自獨立、各自可能失敗的來源（TWSE/銀行局＋FinMind，
   * DEC-053）——任一來源成功就會回 200，失敗的來源記錄在 {@link ExternalSyncResult.warnings}，
   * 這裡要把 warnings 附加顯示出來，不然使用者只會看到「已更新 N 個細項」但看不出 N
   * 為什麼比預期少（見對話中使用者指出的落差）。
   */
  onUpdateAll(): void {
    if (this.externalSyncing()) return;
    this.externalSyncing.set(true);
    this.actionMessage.set('外部資料同步中，這可能需要數十秒，請耐心等候…');
    this.dataService.triggerExternalSync(this.stockId()).subscribe({
      next: (result) => {
        this.dataService.load(this.stockId()).subscribe({
          next: (data) => {
            this.applyData(data);
            this.externalSyncing.set(false);
            const summary = `外部資料同步完成，已更新 ${result.syncedMetricKeys.length} 個細項。`;
            this.actionMessage.set(appendWarnings(summary, result.warnings));
          },
          error: () => {
            this.externalSyncing.set(false);
            this.actionMessage.set('同步成功，但重新載入畫面失敗，請手動重新整理頁面。');
          },
        });
      },
      error: () => {
        this.externalSyncing.set(false);
        this.actionMessage.set('外部資料同步失敗，可能是外部資料來源逾時，或這支股票尚未設定銀行名稱對照。');
      },
    });
  }

  /**
   * 只有使用者明確按下按鈕時才要求後端重新產生 AI 投資建議（比照「更新本季資料」的免費額度
   * 保護慣例，不在進頁面時自動觸發）。失敗時保留原本已快取的建議文字，只提示錯誤訊息。
   */
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

  private applyData(data: HealthCheckData): void {
    this.data.set(data);
    this.profileText.set(data.profile.profile ?? '');
    this.customNoteText.set(data.profile.customNote ?? '');
    this.edits.set({});
    this.aiText.set(data.aiSuggestion?.text ?? null);
    this.aiUpdatedAt.set(data.aiSuggestion?.updatedAt ?? null);
  }
}

/** 依瀏覽器目前日期算出 'YYYYQ#' 格式的本季標籤，跟後端 stock_health_snapshot.quarter 格式一致。 */
function nowQuarterLabel(): string {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  return `${now.getFullYear()}Q${quarter}`;
}

/** 把外部同步部分失敗的 warnings（DEC-053）附加到成功訊息後面；沒有 warnings 時原樣回傳。 */
function appendWarnings(summary: string, warnings: string[]): string {
  if (!warnings || warnings.length === 0) return summary;
  return `${summary} ⚠️ ${warnings.join('；')}`;
}

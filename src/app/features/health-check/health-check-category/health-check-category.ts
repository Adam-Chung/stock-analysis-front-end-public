import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HealthCheckCategory, HealthCheckMetric, HealthCheckPeriodValue, HealthCheckStatus } from '../health-check.model';

export interface HealthCheckNoteChange {
  metricKey: string;
  period: string;
  value: number | null;
  note: string;
}

const STATUS_LABEL: Record<HealthCheckStatus, string> = {
  PASS: '達標',
  FAIL: '不達標',
  JUDGMENT: '趨勢判斷',
  NA: '尚無資料',
};

/**
 * SA-03 §3 共用建構元件：一個檢視大項（可收合），底下逐項顯示「近幾期唯讀數值 chip 排成一排
 * （最新一期在最前面並高亮）＋一個筆記欄位（各自獨立的儲存按鈕）」，格式對照 prototype
 * （`stock-health-prototype.html`）。細項的數值不開放直接編輯——資料來源是「更新本季資料」
 * 按鈕觸發的外部同步（DEC-046~050）或既有資料；筆記則是每項各自獨立儲存，跟同步按鈕無關。
 * 達標狀態直接採用後端算好的 {@link HealthCheckPeriodValue.status}，不在前端重算。
 */
@Component({
  selector: 'app-health-check-category',
  imports: [FormsModule],
  templateUrl: './health-check-category.html',
  styleUrl: './health-check-category.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HealthCheckCategoryComponent {
  readonly category = input.required<HealthCheckCategory>();
  /** key 為 metricKey；本輪編輯中（尚未點「儲存」，或已成功儲存）的筆記文字。 */
  readonly edits = input.required<Record<string, HealthCheckNoteChange>>();
  /** 目前正在呼叫後端儲存筆記的 metricKey 集合，用來停用對應的「儲存」按鈕。 */
  readonly savingKeys = input.required<ReadonlySet<string>>();
  /**
   * 父層「全部收合／展開」按鈕觸發：{@code value} 是這次要套用的收合狀態，{@code token} 每次
   * 點擊都遞增——即使兩次點擊碰巧要套用同一個 boolean 值，遞增的 token 也能讓下面的 effect
   * 確實重新套用一次，而不是被 Angular 的變更偵測誤判成「值沒變、不需要重跑」。
   */
  readonly forceCollapsed = input<{ value: boolean; token: number } | null>(null);

  /** 每次輸入框內容變動時觸發（僅更新本地暫存文字，不呼叫後端）。 */
  readonly noteInput = output<HealthCheckNoteChange>();
  /** 點擊「儲存」按鈕時觸發——這才是真正呼叫後端的時機。 */
  readonly noteSave = output<HealthCheckNoteChange>();

  /** 進入頁面預設收合，跟 prototype 一致的「先收起來，需要再展開」體驗。 */
  readonly collapsed = signal(true);

  readonly statusLabel = STATUS_LABEL;

  constructor() {
    effect(() => {
      const force = this.forceCollapsed();
      if (force !== null) {
        this.collapsed.set(force.value);
      }
    });
  }

  readonly passFailCount = computed(() => {
    let pass = 0;
    let evaluated = 0;
    for (const metric of this.category().metrics) {
      const status = this.latestPeriod(metric)?.status ?? 'NA';
      if (status === 'PASS' || status === 'FAIL') {
        evaluated++;
        if (status === 'PASS') pass++;
      }
    }
    return { pass, evaluated };
  });

  toggleCollapsed(): void {
    this.collapsed.update((v) => !v);
  }

  latestPeriod(metric: HealthCheckMetric): HealthCheckPeriodValue | null {
    return metric.periods[0] ?? null;
  }

  /**
   * {@code autofillNoteWithValue} 的細項（目前只有盈餘總分配率）在使用者還沒存過任何筆記時，
   * 預設帶入已算好的數值（格式化後）當起始文字，方便直接接著補充判斷依據——一旦後端已經有
   * 存過的筆記（即使是空字串），就不再覆蓋，一律顯示實際存的內容。
   */
  currentNote(metric: HealthCheckMetric): string {
    const edit = this.edits()[metric.key];
    if (edit) return edit.note;
    const latest = this.latestPeriod(metric);
    const savedNote = latest?.note ?? '';
    if (savedNote) return savedNote;
    if (metric.autofillNoteWithValue && latest && latest.value !== null) {
      return this.fmt(metric, latest.value);
    }
    return '';
  }

  isSaving(metric: HealthCheckMetric): boolean {
    return this.savingKeys().has(metric.key);
  }

  onNoteInput(metric: HealthCheckMetric, note: string): void {
    const latest = this.latestPeriod(metric);
    if (!latest) return;
    this.noteInput.emit({ metricKey: metric.key, period: latest.period, value: latest.value, note });
  }

  onSaveNoteClick(metric: HealthCheckMetric): void {
    const latest = this.latestPeriod(metric);
    if (!latest) return;
    this.noteSave.emit({ metricKey: metric.key, period: latest.period, value: latest.value, note: this.currentNote(metric) });
  }

  /** {@link HealthCheckMetric.isAnnual} 為 true 時，「YYYYQ4」只顯示年份「YYYY」（DEC-066）。 */
  periodLabel(metric: HealthCheckMetric, period: string): string {
    if (metric.isAnnual && period.endsWith('Q4')) {
      return period.slice(0, -2);
    }
    return period;
  }

  fmt(metric: HealthCheckMetric, value: number | null): string {
    if (value === null || value === undefined) return '—';
    const digits = Math.abs(value) < 10 ? 2 : Math.abs(value) < 1000 ? 1 : 0;
    return value.toLocaleString('zh-TW', { maximumFractionDigits: digits }) + (metric.unit || '');
  }
}

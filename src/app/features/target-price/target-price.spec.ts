import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { TargetPrice } from './target-price';

const RESPONSE = {
  stockId: '2330',
  stockName: '台積電',
  industryCategory: '半導體業',
  currentPrice: 1075,
  currentPriceDate: '2026-07-29',
  low10: 320,
  high10: 1180,
  tenYearAvgYield: 0.028,
  dividendDate: '2026-06-18',
  lastUpdated: '2026-07-29T01:15:00Z',
  tiers: [
    { level: 1, label: '1 便宜價', price: 620 },
    { level: 2, label: '2 次便宜', price: 715 },
    { level: 3, label: '3 合理價', price: 810 },
    { level: 4, label: '4 昂貴價', price: 940 },
    { level: 5, label: '5 超貴價', price: 1020 },
    { level: 6, label: '6 爆炸貴', price: 1100 },
  ],
  targetPrice: 810,
  gapRatio: 0.3272,
  plusOneYearDividendPrice: 832.68,
  yearsToRecover: 10.25,
  yearsOfProfitIfSold: 11.68,
  frontYear: 2022,
  yearlyLowPrices: [
    { year: 2025, lowPrice: 900 },
    { year: 2024, lowPrice: 850 },
    { year: 2023, lowPrice: 830 },
    { year: 2022, lowPrice: 780 },
    { year: 2021, lowPrice: 600 },
  ],
  investmentStrategy: '長期存股',
  epsAvgYears: 5,
  bpsAvgYears: 5,
  settingNote: 'EPS取近5年平均、BPS取近5年平均',
  targetPriceLevel: 3,
  dataCoverage: {},
  aiSuggestion: null,
};

const WEEKLY_PRICES = [
  { weekStart: '2026-07-20', open: 1000, high: 1080, low: 990, close: 1075 },
  { weekStart: '2026-07-27', open: 1070, high: 1090, low: 1050, close: 1060 },
];

describe('TargetPrice', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    environment.useMockApi = false;
    await TestBed.configureTestingModule({
      imports: [TargetPrice],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    environment.useMockApi = true;
  });

  function createLoaded() {
    const fixture = TestBed.createComponent(TargetPrice);
    fixture.componentRef.setInput('stockId', '2330');
    fixture.detectChanges();
    http
      .expectOne(`${environment.apiBaseUrl}/api/stocks/2330/target-price`)
      .flush(RESPONSE);
    fixture.detectChanges();
    return fixture;
  }

  it('shows loading before the API responds and then renders real data', () => {
    const fixture = TestBed.createComponent(TargetPrice);
    fixture.componentRef.setInput('stockId', '2330');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('正在載入股票資料');

    http.expectOne(`${environment.apiBaseUrl}/api/stocks/2330/target-price`).flush(RESPONSE);
    fixture.detectChanges();
    expect(fixture.componentInstance.stockName()).toBe('台積電');
    expect(fixture.componentInstance.tiers()).toHaveLength(6);
  });

  it('shows a retryable error when loading fails', () => {
    const fixture = TestBed.createComponent(TargetPrice);
    fixture.componentRef.setInput('stockId', '2330');
    fixture.detectChanges();
    http
      .expectOne(`${environment.apiBaseUrl}/api/stocks/2330/target-price`)
      .flush({}, { status: 500, statusText: 'Server error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('無法載入股票資料');
    expect(fixture.nativeElement.textContent).toContain('重新載入');
  });

  it('computes the selected target-price gap from real API values', () => {
    const component = createLoaded().componentInstance;
    expect(component.targetPrice()).toBe(810);
    expect(component.gapRatio()).toBeCloseTo(0.3272, 3);
    expect(component.yearsToRecover()).toBeCloseTo(10.25, 1);
  });

  it('starts with 估值設定 collapsed (only takes visual effect at mobile widths via CSS)', () => {
    const component = createLoaded().componentInstance;
    expect(component.valuationCollapsed()).toBe(true);

    component.toggleValuationCollapsed();
    expect(component.valuationCollapsed()).toBe(false);
  });

  it('recomputes 前目標價出現 instantly when 目標價選擇 changes, without a new API call', () => {
    const component = createLoaded().componentInstance;
    // tier 3 (合理價=810): most recent year with lowPrice<=810 is 2022 (780<=810).
    expect(component.frontYear()).toBe(2022);

    // switching to tier 1 (便宜價=620) locally must update the derived signal on its own -
    // http.verify() in afterEach fails the test if this triggers an unexpected request.
    component.targetPriceLevel.set(1);
    expect(component.frontYear()).toBe(2021);
  });

  it('formats the backend timestamp in the browser time zone', () => {
    const component = createLoaded().componentInstance;
    const expected = new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date(RESPONSE.lastUpdated));

    expect(component.displayedLastUpdated()).toBe(expected);
  });

  it('persists settings through the backend API', () => {
    const component = createLoaded().componentInstance;
    const recalculatedTiers = RESPONSE.tiers.map((tier, index) => ({
      ...tier,
      price: tier.price + (index + 1) * 100,
    }));
    component.onEpsYearsChange(0);
    component.onSaveSettings();

    const request = http.expectOne(
      `${environment.apiBaseUrl}/api/stocks/2330/target-price/settings`,
    );
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.epsAvgYears).toBe(0);
    request.flush({ ...RESPONSE, epsAvgYears: 0, tiers: recalculatedTiers });

    expect(component.epsAvgYears()).toBe(0);
    expect(component.tiers().map((tier) => tier.value)).toEqual(
      recalculatedTiers.map((tier) => tier.price),
    );
    expect(component.actionMessage()).toBe('設定已儲存。');
  });

  it('builds Goodinfo valuation links from the current stock ID', () => {
    const fixture = createLoaded();
    const links = fixture.nativeElement.querySelectorAll(
      '.valuation-link',
    ) as NodeListOf<HTMLAnchorElement>;

    expect(links).toHaveLength(2);
    expect(links[0].textContent).toContain('本益比河流圖');
    expect(links[0].href).toContain('RPT_CAT=PER');
    expect(links[0].href).toContain('STOCK_ID=2330');
    expect(links[1].textContent).toContain('本淨比河流圖');
    expect(links[1].href).toContain('RPT_CAT=PBR');
    expect(links[1].href).toContain('STOCK_ID=2330');
    expect(links[0].target).toBe('_blank');
    expect(links[0].rel).toBe('noopener noreferrer');
  });

  it('generates an AI suggestion and updates its cached timestamp', () => {
    const fixture = createLoaded();
    const component = fixture.componentInstance;

    component.onRequestAiSuggestion();
    expect(component.aiLoading()).toBe(true);

    const request = http.expectOne(
      `${environment.apiBaseUrl}/api/stocks/2330/target-price/ai-suggestion`,
    );
    expect(request.request.method).toBe('POST');
    request.flush({
      text: '產業需求仍有支撐，但估值偏高。僅供研究參考，非投資建議',
      updatedAt: '2026-07-30T01:55:14Z',
    });
    fixture.detectChanges();

    expect(component.aiLoading()).toBe(false);
    expect(component.aiText()).toContain('估值偏高');
    expect(component.aiUpdatedAt()).toBe('2026-07-30T01:55:14Z');
    expect(component.actionMessage()).toBe('AI 投資建議已更新。');
    expect(fixture.nativeElement.textContent).toContain('重新產生 AI 建議');
  });

  it('staggers price-band tick labels onto a second row when they would overlap', () => {
    // low10=320, high10=1180 (range 860); consecutive tiers 11-percentage-points apart collide
    // under the 13% threshold and must alternate rows so the labels stay legible.
    const component = createLoaded().componentInstance;
    const rows = component.tierTicks().map((t) => t.row);
    expect(rows).toEqual([0, 1, 0, 0, 1, 0]);
  });

  it('shows 10年低/10年高 as their own rows in the mobile price-band list, matching the tiers below', () => {
    const fixture = createLoaded();
    const rangeRows = fixture.nativeElement.querySelectorAll('.range-row');
    expect(rangeRows).toHaveLength(2);
    expect(rangeRows[0].textContent).toContain('10年高');
    expect(rangeRows[0].textContent).toContain('1,180');
    expect(rangeRows[1].textContent).toContain('10年低');
    expect(rangeRows[1].textContent).toContain('320');
  });

  it('keeps the existing AI suggestion when generation fails', () => {
    const fixture = createLoaded();
    const component = fixture.componentInstance;
    component.aiText.set('原有建議');

    component.onRequestAiSuggestion();
    http
      .expectOne(`${environment.apiBaseUrl}/api/stocks/2330/target-price/ai-suggestion`)
      .flush({}, { status: 502, statusText: 'Bad Gateway' });

    expect(component.aiLoading()).toBe(false);
    expect(component.aiText()).toBe('原有建議');
    expect(component.actionMessage()).toContain('原有建議已保留');
  });

  it('supports excluding one valuation branch and blocks excluding both', () => {
    const fixture = createLoaded();
    const component = fixture.componentInstance;
    const selects = fixture.nativeElement.querySelectorAll('select') as NodeListOf<HTMLSelectElement>;
    expect(Array.from(selects).filter((select) => select.textContent?.includes('不參考'))).toHaveLength(2);

    component.onEpsYearsChange(0);
    expect(component.settingNote()).toContain('EPS不參考');
    component.onBpsYearsChange(0);
    component.onSaveSettings();

    expect(component.actionMessage()).toContain('至少需要參考一項');
    expect(component.savingSettings()).toBe(false);
  });

  it('renders weekly candlesticks and their three-year range', () => {
    const fixture = createLoaded();
    const component = fixture.componentInstance;

    expect(fixture.nativeElement.textContent).toContain('請按上方「更新」');
    component.onRefresh();
    http.expectOne(`${environment.apiBaseUrl}/api/stocks/2330/target-price/refresh`).flush(RESPONSE);
    const chartRequest = http.expectOne(
      (request) => request.url === `${environment.apiBaseUrl}/api/stocks/2330/weekly-prices`,
    );
    expect(chartRequest.request.params.get('refresh')).toBe('true');
    chartRequest.flush(WEEKLY_PRICES);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('週線・近三年');
    expect(fixture.nativeElement.querySelectorAll('.candle')).toHaveLength(2);
    expect(fixture.componentInstance.chartLow()).toBe(990);
    expect(fixture.componentInstance.chartHigh()).toBe(1090);
    expect(fixture.nativeElement.querySelector('.candle').getAttribute('data-tooltip')).toContain(
      '日期：2026-07-20\n開盤：1,000',
    );
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { FavoriteUpdate } from './favorite-update';

describe('FavoriteUpdate', () => {
  afterEach(() => {
    environment.useMockApi = false;
  });

  it('updates the table and builds stock links', async () => {
    environment.useMockApi = false;
    await TestBed.configureTestingModule({
      imports: [FavoriteUpdate],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(FavoriteUpdate);
    fixture.detectChanges();
    fixture.componentInstance.refreshAll();
    TestBed.inject(HttpTestingController).expectOne(`${environment.apiBaseUrl}/api/favorites/refresh`).flush([{
      stockId: '2330', stockName: '台積電', latestPrice: 100, targetPrice: 80, targetPriceLabel: '合理價', gapRatio: .25,
      latestDataQuarter: '2026 Q2', investmentStrategy: '長期持有', errorMessage: null,
    }]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('25.0%');
    expect(fixture.nativeElement.querySelector('.target-label').textContent).toContain('合理價');
    expect(fixture.nativeElement.querySelector('.positive-gap')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe('/target-price/2330');
    expect(fixture.nativeElement.querySelector('.goodinfo-link').href).toContain('STOCK_ID=2330');
  });

  it('returns table fixtures without calling the backend in mock mode', async () => {
    environment.useMockApi = true;
    await TestBed.configureTestingModule({
      imports: [FavoriteUpdate],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(FavoriteUpdate);
    fixture.componentInstance.refreshAll();
    await new Promise((resolve) => setTimeout(resolve, 550));
    fixture.detectChanges();

    expect(fixture.componentInstance.rows()).toHaveLength(4);
    expect(TestBed.inject(HttpTestingController).match(() => true)).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('.positive-gap')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.negative-gap')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('更新失敗，請稍後重試');
  });
});

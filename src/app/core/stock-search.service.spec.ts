import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { StockSearchService } from './stock-search.service';

describe('StockSearchService', () => {
  let service: StockSearchService;
  let http: HttpTestingController;

  beforeEach(() => {
    environment.useMockApi = false;
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(StockSearchService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    environment.useMockApi = true;
  });

  it('calls the real search endpoint with the trimmed query', async () => {
    const resultPromise = firstValueFrom(service.search('  台積  '));
    const request = http.expectOne(
      `${environment.apiBaseUrl}/api/stocks/search?q=${encodeURIComponent('台積')}`,
    );
    expect(request.request.method).toBe('GET');
    request.flush([{ stockId: '2330', stockName: '台積電', industryCategory: '半導體業' }]);

    await expect(resultPromise).resolves.toHaveLength(1);
  });

  it('returns an empty list for a blank query without calling the backend', async () => {
    await expect(firstValueFrom(service.search('   '))).resolves.toEqual([]);
    http.expectNone(`${environment.apiBaseUrl}/api/stocks/search`);
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { FavoritesService } from './favorites.service';

describe('FavoritesService', () => {
  let service: FavoritesService;
  let http: HttpTestingController;
  const url = `${environment.apiBaseUrl}/api/favorites`;

  beforeEach(() => {
    environment.useMockApi = false;
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FavoritesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    environment.useMockApi = true;
  });

  it('loads favorites from the backend', () => {
    service.load().subscribe();
    http.expectOne(url).flush([
      { stockId: '2330', stockName: '台積電', industryCategory: '半導體業' },
    ]);
    expect(service.favorites().map((stock) => stock.stockId)).toEqual(['2330']);
  });

  it('updates the signal only after add succeeds', () => {
    service
      .add({ stockId: '2317', stockName: '鴻海', industryCategory: '電子零組件業' })
      .subscribe();
    expect(service.favorites()).toEqual([]);
    const request = http.expectOne(`${url}/2317`);
    expect(request.request.method).toBe('POST');
    request.flush(null);
    expect(service.favorites().map((stock) => stock.stockId)).toEqual(['2317']);
  });

  it('removes the favorite after the backend succeeds', () => {
    service.load().subscribe();
    http.expectOne(url).flush([{ stockId: '2330', stockName: '台積電', industryCategory: null }]);

    service.remove('2330').subscribe();
    const request = http.expectOne(`${url}/2330`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
    expect(service.favorites()).toEqual([]);
  });
});

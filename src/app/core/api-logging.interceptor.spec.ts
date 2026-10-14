import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { apiLoggingInterceptor } from './api-logging.interceptor';
import { HttpClient } from '@angular/common/http';

describe('apiLoggingInterceptor', () => {
  let httpClient: HttpClient;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiLoggingInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    httpClient = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('adds a correlation ID without changing the request body', () => {
    const body = { stockId: '2330' };
    httpClient.post('/api/test', body).subscribe();

    const request = httpTesting.expectOne('/api/test');
    expect(request.request.headers.get('X-Correlation-ID')).toBeTruthy();
    expect(request.request.body).toEqual(body);
    request.flush(null);
  });
});

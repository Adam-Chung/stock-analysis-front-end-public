import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

const CORRELATION_HEADER = 'X-Correlation-ID';

/** 記錄 API method、路徑、status 與耗時；不記錄 headers、Token 或 request/response body。 */
export const apiLoggingInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const startedAt = performance.now();
  const correlationId = crypto.randomUUID();
  const trackedRequest = request.clone({
    setHeaders: { [CORRELATION_HEADER]: correlationId },
  });

  console.debug('[API] request started', {
    correlationId,
    method: request.method,
    url: request.url,
  });

  return next(trackedRequest).pipe(
    tap({
      next: (event) => {
        if (!(event instanceof HttpResponse)) return;
        console.info('[API] request completed', {
          correlationId: event.headers.get(CORRELATION_HEADER) ?? correlationId,
          method: request.method,
          url: request.url,
          status: event.status,
          durationMs: Math.round(performance.now() - startedAt),
        });
      },
      error: (error: unknown) => {
        const response = error instanceof HttpErrorResponse ? error : null;
        console.error('[API] request failed', {
          correlationId: response?.headers.get(CORRELATION_HEADER) ?? correlationId,
          method: request.method,
          url: request.url,
          status: response?.status ?? 0,
          errorType: error instanceof Error ? error.name : typeof error,
          durationMs: Math.round(performance.now() - startedAt),
        });
      },
    }),
  );
};

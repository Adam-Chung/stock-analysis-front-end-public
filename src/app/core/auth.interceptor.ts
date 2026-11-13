import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/** 所有 API 請求使用 HttpOnly session cookie；401 時回登入頁。 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  if (!auth.enabled) {
    return next(request);
  }

  const router = inject(Router);
  const apiRequest = request.url.includes('/api/') ? request.clone({ withCredentials: true }) : request;
  return next(apiRequest).pipe(
    catchError((error) => {
      if (error.status === 401 && !request.url.includes('/api/auth/')) {
        auth.clearSession();
        void router.navigate(['/login']);
      }
      return throwError(() => error);
    }),
  );
};

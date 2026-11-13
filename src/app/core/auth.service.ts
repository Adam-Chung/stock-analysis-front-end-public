import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, switchMap, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuthUser {
  id: number;
  email: string;
  displayName: string | null;
  pictureUrl: string | null;
  admin: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  readonly user = signal<AuthUser | null>(null);
  readonly enabled = environment.authEnabled;
  readonly loggedIn = computed(() => !this.enabled || environment.useMockApi || this.user() !== null);

  /** 啟動時從 HttpOnly session cookie 恢復登入狀態；前端不保存 token。 */
  restoreSession(): Observable<AuthUser | null> {
    if (!this.enabled || environment.useMockApi) return of(null);
    return this.http.get<AuthUser>(`${environment.apiBaseUrl}/api/auth/me`, { withCredentials: true }).pipe(
      tap((user) => this.user.set(user)),
      catchError(() => {
        this.user.set(null);
        return of(null);
      }),
    );
  }

  /** 取得公開 Google Client ID 與 CSRF cookie，供登入元件初始化。 */
  prepareGoogleLogin(): Observable<string> {
    return this.http.get(`${environment.apiBaseUrl}/api/auth/csrf`, { withCredentials: true }).pipe(
      switchMap(() => this.http.get<{ googleClientId: string }>(`${environment.apiBaseUrl}/api/auth/config`)),
      map(({ googleClientId }) => googleClientId),
    );
  }

  /** 將 Google ID token 交給後端驗證，成功後只保留非敏感的使用者摘要。 */
  loginWithGoogle(credential: string): Observable<AuthUser> {
    return this.http.post<AuthUser>(
      `${environment.apiBaseUrl}/api/auth/google`,
      { credential },
      { withCredentials: true },
    ).pipe(tap((user) => this.user.set(user)));
  }

  /** 清除後端 session，前端同步清掉使用者摘要。 */
  logout(): void {
    this.http.post(`${environment.apiBaseUrl}/api/auth/logout`, null, { withCredentials: true })
      .subscribe({ error: () => undefined });
    this.user.set(null);
  }

  /** 後端判定 session 無效時清除畫面狀態。 */
  clearSession(): void {
    this.user.set(null);
  }

  /** 永久刪除本站帳號與個人資料；共用股票資料不受影響。 */
  deleteAccount(): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/api/account`, { withCredentials: true })
      .pipe(tap(() => this.user.set(null)));
  }
}

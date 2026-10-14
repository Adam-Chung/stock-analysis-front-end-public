import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';

const TOKEN_KEY = 'stock-analysis-token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  readonly token = signal(localStorage.getItem(TOKEN_KEY));
  readonly loggedIn = computed(() => environment.useMockApi || this.token() !== null);

  /** 驗證帳密並永久保存登入 Token。 */
  login(username: string, password: string) {
    return this.http.post<{ token: string }>(`${environment.apiBaseUrl}/api/auth/login`, { username, password })
      .pipe(tap(({ token }) => {
        localStorage.setItem(TOKEN_KEY, token);
        this.token.set(token);
      }));
  }

  /** 呼叫後端撤銷 Token，並立即清除本機登入狀態。 */
  logout(): void {
    this.http.post(`${environment.apiBaseUrl}/api/auth/logout`, null).subscribe({ error: () => undefined });
    localStorage.removeItem(TOKEN_KEY);
    this.token.set(null);
  }

  /** 清除已被後端判定無效的本機 Token。 */
  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.token.set(null);
  }
}

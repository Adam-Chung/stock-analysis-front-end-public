import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login implements AfterViewInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly googleButton = viewChild.required<ElementRef<HTMLElement>>('googleButton');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /** 載入後端公開 Client ID，並由 Google 官方元件渲染登入按鈕。 */
  ngAfterViewInit(): void {
    this.auth.prepareGoogleLogin().subscribe({
      next: (clientId) => void this.loadGoogleScript().then(
        () => this.renderGoogleButton(clientId),
        () => this.error.set('Google 登入元件載入失敗，請重新整理後再試。'),
      ),
      error: () => this.error.set('登入設定載入失敗，請稍後再試。'),
    });
  }

  /** 初始化 Google Identity Services；credential 只送往本站後端驗證。 */
  private renderGoogleButton(clientId: string): void {
    if (!clientId || !window.google?.accounts?.id) {
      this.error.set('Google 登入尚未設定完成，請聯絡網站管理者。');
      return;
    }
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: ({ credential }) => this.completeLogin(credential),
    });
    window.google.accounts.id.renderButton(this.googleButton().nativeElement, {
      theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular', width: 280,
    });
  }

  /** 只有真的開啟登入頁時才載入 Google script，mock 公開版不會連線 Google。 */
  private loadGoogleScript(): Promise<void> {
    if (window.google?.accounts?.id) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity]');
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset['googleIdentity'] = 'true';
      script.addEventListener('load', () => resolve(), { once: true });
      script.addEventListener('error', () => reject(), { once: true });
      document.head.appendChild(script);
    });
  }

  /** 將 Google ID token 交給後端，完成本站 session 登入。 */
  private completeLogin(credential: string): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.auth.loginWithGoogle(credential).subscribe({
      next: () => void this.router.navigate(['/target-price/2330']),
      error: (error) => {
        this.loading.set(false);
        this.error.set(error?.error?.detail ?? error?.error?.message ?? 'Google 登入失敗，請稍後再試。');
      },
    });
  }
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: { client_id: string; callback: (response: { credential: string }) => void }): void;
          renderButton(element: HTMLElement, options: Record<string, string | number>): void;
        };
      };
    };
  }
}


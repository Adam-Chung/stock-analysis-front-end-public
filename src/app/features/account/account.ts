import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';

interface AdminUserView {
  id: number;
  email: string;
  displayName: string | null;
  role: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-account',
  imports: [RouterLink],
  templateUrl: './account.html',
  styleUrl: './account.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Account implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  readonly users = signal<AdminUserView[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /** 管理者進頁時載入帳號清單；一般使用者不呼叫管理 API。 */
  ngOnInit(): void {
    if (this.auth.user()?.admin) this.loadUsers();
  }

  /** 永久刪除自己的個人資料，二次確認後才執行。 */
  deleteAccount(): void {
    if (!confirm('確定永久刪除帳號、收藏、估值設定與個人筆記嗎？此動作無法復原。')) return;
    this.loading.set(true);
    this.auth.deleteAccount().subscribe({
      next: () => void this.router.navigate(['/login']),
      error: () => {
        this.loading.set(false);
        this.error.set('刪除帳號失敗，請稍後再試。');
      },
    });
  }

  /** 管理者啟用或停用其他帳號。 */
  setEnabled(user: AdminUserView, enabled: boolean): void {
    this.http.patch<AdminUserView>(`${environment.apiBaseUrl}/api/admin/users/${user.id}`, { enabled })
      .subscribe({
        next: (updated) => this.users.update((users) => users.map((item) => item.id === updated.id ? updated : item)),
        error: (error) => this.error.set(error?.error?.detail ?? '更新帳號狀態失敗。'),
      });
  }

  /** 載入不含 Google subject 與憑證的帳號摘要。 */
  private loadUsers(): void {
    this.http.get<AdminUserView[]>(`${environment.apiBaseUrl}/api/admin/users`).subscribe({
      next: (users) => this.users.set(users),
      error: () => this.error.set('無法載入帳號清單。'),
    });
  }
}

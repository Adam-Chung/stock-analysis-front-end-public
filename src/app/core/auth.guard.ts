import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** 未登入時導向登入頁。 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.loggedIn() || inject(Router).createUrlTree(['/login']);
};


import { Routes } from '@angular/router';
import { TargetPrice } from './features/target-price/target-price';
import { HealthCheck } from './features/health-check/health-check';
import { About } from './features/about/about';
import { FavoriteUpdate } from './features/favorite-update/favorite-update';
import { Login } from './features/login/login';
import { authGuard } from './core/auth.guard';
import { environment } from '../environments/environment';
import { Account } from './features/account/account';
import { Privacy } from './features/privacy/privacy';

export const routes: Routes = [
  environment.authEnabled
    ? { path: 'login', component: Login, title: '登入' }
    : { path: 'login', redirectTo: 'target-price/2330' },
  { path: '', redirectTo: 'target-price/2330', pathMatch: 'full' },
  { path: 'target-price/:stockId', component: TargetPrice, canActivate: [authGuard], title: '股票目標價' },
  { path: 'health-check/:stockId', component: HealthCheck, canActivate: [authGuard], title: '企業體質檢視' },
  { path: 'favorite-update', component: FavoriteUpdate, canActivate: [authGuard], title: '我的最愛區' },
  { path: 'about', component: About, title: '關於存股分析' },
  { path: 'privacy', component: Privacy, title: '隱私權政策' },
  { path: 'account', component: Account, canActivate: [authGuard], title: '帳號與隱私' },
];

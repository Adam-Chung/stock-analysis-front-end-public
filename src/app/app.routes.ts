import { Routes } from '@angular/router';
import { TargetPrice } from './features/target-price/target-price';
import { HealthCheck } from './features/health-check/health-check';
import { About } from './features/about/about';
import { FavoriteUpdate } from './features/favorite-update/favorite-update';
import { Login } from './features/login/login';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', component: Login, title: '登入' },
  { path: '', redirectTo: 'target-price/2330', pathMatch: 'full' },
  { path: 'target-price/:stockId', component: TargetPrice, canActivate: [authGuard], title: '股票目標價' },
  { path: 'health-check/:stockId', component: HealthCheck, canActivate: [authGuard], title: '企業體質檢視' },
  { path: 'favorite-update', component: FavoriteUpdate, canActivate: [authGuard], title: '我的最愛區' },
  { path: 'about', component: About, canActivate: [authGuard], title: '關於存股分析' },
];

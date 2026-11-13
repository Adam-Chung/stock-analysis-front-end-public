import { routes } from './app.routes';

describe('public and protected routes', () => {
  it('keeps about and privacy public', () => {
    expect(routes.find((route) => route.path === 'about')?.canActivate).toBeUndefined();
    expect(routes.find((route) => route.path === 'privacy')?.canActivate).toBeUndefined();
  });

  it('keeps stock analysis and account pages protected', () => {
    expect(routes.find((route) => route.path === 'target-price/:stockId')?.canActivate).toBeDefined();
    expect(routes.find((route) => route.path === 'health-check/:stockId')?.canActivate).toBeDefined();
    expect(routes.find((route) => route.path === 'favorite-update')?.canActivate).toBeDefined();
    expect(routes.find((route) => route.path === 'account')?.canActivate).toBeDefined();
  });
});

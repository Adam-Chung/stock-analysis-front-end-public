import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';

import { routes } from './app.routes';
import { apiLoggingInterceptor } from './core/api-logging.interceptor';
import { authInterceptor } from './core/auth.interceptor';

// Note: no provideAnimationsAsync() - @angular/animations is deprecated as of Angular 21/22
// (superseded by the native animate.enter/animate.leave syntax). Not currently needed since no
// screen uses a PrimeNG component that depends on it; add it back only if/when one does.
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor, apiLoggingInterceptor])),
    // withComponentInputBinding() lets route params (e.g. :stockId) bind straight to a
    // matching input() on the routed component, no ActivatedRoute plumbing needed.
    provideRouter(routes, withComponentInputBinding()),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.app-dark',
        },
      },
    }),
  ]
};

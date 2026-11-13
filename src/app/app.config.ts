import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';

import { routes } from './app.routes';
import { apiLoggingInterceptor } from './core/api-logging.interceptor';
import { authInterceptor } from './core/auth.interceptor';
import { AuthService } from './core/auth.service';
import { firstValueFrom } from 'rxjs';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAppInitializer(() => firstValueFrom(inject(AuthService).restoreSession())),
    provideHttpClient(withXhr(), withInterceptors([authInterceptor, apiLoggingInterceptor])),
    // withComponentInputBinding() lets route params (e.g. :stockId) bind straight to a
    // matching input() on the routed component, no ActivatedRoute plumbing needed.
    provideRouter(routes, withComponentInputBinding()),
  ],
};

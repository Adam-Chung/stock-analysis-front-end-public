import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService, AuthUser } from './auth.service';
import { environment } from '../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  const user: AuthUser = {
    id: 42,
    email: 'adam@example.com',
    displayName: 'Adam',
    pictureUrl: null,
    admin: true,
  };

  const originalEnvironment = { ...environment };

  beforeEach(() => {
    environment.authEnabled = true;
    environment.useMockApi = false;
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    Object.assign(environment, originalEnvironment);
    http.verify();
  });

  it('restores the user from the HttpOnly session without localStorage', () => {
    service.restoreSession().subscribe();
    http.expectOne(`${environment.apiBaseUrl}/api/auth/me`).flush(user);
    expect(service.user()).toEqual(user);
    expect(service.loggedIn()).toBe(true);
  });

  it('gets the CSRF cookie before loading the public Google client id', () => {
    let clientId: string | undefined;
    service.prepareGoogleLogin().subscribe((value) => clientId = value);
    http.expectOne(`${environment.apiBaseUrl}/api/auth/csrf`).flush({ token: 'csrf' });
    http.expectOne(`${environment.apiBaseUrl}/api/auth/config`).flush({ googleClientId: 'client-id' });
    expect(clientId).toBe('client-id');
  });

  it('posts the Google credential and keeps only the user summary', () => {
    service.loginWithGoogle('id-token').subscribe();
    const request = http.expectOne(`${environment.apiBaseUrl}/api/auth/google`);
    expect(request.request.body).toEqual({ credential: 'id-token' });
    request.flush(user);
    expect(service.user()).toEqual(user);
  });
});

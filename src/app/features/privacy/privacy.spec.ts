import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';
import { Privacy } from './privacy';

describe('Privacy', () => {
  const originalEnvironment = { ...environment };
  let fixture: ComponentFixture<Privacy>;

  afterEach(() => {
    Object.assign(environment, originalEnvironment);
  });

  beforeEach(async () => {
    environment.authEnabled = true;
    environment.useMockApi = false;
    await TestBed.configureTestingModule({
      imports: [Privacy],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(Privacy);
    fixture.detectChanges();
  });

  it('explains stored identity data and account deletion', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Google 帳號識別碼');
    expect(text).toContain('不會取得或保存你的 Google 密碼');
    expect(text).toContain('永久刪除自己的帳號');
  });

  it('links to the public about and login pages when logged out', () => {
    const anchors = fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>;
    const links = Array.from(anchors)
      .map((link) => link.getAttribute('href'));
    expect(links).toContain('/about');
    expect(links).toContain('/login');
  });

  it('hides the login link after the user is logged in', () => {
    TestBed.inject(AuthService).user.set({
      id: 1,
      email: 'user@example.com',
      displayName: 'User',
      pictureUrl: null,
      admin: false,
    });
    fixture.detectChanges();

    const anchors = fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>;
    const links = Array.from(anchors)
      .map((link) => link.getAttribute('href'));
    expect(links).toContain('/about');
    expect(links).not.toContain('/login');
  });
});

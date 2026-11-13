import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Privacy } from './privacy';

describe('Privacy', () => {
  let fixture: ComponentFixture<Privacy>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Privacy],
      providers: [provideRouter([])],
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

  it('links back to the public about and login pages', () => {
    const anchors = fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>;
    const links = Array.from(anchors)
      .map((link) => link.getAttribute('href'));
    expect(links).toContain('/about');
    expect(links).toContain('/login');
  });
});

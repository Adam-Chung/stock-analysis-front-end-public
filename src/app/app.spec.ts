import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';
import { StockSearchService } from './core/stock-search.service';
import { FavoritesService } from './core/favorites.service';
import { of } from 'rxjs';

describe('App', () => {
  beforeEach(async () => {
    localStorage.setItem('stock-analysis-token', 'test-token');
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  afterEach(() => localStorage.clear());

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('starts with the favorites sidebar visible', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance.sidebarVisible()).toBe(true);
  });

  it('toggleSidebar() flips the sidebar visibility', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.toggleSidebar();
    expect(app.sidebarVisible()).toBe(false);

    app.toggleSidebar();
    expect(app.sidebarVisible()).toBe(true);
  });

  it('opens and closes the mobile menu', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const app = fixture.componentInstance;

    expect(fixture.nativeElement.querySelector('.mobile-primary-menu')).toBeNull();

    app.toggleMobileMenu();
    fixture.detectChanges();
    expect(app.mobileMenuOpen()).toBe(true);
    expect(fixture.nativeElement.querySelector('.mobile-primary-menu')).not.toBeNull();

    app.closeMobileMenu();
    fixture.detectChanges();
    expect(app.mobileMenuOpen()).toBe(false);
    expect(fixture.nativeElement.querySelector('.mobile-primary-menu')).toBeNull();
  });

  it('waits for Enter before searching the backend', () => {
    const searchService = TestBed.inject(StockSearchService);
    const searchSpy = vi.spyOn(searchService, 'search').mockReturnValue(of([]));
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.onSearchInput('2330');
    expect(searchSpy).not.toHaveBeenCalled();

    app.onSearchSubmit();
    expect(searchSpy).toHaveBeenCalledOnce();
    expect(searchSpy).toHaveBeenCalledWith('2330');
  });

  it('removes a favorite directly from the sidebar without navigating to it', () => {
    const favoritesService = TestBed.inject(FavoritesService);
    const removeSpy = vi.spyOn(favoritesService, 'remove').mockReturnValue(of(undefined));
    const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate');
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const event = new MouseEvent('click');
    const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');

    app.onRemoveFavorite('2330', event);

    expect(stopPropagationSpy).toHaveBeenCalledOnce();
    expect(removeSpy).toHaveBeenCalledWith('2330');
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('lists 關於本站 before 目標價分析 in the menu', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance.menuItems.map((item) => item.label)).toEqual([
      '關於本站',
      '目標價分析',
      '企業體質檢視',
      '我的最愛區',
    ]);
  });

  it('keeps the menu shell but hides only favorites content when toggled off', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('aside.app-sidebar')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.favorites-content')).not.toBeNull();

    fixture.componentInstance.toggleSidebar();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('aside.app-sidebar')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.primary-menu')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.favorites-content')).toBeNull();
  });

  it('assigns the sidebar a leading flex order for mobile layout', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const body = fixture.nativeElement.querySelector('.shell-body');
    const sidebar = fixture.nativeElement.querySelector('aside.app-sidebar');

    expect(body.children[0].matches('main.shell-main')).toBe(true);
    expect(body.children[1].matches('aside.app-sidebar')).toBe(true);
    expect(getComputedStyle(sidebar).order).toBe('-1');
  });
});

import { Injectable, signal } from '@angular/core';

export type AppTheme = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly themeStorageKey = 'devhub.theme';

  readonly currentTheme = signal<AppTheme>('light');

  constructor() {
    const storedTheme = localStorage.getItem(this.themeStorageKey);
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const resolvedTheme: AppTheme = storedTheme === 'dark' || storedTheme === 'light'
      ? storedTheme
      : prefersDark
        ? 'dark'
        : 'light';

    this.setTheme(resolvedTheme);
  }

  toggleTheme(): void {
    this.setTheme(this.currentTheme() === 'dark' ? 'light' : 'dark');
  }

  setTheme(theme: AppTheme): void {
    this.currentTheme.set(theme);
    localStorage.setItem(this.themeStorageKey, theme);
    document.documentElement.setAttribute('data-theme', theme);
  }
}

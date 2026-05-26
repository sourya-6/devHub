import { Component, signal } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs';
import { Header } from './components/header/header';
import { Footer } from './components/footer/footer';
import { ThemeService } from './services/theme/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Header, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontendAngular');

  currentUrl = signal('');
  isNavigating = signal(false);

  constructor(private router: Router, private themeService: ThemeService) {
    this.themeService.currentTheme();
    this.currentUrl.set(this.router.url);

    this.router.events
      .pipe(
        filter(
          (event): event is NavigationStart | NavigationEnd | NavigationCancel | NavigationError =>
            event instanceof NavigationStart ||
            event instanceof NavigationEnd ||
            event instanceof NavigationCancel ||
            event instanceof NavigationError
        )
      )
      .subscribe((event) => {
        this.isNavigating.set(event instanceof NavigationStart);

        if (event instanceof NavigationEnd) {
          this.currentUrl.set(event.urlAfterRedirects);
        }
      });
  }

  showChrome(): boolean {
    return this.currentUrl() !== '/' && this.currentUrl() !== '';
  }
}

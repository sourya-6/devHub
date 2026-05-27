import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth/auth-service';
import { ThemeToggle } from '../theme-toggle/theme-toggle';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, ThemeToggle],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}

  logout() {
    // Call backend logout API, then clear local client state
    this.authService.logout().subscribe({
      next: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('projects');
        // Replace history entry so back doesn't return to protected page
        this.router.navigateByUrl('/', { replaceUrl: true });
        try {
          window.history.replaceState(null, '', '/');
        } catch (e) {
          // ignore
        }
      },
      error: (err) => {
        console.warn('Logout API failed, clearing local state anyway', err);
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('projects');
        this.router.navigateByUrl('/', { replaceUrl: true });
        try {
          window.history.replaceState(null, '', '/');
        } catch (e) {
          // ignore
        }
      }
    });
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }
}

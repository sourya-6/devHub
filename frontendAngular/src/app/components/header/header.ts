import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, Signal, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AppNotification, NotificationService } from '../../services/notifications/notifications';
import { AuthService } from '../../services/auth/auth-service';
import { ThemeToggle } from '../theme-toggle/theme-toggle';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, ThemeToggle],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit, OnDestroy {
  showNotifications = signal(false);
  notifications: Signal<AppNotification[]>;
  unreadCount: Signal<number>;

  constructor(
    private router: Router,
    private notificationService: NotificationService,
    private authService: AuthService,
    
  ) {
    this.notifications = this.notificationService.notifications;
    this.unreadCount = this.notificationService.unreadCount;
  }

  ngOnInit() {
    if (this.isLoggedIn()) {
      this.notificationService.connect();
    }
  }

  ngOnDestroy() {
    this.notificationService.disconnect();
  }

  logout() {
    // Call backend logout API, then clear local client state
    this.authService.logout().subscribe({
      next: () => {
        this.notificationService.clear();
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
        this.notificationService.clear();
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

  toggleNotifications() {
    if (!this.isLoggedIn()) {
      return;
    }

    const nextValue = !this.showNotifications();
    this.showNotifications.set(nextValue);

    if (nextValue && !this.notifications().length) {
      this.notificationService.refreshNotifications();
    }
  }

  closeNotifications() {
    this.showNotifications.set(false);
  }

  openNotification(notification: any) {
    if (!notification?.project?._id) {
      return;
    }

    if (!notification.read) {
      this.notificationService.markRead(notification._id).subscribe({
        next: () => {
          this.notificationService.notifications.update((current) =>
            current.filter((item) => item._id !== notification._id)
          );
        },
      });
    }

    this.showNotifications.set(false);
    this.router.navigate([`/project/${notification.project._id}`]);
  }

  markAllRead() {
    this.notificationService.markAllRead().subscribe({
      next: () => {
        this.notificationService.notifications.set([]);
        this.showNotifications.set(false);
      },
    });
  }
}

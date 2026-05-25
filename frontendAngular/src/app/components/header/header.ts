import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NotificationService } from '../../services/notifications/notifications';
import { AuthService } from '../../services/auth/auth-service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit, OnDestroy {
  showNotifications = signal(false);
  notifications = signal<any[]>([]);
  unreadCount = signal(0);

  constructor(
    private router: Router,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.notifications.set(this.notificationService.notifications());
    this.unreadCount.set(this.notificationService.unreadCount());

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
            current.map((item) => (item._id === notification._id ? { ...item, read: true } : item))
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
        this.notificationService.notifications.update((current) =>
          current.map((item) => ({ ...item, read: true }))
        );
        this.showNotifications.set(false);
      },
    });
  }
}

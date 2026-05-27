import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AppNotification {
  id: string;
  user: string;
  actor: {
    id: string;
    name: string;
    username: string;
    avatar: string;
  };
  project: {
    id: string;
    title: string;
    image?: string;
  };
  type: 'comment' | 'reply';
  message: string;
  read: boolean;
  createdAt: string;
  commentId?: string | null;
  replyId?: string | null;
}

interface NotificationsResponse {
  notifications: AppNotification[];
  unreadCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly baseUrl = environment.backendUrl;
  private eventSource: EventSource | null = null;
  private connectedUserId: string | null = null;

  notifications = signal<AppNotification[]>([]);
  unreadCount = computed(() => this.notifications().filter((notification) => !notification.read).length);
  loading = signal(false);

  constructor(private http: HttpClient, private zone: NgZone, private router: Router) {}

  loadNotifications(): Observable<NotificationsResponse> {
    const token = localStorage.getItem('token');
    if (!token) {
      return new Observable<NotificationsResponse>((subscriber) => {
        subscriber.next({ notifications: [], unreadCount: 0 });
        subscriber.complete();
      });
    }

    return this.http.get<NotificationsResponse>(`${this.baseUrl}/notifications`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  refreshNotifications() {
    const token = localStorage.getItem('token');
    if (!token) {
      this.notifications.set([]);
      return;
    }

    this.loading.set(true);
    this.loadNotifications().subscribe({
      next: (response) => {
        this.notifications.set((response.notifications || []).filter((notification) => !notification.read));
      },
      error: (error) => {
        console.error('Failed to load notifications', error);
      },
      complete: () => {
        this.loading.set(false);
      },
    });
  }

  connect() {
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');

    if (!userId || !token) {
      return;
    }

    if (this.eventSource && this.connectedUserId === userId) {
      return;
    }

    this.disconnect();
    this.connectedUserId = userId;
    this.refreshNotifications();

    this.eventSource = new EventSource(`${this.baseUrl}/notifications/stream?token=${encodeURIComponent(token)}`, {
      withCredentials: true,
    });

    this.eventSource.addEventListener('notification:created', (event: any) => {
      const parsed = event?.data ? JSON.parse(event.data) : null;
      const notification = parsed?.notification as AppNotification | undefined;

      if (!notification?.id) {
        return;
      }

      this.zone.run(() => {
        this.notifications.update((current) => [notification, ...current].slice(0, 20));
      });
    });

    // listen for lightweight toast events (SSE only, no DB persistence)
    this.eventSource.addEventListener('toast', (event: any) => {
      const parsed = event?.data ? JSON.parse(event.data) : null;

      this.zone.run(() => {
        this.showToast(parsed ?? 'Notification');
      });
    });

    this.eventSource.onerror = (error) => {
      console.error('Notification SSE error', error);
    };
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.connectedUserId = null;
    }
  }

  clear() {
    this.disconnect();
    this.notifications.set([]);
    this.loading.set(false);
  }

  markRead(notificationId: string): Observable<{ notification: AppNotification }> {
    const token = localStorage.getItem('token');

    return this.http.patch<{ notification: AppNotification }>(`${this.baseUrl}/notifications/${notificationId}/read`, {}, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  markAllRead(): Observable<{ message: string }> {
    const token = localStorage.getItem('token');

    return this.http.patch<{ message: string }>(`${this.baseUrl}/notifications/read-all`, {}, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  private showToast(payload: string | { message?: string; projectId?: string } , duration = 4000) {
    try {
      const containerId = 'app-toast-container';
      let container = document.getElementById(containerId);
      if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        Object.assign(container.style, {
          position: 'fixed',
          right: '16px',
          bottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: '99999',
          pointerEvents: 'none',
        });
        document.body.appendChild(container);
      }

      const toast = document.createElement('div');
      const text = typeof payload === 'string' ? payload : payload?.message ?? 'Notification';
      toast.textContent = text;
      Object.assign(toast.style, {
        background: 'rgba(0,0,0,0.85)',
        color: '#fff',
        padding: '10px 14px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        maxWidth: '320px',
        pointerEvents: 'auto',
        opacity: '1',
        transition: 'opacity 300ms ease',
      });

      // if payload contains a projectId, make toast clickable and navigate
      const projectId = typeof payload === 'object' && payload?.projectId ? String(payload.projectId) : null;
      if (projectId) {
        toast.style.cursor = 'pointer';
        toast.addEventListener('click', () => {
          try {
            this.zone.run(() => {
              this.router.navigate([`/project/${projectId}`]);
            });
          } catch (e) {
            console.error('Toast navigation failed', e);
          }
        });
      }

      container.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
          try { container?.removeChild(toast); } catch {}
        }, 300);
      }, duration);
    } catch (err) {
      console.error('showToast failed', err);
    }
  }
}

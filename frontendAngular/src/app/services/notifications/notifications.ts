import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone, computed, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AppNotification {
  _id: string;
  user: string;
  actor: {
    _id: string;
    name: string;
    username: string;
    avatar: string;
  };
  project: {
    _id: string;
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

  constructor(private http: HttpClient, private zone: NgZone) {}

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
        this.notifications.set(response.notifications || []);
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

      if (!notification?._id) {
        return;
      }

      this.zone.run(() => {
        this.notifications.update((current) => [notification, ...current].slice(0, 20));
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
}

import { Injectable, NgZone } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private es: EventSource | null = null;
  private SOCKET_URL = environment.backendUrl;
  private currentProjectId: string | null = null;

  // keep references to listeners so they can be removed later
  private commentsListener?: (ev: any) => void;
  private likesListener?: (ev: any) => void;
  private repliesListener?: (ev: any) => void;

  constructor(private zone: NgZone) {}

  connectToProject(projectId: string) {
    if (this.es && this.currentProjectId === projectId) return;

    this.disconnect();

    const url = `${this.SOCKET_URL}/project/${projectId}/stream`;
    this.es = new EventSource(url);
    this.currentProjectId = projectId;

    this.es.onopen = () => {
      console.log('SSE connected for project', projectId);
    };

    this.es.onerror = (err) => {
      if (this.es?.readyState === EventSource.CLOSED) {
        console.warn('SSE connection closed for project', projectId);
        return;
      }

      console.error('SSE error', err);
    };
  }

  disconnect() {
    if (this.es) {
      try {
        this.es.close();
      } catch (e) {
        // ignore
      }
      this.es = null;
      this.currentProjectId = null;
      this.commentsListener = undefined;
      this.likesListener = undefined;
      this.repliesListener = undefined;
    }
  }

  onCommentsUpdated(callback: (data: any) => void) {
    if (!this.es) return;
    // remove existing listener if present
    if (this.commentsListener) {
      this.es.removeEventListener('project:comments-updated', this.commentsListener);
      this.commentsListener = undefined;
    }

    this.commentsListener = (ev: any) => {
      const parsed = ev?.data ? JSON.parse(ev.data) : null;
      this.zone.run(() => callback(parsed));
    };

    this.es.addEventListener('project:comments-updated', this.commentsListener);
  }

  onLikesUpdated(callback: (data: any) => void) {
    if (!this.es) return;
    if (this.likesListener) {
      this.es.removeEventListener('project:likes-updated', this.likesListener);
      this.likesListener = undefined;
    }

    this.likesListener = (ev: any) => {
      const parsed = ev?.data ? JSON.parse(ev.data) : null;
      this.zone.run(() => callback(parsed));
    };

    this.es.addEventListener('project:likes-updated', this.likesListener);
  }

  onRepliesUpdated(callback: (data: any) => void) {
    if (!this.es) return;
    if (this.repliesListener) {
      this.es.removeEventListener('project:replies-updated', this.repliesListener);
      this.repliesListener = undefined;
    }

    this.repliesListener = (ev: any) => {
      const parsed = ev?.data ? JSON.parse(ev.data) : null;
      this.zone.run(() => callback(parsed));
    };

    this.es.addEventListener('project:replies-updated', this.repliesListener);
  }

  offCommentsUpdated() {
    if (!this.es) return;
    if (this.commentsListener) {
      this.es.removeEventListener('project:comments-updated', this.commentsListener);
      this.commentsListener = undefined;
    }
  }

  offLikesUpdated() {
    if (!this.es) return;
    if (this.likesListener) {
      this.es.removeEventListener('project:likes-updated', this.likesListener);
      this.likesListener = undefined;
    }
  }

  offRepliesUpdated() {
    if (!this.es) return;
    if (this.repliesListener) {
      this.es.removeEventListener('project:replies-updated', this.repliesListener);
      this.repliesListener = undefined;
    }
  }

  getEventSource() {
    return this.es;
  }
}

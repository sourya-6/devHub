import { Injectable, NgZone } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private es: EventSource | null = null;
  private SOCKET_URL = 'http://localhost:3000';
  private currentProjectId: string | null = null;

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
    }
  }

  onCommentsUpdated(callback: (data: any) => void) {
    if (!this.es) return;
    this.es.addEventListener('project:comments-updated', (ev: any) => {
      const parsed = ev?.data ? JSON.parse(ev.data) : null;
      this.zone.run(() => callback(parsed));
    });
  }

  onLikesUpdated(callback: (data: any) => void) {
    if (!this.es) return;
    this.es.addEventListener('project:likes-updated', (ev: any) => {
      const parsed = ev?.data ? JSON.parse(ev.data) : null;
      this.zone.run(() => callback(parsed));
    });
  }

  onRepliesUpdated(callback: (data: any) => void) {
    if (!this.es) return;
    this.es.addEventListener('project:replies-updated', (ev: any) => {
      const parsed = ev?.data ? JSON.parse(ev.data) : null;
      this.zone.run(() => callback(parsed));
    });
  }

  offCommentsUpdated() {
    if (!this.es) return;
    this.es.removeEventListener('project:comments-updated', () => {});
  }

  offLikesUpdated() {
    if (!this.es) return;
    this.es.removeEventListener('project:likes-updated', () => {});
  }

  offRepliesUpdated() {
    if (!this.es) return;
    this.es.removeEventListener('project:replies-updated', () => {});
  }

  getEventSource() {
    return this.es;
  }
}

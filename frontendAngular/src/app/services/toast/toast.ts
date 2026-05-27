import { Injectable, signal } from '@angular/core';

export type ToastType = 'error' | 'success' | 'info';

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<ToastMessage[]>([]);

  show(message: string, type: ToastType = 'info', duration = 4000) {
    const id = this.nextId++;

    this.toasts.update((toasts) => [...toasts, { id, message, type }]);

    window.setTimeout(() => {
      this.dismiss(id);
    }, duration);
  }

  error(message: string, duration?: number) {
    this.show(message, 'error', duration);
  }

  success(message: string, duration?: number) {
    this.show(message, 'success', duration);
  }

  dismiss(id: number) {
    this.toasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }
}

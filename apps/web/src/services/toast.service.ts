import { Service, resolve } from '@rabjs/react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'default';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

export interface ToastOptions {
  type?: ToastType;
  duration?: number;
}

const DEFAULT_DURATION = 3000;

const createToastId = () => `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export class ToastService extends Service {
  toasts: ToastItem[] = [];
  private timers = new Map<string, number>();

  show(message: string, options: ToastOptions = {}) {
    const toast: ToastItem = {
      id: createToastId(),
      message,
      type: options.type ?? 'default',
      duration: options.duration ?? DEFAULT_DURATION,
    };

    this.toasts = [toast, ...this.toasts];

    if (toast.duration > 0) {
      const timer = window.setTimeout(() => this.remove(toast.id), toast.duration);
      this.timers.set(toast.id, timer);
    }

    return toast.id;
  }

  remove(id: string) {
    const timer = this.timers.get(id);
    if (timer) {
      window.clearTimeout(timer);
      this.timers.delete(id);
    }

    this.toasts = this.toasts.filter((toast) => toast.id !== id);
  }

  clear() {
    this.timers.forEach((timer) => window.clearTimeout(timer));
    this.timers.clear();
    this.toasts = [];
  }
}

export const toast = {
  show: (message: string, options?: ToastOptions) => resolve(ToastService).show(message, options),
  success: (message: string, options?: Omit<ToastOptions, 'type'>) =>
    resolve(ToastService).show(message, { ...options, type: 'success' }),
  error: (message: string, options?: Omit<ToastOptions, 'type'>) =>
    resolve(ToastService).show(message, { ...options, type: 'error' }),
  warning: (message: string, options?: Omit<ToastOptions, 'type'>) =>
    resolve(ToastService).show(message, { ...options, type: 'warning' }),
  info: (message: string, options?: Omit<ToastOptions, 'type'>) =>
    resolve(ToastService).show(message, { ...options, type: 'info' }),
  remove: (id: string) => resolve(ToastService).remove(id),
  clear: () => resolve(ToastService).clear(),
};

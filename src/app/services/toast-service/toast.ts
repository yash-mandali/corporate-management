import { Injectable, signal, computed } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
  duration: number;
  progress: number;        // 0–100, drives the shrinking bar
  removing: boolean;       // triggers slide-out animation
}

@Injectable({ providedIn: 'root' })
export class ToastService {

  private _toasts = signal<Toast[]>([]);
  readonly toasts = computed(() => this._toasts());

  private nextId = 1;
  private timers = new Map<number, ReturnType<typeof setInterval>>();

  // ── Public API ──────────────────────────────────────────────

  success(title: string, message?: string, duration = 1500) {
    this._add('success', title, message, duration);
  }

  error(title: string, message?: string, duration = 1500) {
    this._add('error', title, message, duration);
  }

  warning(title: string, message?: string, duration = 1500) {
    this._add('warning', title, message, duration);
  }

  info(title: string, message?: string, duration = 1500) {
    this._add('info', title, message, duration);
  }

  dismiss(id: number) {
    this._startRemove(id);
  }

  // ── Internal ─────────────────────────────────────────────────

  private _add(type: ToastType, title: string, message?: string, duration = 4000) {
    const id = this.nextId++;
    const toast: Toast = { id, type, title, message, duration, progress: 100, removing: false };
    this._toasts.update(list => [toast, ...list]);
    this._startTimer(id, duration);
  }

  private _startTimer(id: number, duration: number) {
    const interval = 30;
    const steps = duration / interval;
    const decrement = 100 / steps;

    const timer = setInterval(() => {
      this._toasts.update(list =>
        list.map(t => t.id === id ? { ...t, progress: Math.max(0, t.progress - decrement) } : t)
      );
      const current = this._toasts().find(t => t.id === id);
      if (!current || current.progress <= 0) {
        clearInterval(timer);
        this.timers.delete(id);
        this._startRemove(id);
      }
    }, interval);

    this.timers.set(id, timer);
  }

  private _startRemove(id: number) {
    // pause timer if still running
    const t = this.timers.get(id);
    if (t) { clearInterval(t); this.timers.delete(id); }

    // mark as removing → CSS slide-out plays
    this._toasts.update(list => list.map(t => t.id === id ? { ...t, removing: true } : t));

    // remove from DOM after animation (320 ms)
    setTimeout(() => {
      this._toasts.update(list => list.filter(t => t.id !== id));
    }, 320);
  }

  pauseTimer(id: number) {
    const t = this.timers.get(id);
    if (t) { clearInterval(t); this.timers.delete(id); }
  }

  resumeTimer(id: number) {
    const toast = this._toasts().find(t => t.id === id);
    if (!toast || toast.removing) return;
    const remaining = (toast.progress / 100) * toast.duration;
    this._startTimer(id, remaining);
  }
}
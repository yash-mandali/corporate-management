import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../services/toast-service/toast';

@Component({
  selector: 'app-toast-component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.html',
  styleUrl: './toast.css',
})
export class ToastComponent{
  readonly toastService = inject(ToastService);

  trackById(_: number, t: Toast) { return t.id; }

  icon(type: Toast['type']): string {
    return { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' }[type];
  }
}
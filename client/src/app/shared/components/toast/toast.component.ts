import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toastSvc.toasts(); track toast.id) {
        <div class="toast toast-{{ toast.type }}" (click)="toastSvc.remove(toast.id)">
          <span class="toast-icon">{{ icons[toast.type] }}</span>
          <span>{{ toast.message }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast {
      display: flex; align-items: center; gap: 0.6rem;
      padding: 0.8rem 1.2rem;
      border-radius: 10px;
      color: #fff;
      font-weight: 600;
      cursor: pointer;
      animation: slideIn 0.25s ease;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      max-width: 320px;
    }
    .toast-success { background: #22c55e; }
    .toast-error   { background: #ef4444; }
    .toast-warning { background: #f59e0b; color: #1a1a1a; }
    .toast-info    { background: #3b82f6; }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to   { transform: translateX(0);   opacity: 1; }
    }
  `],
})
export class ToastComponent {
  toastSvc = inject(ToastService);
  icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
}

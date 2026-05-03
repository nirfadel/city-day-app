import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="login-page">
      <div class="card" style="width:100%;max-width:380px">
        <h2 style="margin-bottom:1.5rem;text-align:center">🔐 כניסת מנהל</h2>

        <div class="form-group">
          <label>סיסמה</label>
          <input type="password" [(ngModel)]="password"
                 placeholder="הזן סיסמה"
                 (keyup.enter)="login()" />
        </div>

        <button class="btn btn-primary btn-block btn-lg"
                [disabled]="!password || loading()"
                (click)="login()">
          {{ loading() ? 'נכנס...' : 'כניסה' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      background: #1a1a1a;
      padding: 1rem;
    }
  `],
})
export class AdminLoginComponent {
  private auth   = inject(AuthService);
  private router = inject(Router);
  private toast  = inject(ToastService);

  password = '';
  loading  = signal(false);

  login() {
    if (!this.password) return;
    this.loading.set(true);
    this.auth.adminLogin(this.password).subscribe({
      next: () => this.router.navigate(['/admin']),
      error: () => {
        this.toast.error('סיסמה שגויה');
        this.loading.set(false);
      },
    });
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/services/toast.service';
import { IGroup } from '../../../../../../server/src/types';

@Component({
  selector: 'app-join',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="join-page">
      <div class="join-card card">
        <div class="join-header">
          <h1>🏙️ יום בעיר</h1>
          <p class="text-muted">הצטרפו לאתגר!</p>
        </div>

        <div class="form-group">
          <label>שם כינוי</label>
          <input [(ngModel)]="nickname" placeholder="איך קוראים לך?" [disabled]="loading()" />
        </div>

        <div class="form-group">
          <label>בחרו קבוצה</label>
          @if (loadingGroups()) {
            <div class="text-muted text-center mt-1">טוען קבוצות...</div>
          } @else if (groups().length === 0) {
            <div class="text-muted text-center mt-1">אין קבוצות עדיין — פנו למנהל</div>
          }
          <div class="groups-grid">
            @for (group of groups(); track group._id) {
              <div
                class="group-card"
                [class.selected]="selectedGroupId === group._id"
                [style.border-color]="selectedGroupId === group._id ? group.color : ''"
                [style.background]="selectedGroupId === group._id ? group.color + '22' : ''"
                (click)="selectedGroupId = group._id">
                <span class="group-emoji">{{ group.emoji }}</span>
                <span class="group-name">{{ group.name }}</span>
                <span class="group-count text-muted">{{ group.memberCount }} חברים</span>
              </div>
            }
          </div>
        </div>

        <button class="btn btn-primary btn-lg btn-block mt-2"
                [disabled]="!nickname.trim() || !selectedGroupId || loading()"
                (click)="join()">
          {{ loading() ? 'מצטרף...' : 'בואו נתחיל! 🚀' }}
        </button>

        <div class="admin-link mt-2 text-center">
          <a routerLink="/admin/login" class="text-muted" style="font-size:0.8rem">כניסת מנהל</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .join-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f4c430 0%, #ff8c00 100%);
      padding: 1rem;
    }
    .join-card {
      width: 100%;
      max-width: 480px;
    }
    .join-header {
      text-align: center;
      margin-bottom: 1.5rem;
      h1 { font-size: 2rem; font-weight: 800; }
    }
    .groups-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 0.75rem;
      margin-top: 0.5rem;
    }
    .group-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.3rem;
      padding: 1rem 0.75rem;
      border: 2.5px solid var(--border);
      border-radius: var(--radius);
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
      &:hover { border-color: #999; }
      &.selected { font-weight: 700; }
    }
    .group-emoji { font-size: 2rem; }
    .group-name  { font-weight: 600; font-size: 0.95rem; }
    .group-count { font-size: 0.75rem; }
  `],
})
export class JoinComponent implements OnInit {
  private auth   = inject(AuthService);
  private api    = inject(ApiService);
  private router = inject(Router);
  private toast  = inject(ToastService);

  groups         = signal<(IGroup & { memberCount: number })[]>([]);
  loading        = signal(false);
  loadingGroups  = signal(true);
  nickname       = '';
  selectedGroupId = '';

  ngOnInit() {
    this.api.get<(IGroup & { memberCount: number })[]>('groups').subscribe({
      next: g => { this.groups.set(g); this.loadingGroups.set(false); },
      error: () => { this.toast.error('שגיאה בטעינת הקבוצות'); this.loadingGroups.set(false); },
    });
  }

  join() {
    if (!this.nickname.trim() || !this.selectedGroupId) return;
    this.loading.set(true);

    this.auth.joinGame(this.nickname.trim(), this.selectedGroupId).subscribe({
      next: ({ welcomeMessage }) => {
        if (welcomeMessage) this.toast.info(welcomeMessage);
        this.router.navigate(['/play']);
      },
      error: err => {
        this.toast.error(err.error?.error || 'שגיאה בהצטרפות');
        this.loading.set(false);
      },
    });
  }
}

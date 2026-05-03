import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { SocketService } from '../../../core/services/socket.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="admin-shell">
      <!-- Desktop sidebar -->
      <aside class="sidebar">
        <div class="sidebar-brand">🏙️ ניהול</div>
        <nav class="sidebar-nav">
          <a routerLink="/admin/dashboard"   routerLinkActive="active">📊 לוח בקרה</a>
          <a routerLink="/admin/groups"      routerLinkActive="active">👥 קבוצות</a>
          <a routerLink="/admin/missions"    routerLinkActive="active">🎯 משימות</a>
          <a routerLink="/admin/submissions" routerLinkActive="active">
            📥 תשובות
            @if (pendingCount() > 0) {
              <span class="badge-count">{{ pendingCount() }}</span>
            }
          </a>
        </nav>
        <button class="btn btn-outline btn-sm logout-btn" (click)="logout()">התנתק</button>
      </aside>

      <main class="admin-main">
        <router-outlet />
      </main>

      <!-- Mobile bottom nav -->
      <nav class="mobile-nav">
        <a routerLink="/admin/dashboard" routerLinkActive="active">
          <span class="nav-icon">📊</span>
          <span>בקרה</span>
        </a>
        <a routerLink="/admin/groups" routerLinkActive="active">
          <span class="nav-icon">👥</span>
          <span>קבוצות</span>
        </a>
        <a routerLink="/admin/missions" routerLinkActive="active">
          <span class="nav-icon">🎯</span>
          <span>משימות</span>
        </a>
        <a routerLink="/admin/submissions" routerLinkActive="active" class="nav-submissions">
          <span class="nav-icon">📥</span>
          <span>תשובות</span>
          @if (pendingCount() > 0) {
            <span class="mobile-badge">{{ pendingCount() }}</span>
          }
        </a>
        <button class="nav-logout" (click)="logout()">
          <span class="nav-icon">🚪</span>
          <span>יציאה</span>
        </button>
      </nav>
    </div>
  `,
  styles: [`
    .admin-shell { display: flex; height: 100vh; }

    /* ── Desktop sidebar ── */
    .sidebar {
      width: 220px; min-width: 220px;
      background: #1a1a1a; color: #fff;
      display: flex; flex-direction: column;
    }
    .sidebar-brand {
      padding: 1.25rem 1rem;
      font-size: 1.2rem; font-weight: 800;
      border-bottom: 1px solid #333;
    }
    .sidebar-nav {
      display: flex; flex-direction: column; padding: 0.75rem 0; flex: 1;
      a {
        display: flex; align-items: center; gap: 0.5rem;
        padding: 0.75rem 1rem;
        color: #aaa; text-decoration: none; font-weight: 600;
        transition: all 0.15s;
        &:hover { background: #2a2a2a; color: #fff; }
        &.active { background: #2a2a2a; color: var(--primary); }
      }
    }
    .badge-count {
      margin-right: auto; background: var(--danger);
      color: #fff; border-radius: 999px;
      padding: 0.1rem 0.5rem; font-size: 0.75rem;
    }
    .logout-btn { margin: 1rem; }
    .admin-main { flex: 1; overflow-y: auto; padding: 1.5rem; background: var(--bg); }

    /* ── Mobile bottom nav (hidden on desktop) ── */
    .mobile-nav { display: none; }

    @media (max-width: 768px) {
      .admin-shell { flex-direction: column; }
      .sidebar { display: none; }
      .admin-main { padding: 0.75rem; padding-bottom: 5rem; }

      .mobile-nav {
        display: flex;
        position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
        background: #1a1a1a;
        border-top: 1px solid #333;

        a, .nav-logout {
          flex: 1; display: flex; flex-direction: column; align-items: center;
          padding: 0.5rem 0.25rem;
          color: #aaa; text-decoration: none; font-size: 0.65rem; font-weight: 600;
          gap: 0.15rem; background: none; border: none; cursor: pointer;
          font-family: inherit;
          min-height: 56px; justify-content: center;
          &.active { color: var(--primary); }
          &:hover { color: #fff; }
        }
        .nav-icon { font-size: 1.4rem; line-height: 1; }
        .nav-submissions { position: relative; }
        .mobile-badge {
          position: absolute; top: 6px; right: 50%;
          transform: translateX(50%) translateX(10px);
          background: var(--danger); color: #fff;
          border-radius: 999px; padding: 0 5px;
          font-size: 0.65rem; min-width: 18px; text-align: center;
          line-height: 18px; height: 18px;
        }
      }
    }
  `],
})
export class AdminShellComponent implements OnInit {
  auth         = inject(AuthService);
  api          = inject(ApiService);
  socket       = inject(SocketService);
  toast        = inject(ToastService);
  router       = inject(Router);
  pendingCount = signal(0);

  ngOnInit() {
    this.socket.connect();
    this.socket.joinAsAdmin();

    // Load initial pending count from API
    this.api.get<{ length: number }>('submissions?status=pending').subscribe((subs: any) => {
      this.pendingCount.set(Array.isArray(subs) ? subs.length : 0);
    });

    this.socket.onSubmissionReceived().subscribe(() => {
      this.pendingCount.update(n => n + 1);
      this.toast.info('📥 תשובה חדשה התקבלה!');
    });
    this.socket.onSubmissionReviewed().subscribe(() => {
      this.pendingCount.update(n => Math.max(0, n - 1));
    });
    this.socket.onUserJoined().subscribe(({ nickname, groupName }) => {
      this.toast.info(`👤 ${nickname} הצטרף לקבוצה ${groupName}`);
    });
    this.socket.onGameCompleted().subscribe(({ groupName }) => {
      this.toast.success(`🏆 קבוצת ${groupName} סיימה את כל המשימות!`);
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/admin/login']);
  }
}

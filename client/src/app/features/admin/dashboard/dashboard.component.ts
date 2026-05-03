import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { SocketService } from '../../../core/services/socket.service';
import { ToastService } from '../../../shared/services/toast.service';

interface GroupStat {
  group: { _id: string; name: string; color: string; emoji: string };
  approved: number;
  pending: number;
  totalScore: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <div class="flex justify-between items-center" style="margin-bottom:1.5rem">
        <h2>📊 לוח בקרה</h2>
        <div class="flex gap-1 items-center">
          <label class="scoring-toggle" title="ניקוד">
            <input type="checkbox" [checked]="scoringEnabled()" (change)="toggleScoring($event)" />
            <span class="toggle-track">
              <span class="toggle-thumb"></span>
            </span>
            <span class="toggle-label">ניקוד 🏆</span>
          </label>
          <button class="btn btn-danger btn-sm" [disabled]="resetting()" (click)="resetGame()">
            {{ resetting() ? 'מאפס...' : '🗑️ איפוס' }}
          </button>
        </div>
      </div>

      <!-- Start game banner -->
      @if (!gameStarted()) {
        <div class="start-banner card">
          <div class="start-banner-text">
            <span style="font-size:2rem">🚀</span>
            <div>
              <strong style="font-size:1.1rem">מוכנים להתחיל?</strong>
              <p class="text-muted" style="margin-top:0.2rem">
                {{ joined().length }} משתתפים מחכים — לחץ להשחרר את המשימה הראשונה
              </p>
            </div>
          </div>
          <button class="btn btn-primary" [disabled]="starting()" (click)="startGame()">
            {{ starting() ? 'מתחיל...' : 'בואו נתחיל! 🚀' }}
          </button>
        </div>
      } @else {
        <div class="game-active card">
          <span style="font-size:1.3rem">✅</span>
          <strong>המשחק פעיל</strong>
          <span class="text-muted" style="font-size:0.85rem">המשימות משתחררות אוטומטית לכל קבוצה</span>
        </div>
      }

      <div class="stats-grid" style="margin-top:1rem">
        @for (stat of stats(); track stat.group._id) {
          <div class="stat-card card" [style.border-top]="'4px solid ' + stat.group.color">
            <div class="stat-header">
              <span style="font-size:1.8rem">{{ stat.group.emoji }}</span>
              <strong>{{ stat.group.name }}</strong>
            </div>
            <div class="stat-numbers">
              <div class="stat-item">
                <span class="stat-val">{{ stat.approved }}</span>
                <span class="stat-label">אושרו ✅</span>
              </div>
              <div class="stat-item">
                <span class="stat-val">{{ stat.pending }}</span>
                <span class="stat-label">ממתין ⏳</span>
              </div>
              @if (scoringEnabled()) {
                <div class="stat-item">
                  <span class="stat-val stat-score">{{ stat.totalScore }}</span>
                  <span class="stat-label">נקודות 🏆</span>
                </div>
              }
            </div>
          </div>
        }
      </div>

      <!-- Live members -->
      <div class="card mt-2">
        <h3 style="margin-bottom:1rem">👥 משתתפים שהצטרפו</h3>
        @if (joined().length === 0) {
          <p class="text-muted">ממתין לחברים...</p>
        }
        @for (j of joined(); track j.nickname) {
          <div class="join-item">
            <span class="group-dot" [style.background]="j.groupColor"></span>
            <strong>{{ j.nickname }}</strong>
            <span class="text-muted">{{ j.groupName }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(240px,1fr)); gap:1rem; }
    .stat-header { display:flex; align-items:center; gap:0.6rem; margin-bottom:1rem; font-size:1.1rem; }
    .stat-numbers { display:flex; gap:1rem; }
    .stat-item { display:flex; flex-direction:column; align-items:center; flex:1; }
    .stat-val { font-size:1.8rem; font-weight:800; }
    .stat-score { color: var(--warning); }
    .stat-label { font-size:0.75rem; color:var(--text-muted); }
    .join-item { display:flex; align-items:center; gap:0.5rem; padding:0.4rem 0; border-bottom:1px solid var(--border); }
    .group-dot { width:10px; height:10px; border-radius:50%; }
    .start-banner {
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 1rem; background: #fffbea; border: 2px solid var(--primary);
    }
    .start-banner-text { display: flex; align-items: center; gap: 1rem; flex: 1; min-width: 0; }
    .game-active {
      display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;
      background: #f0fdf4; border: 1.5px solid var(--success);
    }
    /* ── Scoring toggle ── */
    .scoring-toggle {
      display: flex; align-items: center; gap: 0.4rem;
      cursor: pointer; user-select: none;
      input { display: none; }
    }
    .toggle-track {
      width: 38px; height: 22px; border-radius: 999px;
      background: var(--border); position: relative;
      transition: background 0.2s; flex-shrink: 0;
    }
    .scoring-toggle input:checked ~ .toggle-track { background: var(--warning); }
    .toggle-thumb {
      position: absolute; top: 3px; right: 3px;
      width: 16px; height: 16px; border-radius: 50%;
      background: #fff; transition: transform 0.2s;
      box-shadow: 0 1px 3px rgba(0,0,0,.2);
    }
    .scoring-toggle input:checked ~ .toggle-track .toggle-thumb { transform: translateX(-16px); }
    .toggle-label { font-size: 0.85rem; font-weight: 600; color: var(--text-muted); white-space: nowrap; }
    .scoring-toggle input:checked ~ .toggle-label { color: var(--warning); }

    @media (max-width: 768px) {
      .stats-grid { grid-template-columns: 1fr 1fr; }
      .start-banner { flex-direction: column; align-items: stretch; text-align: center; }
      .start-banner-text { justify-content: center; }
      .start-banner .btn { width: 100%; }
    }
  `],
})
export class DashboardComponent implements OnInit {
  private api    = inject(ApiService);
  private socket = inject(SocketService);
  private toast  = inject(ToastService);

  stats          = signal<GroupStat[]>([]);
  joined         = signal<{ nickname: string; groupName: string; groupColor: string }[]>([]);
  resetting      = signal(false);
  starting       = signal(false);
  gameStarted    = signal(false);
  scoringEnabled = signal(false);

  ngOnInit() {
    this.api.get<{ scoringEnabled: boolean }>('settings').subscribe(s => {
      this.scoringEnabled.set(s.scoringEnabled);
    });
    this.api.get<GroupStat[]>('submissions/stats').subscribe(s => {
      this.stats.set(s);
      // If any group has activity, game already started
      if (s.some(g => g.approved + g.pending > 0)) this.gameStarted.set(true);
    });
    this.api.get<{ isActive: boolean }[]>('missions').subscribe(missions => {
      if (missions.some(m => m.isActive)) this.gameStarted.set(true);
    });
    this.api.get<{ nickname: string; groupName: string; groupColor: string }[]>('groups/members/all')
      .subscribe(members => this.joined.set(members));

    this.socket.onUserJoined().subscribe(data => {
      this.joined.update(j =>
        j.some(x => x.nickname === data.nickname && x.groupName === data.groupName)
          ? j
          : [data, ...j]
      );
    });
    this.socket.onSubmissionReviewed().subscribe(() => {
      this.api.get<GroupStat[]>('submissions/stats').subscribe(s => this.stats.set(s));
    });
  }

  startGame() {
    this.starting.set(true);
    this.api.post<null>('admin/start', {}).subscribe({
      next: () => {
        this.gameStarted.set(true);
        this.starting.set(false);
        this.toast.success('המשחק התחיל! משימה 1 שוחררה 🚀');
      },
      error: () => {
        this.starting.set(false);
        this.toast.error('שגיאה — וודא שמשימה 1 קיימת');
      },
    });
  }

  toggleScoring(event: Event) {
    const enabled = (event.target as HTMLInputElement).checked;
    this.scoringEnabled.set(enabled);
    this.api.put<{ scoringEnabled: boolean }>('settings', { scoringEnabled: enabled }).subscribe();
  }

  resetGame() {
    if (!confirm('איפוס משחק — ימחק את כל השחקנים, התשובות וההודעות.\nהקבוצות והמשימות יישמרו.\n\nלהמשיך?')) return;
    this.resetting.set(true);
    this.api.post<null>('admin/reset', {}).subscribe({
      next: () => {
        this.stats.set([]);
        this.joined.set([]);
        this.gameStarted.set(false);
        this.resetting.set(false);
        this.toast.success('המשחק אופס בהצלחה!');
      },
      error: () => {
        this.resetting.set(false);
        this.toast.error('שגיאה באיפוס');
      },
    });
  }
}

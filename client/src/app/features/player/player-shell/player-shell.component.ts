import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { SocketService } from '../../../core/services/socket.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-player-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <header class="topbar">
        <div class="topbar-brand">🏙️ יום בעיר</div>
        <div class="topbar-user">
          <span class="group-dot" [style.background]="auth.user?.groupColor"></span>
          <span>{{ auth.user?.nickname }}</span>
          <span class="text-muted" style="font-size:0.85rem">| {{ auth.user?.groupName }}</span>
        </div>
      </header>

      <main class="main-content">
        <router-outlet />
      </main>

      <nav class="bottom-nav">
        <a routerLink="/play/missions" routerLinkActive="active">
          <span>🎯</span><span>משימות</span>
        </a>
        <a routerLink="/play/messages" routerLinkActive="active" class="nav-messages">
          <span>💬</span><span>הודעות</span>
          @if (unreadCount() > 0) {
            <span class="msg-badge">{{ unreadCount() }}</span>
          }
        </a>
      </nav>

      <!-- Game completed overlay -->
      @if (gameCompleted()) {
        <div class="finish-overlay" (click)="gameCompleted.set(false)">
          <div class="finish-card" (click)="$event.stopPropagation()">
            <div class="finish-emoji">🏆</div>
            <h1 class="finish-title">כל הכבוד!</h1>
            <p class="finish-subtitle">
              קבוצת <strong>{{ auth.user?.groupName }}</strong><br>
              סיימתם את כל המשימות!
            </p>
            <p class="finish-congrats">
              אתם מדהימים — עשיתם יום שלם בחיפה 🎉
            </p>
            <button class="btn btn-primary btn-lg" (click)="gameCompleted.set(false)">
              יאללה בואו נחגוג! 🥳
            </button>
          </div>

          <!-- Confetti particles -->
          @for (p of confettiPieces; track p.id) {
            <div class="confetti-piece"
                 [style.left.%]="p.x"
                 [style.animation-delay.ms]="p.delay"
                 [style.animation-duration.ms]="p.duration"
                 [style.background]="p.color"
                 [style.transform]="'rotate(' + p.rotate + 'deg)'">
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .shell { display: flex; flex-direction: column; height: 100vh; position: relative; }
    .topbar {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.75rem 1rem;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      font-weight: 700;
    }
    .topbar-user { display: flex; align-items: center; gap: 0.4rem; font-size: 0.9rem; }
    .group-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
    .main-content { flex: 1; overflow-y: auto; padding: 1rem; }
    .bottom-nav {
      display: flex;
      background: var(--surface);
      border-top: 1px solid var(--border);
      a {
        flex: 1; display: flex; flex-direction: column; align-items: center;
        padding: 0.6rem; font-size: 0.75rem; text-decoration: none;
        color: var(--text-muted); gap: 0.2rem; font-weight: 600;
        position: relative;
        &.active { color: var(--text); }
        span:first-child { font-size: 1.4rem; }
      }
    }
    .msg-badge {
      position: absolute; top: 4px; right: calc(50% - 18px);
      background: var(--danger); color: #fff;
      border-radius: 999px; min-width: 18px; height: 18px;
      font-size: 0.65rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      padding: 0 4px; line-height: 1;
    }

    /* ── Finish overlay ── */
    .finish-overlay {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(0,0,0,0.75);
      display: flex; align-items: center; justify-content: center;
      padding: 1.5rem;
      overflow: hidden;
    }
    .finish-card {
      background: #fff; border-radius: 20px;
      padding: 2.5rem 2rem; text-align: center;
      max-width: 380px; width: 100%;
      position: relative; z-index: 10;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      animation: pop-in 0.5s cubic-bezier(0.34,1.56,0.64,1);
    }
    .finish-emoji { font-size: 4rem; line-height: 1; margin-bottom: 0.5rem; }
    .finish-title {
      font-size: 2.2rem; font-weight: 900;
      background: linear-gradient(135deg, #f4c430, #ff8c00);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      margin-bottom: 0.75rem;
    }
    .finish-subtitle { font-size: 1.15rem; line-height: 1.6; margin-bottom: 0.75rem; }
    .finish-congrats { color: var(--text-muted); font-size: 0.95rem; margin-bottom: 1.5rem; }

    /* ── Confetti ── */
    .confetti-piece {
      position: absolute; top: -20px;
      width: 10px; height: 14px; border-radius: 2px;
      animation: confetti-fall linear forwards;
    }
    @keyframes confetti-fall {
      0%   { transform: translateY(0)    rotate(0deg);   opacity: 1; }
      100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
    }
    @keyframes pop-in {
      from { transform: scale(0.5); opacity: 0; }
      to   { transform: scale(1);   opacity: 1; }
    }
  `],
})
export class PlayerShellComponent implements OnInit {
  auth   = inject(AuthService);
  socket = inject(SocketService);
  toast  = inject(ToastService);
  router = inject(Router);

  gameCompleted = signal(false);
  unreadCount   = signal(0);
  confettiPieces = this.generateConfetti();

  private generateConfetti() {
    const colors = ['#f4c430','#ff8c00','#e74c3c','#3498db','#2ecc71','#9b59b6','#1abc9c','#e91e63'];
    return Array.from({ length: 60 }, (_, i) => ({
      id:       i,
      x:        Math.random() * 100,
      delay:    Math.random() * 1500,
      duration: 2000 + Math.random() * 2000,
      color:    colors[Math.floor(Math.random() * colors.length)],
      rotate:   Math.random() * 360,
    }));
  }

  ngOnInit() {
    const user = this.auth.user;
    if (user && !this.socket.isConnected()) {
      this.socket.connect();
      this.socket.joinAsPlayer(user.groupId!, user.nickname, user.groupName, user.groupColor);
    }

    this.socket.onMissionUnlocked().subscribe(mission => {
      this.toast.info(`🎯 משימה חדשה: ${mission.title}`);
    });
    this.socket.onSubmissionReviewed().subscribe(({ status, adminFeedback }) => {
      if (status === 'approved') this.toast.success('✅ תשובתכם אושרה!');
      else this.toast.warning(`❌ תשובה נדחתה: ${adminFeedback || ''}`);
    });
    this.socket.onNewMessage().subscribe(msg => {
      this.unreadCount.update(n => n + 1);
      this.toast.info(`💬 ${msg.title || 'הודעה חדשה'}`);
    });

    // Reset badge when navigating to messages
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      if (e.urlAfterRedirects?.includes('/play/messages')) {
        this.unreadCount.set(0);
      }
    });
    this.socket.onHintUnlocked().subscribe(({ hint }) => {
      this.toast.info(`💡 רמז חדש: ${hint.text || 'בדקו את הרמזים!'}`);
    });
    this.socket.onGameCompleted().subscribe(() => {
      this.confettiPieces = this.generateConfetti();
      this.gameCompleted.set(true);
    });
  }
}

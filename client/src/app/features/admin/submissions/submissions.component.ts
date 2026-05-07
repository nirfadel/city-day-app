import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { SocketService } from '../../../core/services/socket.service';
import { ToastService } from '../../../shared/services/toast.service';
import { IGroup, IMission, ISubmission } from '../../../../../../server/src/types';

@Component({
  selector: 'app-submissions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <div class="flex justify-between items-center" style="margin-bottom:1.5rem">
        <h2>📥 תשובות</h2>
        <!-- Filter -->
        <select [(ngModel)]="filter" (ngModelChange)="load()" style="padding:0.4rem;border-radius:6px;border:1px solid var(--border)">
          <option value="">הכל</option>
          <option value="pending">ממתין</option>
          <option value="approved">אושר</option>
          <option value="rejected">נדחה</option>
        </select>
      </div>

      @for (sub of submissions(); track sub._id) {
        <div class="card sub-card">
          <div class="sub-header">
            <!-- Group dot -->
            <span class="group-dot" [style.background]="groupColor(sub)"></span>
            <strong>{{ groupName(sub) }}</strong>
            <span class="text-muted">| {{ sub.submittedBy }}</span>
            <span class="text-muted" style="font-size:0.8rem">
              🎯 {{ missionTitle(sub) }}
            </span>
            <span class="badge ms-auto" [class]="'badge-' + sub.status">
              {{ labels[sub.status] }}
            </span>
          </div>

          <!-- Answer -->
          @if (sub.answerText) {
            <div class="answer-text mt-1">{{ sub.answerText }}</div>
          }
          @if (imageUrls(sub).length) {
            <div class="answer-img-grid">
              @for (url of imageUrls(sub); track url) {
                <img [src]="url" class="answer-img" />
              }
            </div>
          }

          <!-- Review -->
          @if (sub.status === 'pending') {
            <div class="review-area mt-2">
              <div class="form-group">
                <label>פידבק (אופציונלי)</label>
                <textarea [(ngModel)]="feedbacks[sub._id]" rows="2" placeholder="הודעה לקבוצה..."></textarea>
              </div>
              @if (scoringEnabled()) {
                <div class="form-group">
                  <label>ניקוד</label>
                  <input type="number" [(ngModel)]="scores[sub._id]" placeholder="0" class="score-input" />
                </div>
              }
              <div class="flex gap-1">
                <button class="btn btn-success btn-sm" (click)="review(sub._id, 'approved')">
                  ✅ אשר
                </button>
                <button class="btn btn-danger btn-sm" (click)="review(sub._id, 'rejected')">
                  ❌ דחה
                </button>
              </div>
            </div>
          }

          @if (sub.adminFeedback) {
            <div class="feedback-display mt-1">
              <strong>פידבק מנהל:</strong> {{ sub.adminFeedback }}
            </div>
          }
        </div>
      }

      @if (submissions().length === 0) {
        <div class="card text-center text-muted">אין תשובות {{ filter ? 'בסטטוס זה' : '' }}</div>
      }
    </div>
  `,
  styles: [`
    .sub-card { margin-bottom:1rem; }
    .sub-header { display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; }
    .group-dot  { width:12px; height:12px; border-radius:50%; flex-shrink:0; }
    .answer-text {
      background: var(--bg); padding: 0.75rem; border-radius: 8px;
      border-right: 3px solid var(--primary);
    }
    .answer-img-grid { display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.5rem; }
    .answer-img  { max-width:200px; flex:1 1 150px; border-radius:8px; object-fit:contain; }
    .review-area { border-top: 1px solid var(--border); padding-top:1rem; }
    .feedback-display { background:#f0fdf4; padding:0.5rem; border-radius:6px; font-size:0.9rem; }
    .ms-auto { margin-right:auto; }
    .score-input { max-width: 120px; }
    @media (max-width: 768px) {
      .score-input { max-width: 100%; }
      .review-area .flex { flex-direction: column; }
      .review-area .btn { width: 100%; }
    }
  `],
})
export class SubmissionsComponent implements OnInit {
  private api    = inject(ApiService);
  private socket = inject(SocketService);
  private toast  = inject(ToastService);

  submissions    = signal<ISubmission[]>([]);
  scoringEnabled = signal(false);
  filter      = 'pending';
  feedbacks: Record<string, string> = {};
  scores: Record<string, number>    = {};
  labels = { pending: '⏳ ממתין', approved: '✅ אושר', rejected: '❌ נדחה' };

  ngOnInit() {
    this.api.get<{ scoringEnabled: boolean }>('settings').subscribe(s => {
      this.scoringEnabled.set(s.scoringEnabled);
    });
    this.load();
    this.socket.onSubmissionReceived().subscribe(sub => {
      if (!this.filter || this.filter === 'pending') {
        this.submissions.update(s => [sub, ...s]);
      }
    });
  }

  load() {
    const params = this.filter ? `?status=${this.filter}` : '';
    this.api.get<ISubmission[]>(`submissions${params}`).subscribe(s => this.submissions.set(s));
  }

  groupColor(sub: ISubmission): string {
    return typeof sub.groupId === 'object' ? (sub.groupId as IGroup).color : '';
  }

  groupName(sub: ISubmission): string {
    return typeof sub.groupId === 'object' ? (sub.groupId as IGroup).name : '';
  }

  missionTitle(sub: ISubmission): string {
    return typeof sub.missionId === 'object' ? (sub.missionId as IMission).title : '';
  }

  imageUrls(sub: ISubmission): string[] {
    if (sub.answerImageUrls?.length) return sub.answerImageUrls;
    if (sub.answerImageUrl) return [sub.answerImageUrl];
    return [];
  }

  review(id: string, status: 'approved' | 'rejected') {
    this.api.put<ISubmission>(`submissions/${id}/review`, {
      status,
      adminFeedback: this.feedbacks[id] || '',
      score: this.scores[id] || 0,
    }).subscribe({
      next: updated => {
        // If filtered to pending — remove from view. Otherwise update in place.
        if (this.filter === 'pending') {
          this.submissions.update(s => s.filter(x => x._id !== id));
        } else {
          this.submissions.update(s => s.map(x => x._id === id ? { ...x, ...updated } : x));
        }
        delete this.feedbacks[id];
        delete this.scores[id];
        this.toast.success(status === 'approved' ? '✅ אושר!' : '❌ נדחה');
      },
      error: () => this.toast.error('שגיאה'),
    });
  }
}

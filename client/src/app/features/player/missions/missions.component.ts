import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/services/toast.service';
import { SocketService } from '../../../core/services/socket.service';
import { IMission, ISubmission } from '../../../../../../server/src/types';

@Component({
  selector: 'app-missions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <h2 style="margin-bottom:1rem">🎯 המשימות שלנו</h2>

      @if (loading()) {
        <div class="text-center mt-3"><div class="spinner" style="margin:auto"></div></div>
      }

      @for (mission of missions(); track mission._id) {
        <div class="card mission-card" style="margin-bottom:1rem">
          <div class="flex justify-between items-center">
            <h3>{{ mission.order }}. {{ mission.title }}</h3>
            <span class="badge" [class]="submissionBadge(mission._id)">
              {{ submissionLabel(mission._id) }}
            </span>
          </div>

          <!-- Envelope missions: content is in the physical envelope -->
          @if (mission.delivery === 'envelope') {
            <div class="envelope-notice mt-2">
              <span class="envelope-icon">✉️</span>
              <div>
                <strong>פתחו את המעטפה!</strong>
                <p class="text-muted" style="margin:0.25rem 0 0">
                  התשובות והמשימה נמצאות במעטפה הפיזית שקיבלתם.
                </p>
              </div>
            </div>
          } @else {
            <p style="margin-top:0.5rem;white-space:pre-line">{{ mission.content }}</p>
          }

          @if (mission.mediaUrl) {
            <img [src]="mission.mediaUrl" alt="mission media"
                 style="max-width:100%;border-radius:8px;margin-top:0.75rem" />
          }

          <!-- Submit area — shown for all non-approved missions -->
          @if (!hasApprovedSubmission(mission._id)) {
            <div class="submit-area mt-2">

              @if (mission.delivery === 'envelope') {
                <!-- Envelope: text answer for the questions + optional photos -->
                <div class="form-group">
                  <label>📝 תשובות לשאלות</label>
                  <textarea [(ngModel)]="answers[mission._id]"
                            rows="4"
                            placeholder="כתבו את התשובות כאן..."></textarea>
                </div>
                <div class="form-group">
                  <label>📷 צירוף תמונות (עד 3, אופציונלי)</label>
                  <input type="file" accept="image/*,video/*" multiple
                         (change)="onFileSelect($event, mission._id)" />
                  @if (previews[mission._id]?.length) {
                    <div class="img-preview-strip">
                      @for (url of previews[mission._id]; track url) {
                        <img [src]="url" class="img-thumb" />
                      }
                    </div>
                  }
                </div>
              } @else if (mission.type === 'photo') {
                <!-- Digital photo mission -->
                <div class="form-group">
                  <label>📷 העלו עד 3 תמונות</label>
                  <input type="file" accept="image/*,video/*" multiple
                         (change)="onFileSelect($event, mission._id)" />
                  @if (previews[mission._id]?.length) {
                    <div class="img-preview-strip">
                      @for (url of previews[mission._id]; track url) {
                        <img [src]="url" class="img-thumb" />
                      }
                    </div>
                  }
                </div>
              } @else {
                <!-- Digital text mission -->
                <div class="form-group">
                  <textarea [(ngModel)]="answers[mission._id]"
                            placeholder="כתבו את תשובתכם כאן..."></textarea>
                </div>
              }

              <button class="btn btn-primary"
                      [disabled]="submitting() === mission._id"
                      (click)="submit(mission)">
                {{ submitting() === mission._id ? 'שולח...' : 'שלח תשובה ✉️' }}
              </button>
            </div>
          }
        </div>
      }

      @if (!loading() && missions().length === 0) {
        <div class="card text-center" style="color:var(--text-muted)">
          ⏳ ממתינים למשימה הראשונה...
        </div>
      }
    </div>
  `,
  styles: [`
    .mission-card { }
    .envelope-notice {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      background: #fffbea;
      border: 1.5px dashed #f59e0b;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      margin-top: 0.5rem;
    }
    .envelope-icon { font-size: 1.75rem; flex-shrink: 0; }
    .submit-area { border-top: 1px solid var(--border); padding-top: 1rem; }
    .img-preview-strip { display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.5rem; }
    .img-thumb { width:80px; height:80px; object-fit:cover; border-radius:6px; border:1px solid var(--border); }
  `],
})
export class MissionsComponent implements OnInit {
  private api    = inject(ApiService);
  private toast  = inject(ToastService);
  private socket = inject(SocketService);

  missions    = signal<IMission[]>([]);
  submissions = signal<ISubmission[]>([]);
  loading     = signal(true);
  submitting  = signal('');
  answers:  Record<string, string>   = {};
  files:    Record<string, File[]>   = {};
  previews: Record<string, string[]> = {};

  ngOnInit() {
    this.loadAll();

    this.socket.onMissionUnlocked().subscribe(mission => {
      this.missions.update(m => [...m, mission].sort((a, b) => a.order - b.order));
    });

    // When admin reviews a submission, update its status locally
    this.socket.onSubmissionReviewed().subscribe(({ submissionId, missionId, status, adminFeedback, score }) => {
      this.submissions.update(list => {
        const updated = list.map(s => s._id === submissionId ? { ...s, status, adminFeedback, score } : s);
        // On approval, remove all other submissions for the same mission (e.g. old rejected ones)
        if (status === 'approved') {
          return updated.filter(s => s._id === submissionId || this.missionIdOf(s) !== missionId);
        }
        return updated;
      });
    });
  }

  loadAll() {
    this.loading.set(true);
    this.api.get<IMission[]>('missions').subscribe(m => this.missions.set(m));
    this.api.get<ISubmission[]>('submissions/my').subscribe(s => {
      this.submissions.set(s);
      this.loading.set(false);
    });
  }

  private missionIdOf(sub: ISubmission): string {
    return typeof sub.missionId === 'object' ? (sub.missionId as IMission)._id : sub.missionId;
  }

  submissionBadge(missionId: string): string {
    const s = this.submissions().find(x => this.missionIdOf(x) === missionId);
    return s ? `badge badge-${s.status}` : '';
  }

  submissionLabel(missionId: string): string {
    const s = this.submissions().find(x => this.missionIdOf(x) === missionId);
    if (!s) return 'לא נשלחה';
    const labels = { pending: 'ממתין לאישור', approved: 'אושר ✅', rejected: 'נדחה ❌' };
    return labels[s.status];
  }

  hasApprovedSubmission(missionId: string): boolean {
    return this.submissions().some(x => this.missionIdOf(x) === missionId && x.status === 'approved');
  }

  onFileSelect(event: Event, missionId: string) {
    const selected = Array.from((event.target as HTMLInputElement).files ?? []).slice(0, 3);
    (this.previews[missionId] ?? []).forEach(url => URL.revokeObjectURL(url));
    this.files[missionId]    = selected;
    this.previews[missionId] = selected.map(f => URL.createObjectURL(f));
  }

  submit(mission: IMission) {
    const text      = this.answers[mission._id];
    const fileList  = this.files[mission._id] ?? [];
    if (!text && fileList.length === 0) { this.toast.warning('יש להזין תשובה או תמונה'); return; }

    this.submitting.set(mission._id);
    const fd = new FormData();
    fd.append('missionId', mission._id);
    if (text) fd.append('answerText', text);
    fileList.forEach(f => fd.append('images', f));

    this.api.postForm<ISubmission>('submissions', fd).subscribe({
      next: sub => {
        this.submissions.update(s => [...s, sub]);
        this.toast.success('תשובה נשלחה! 🎉');
        delete this.answers[mission._id];
        delete this.files[mission._id];
        (this.previews[mission._id] ?? []).forEach(url => URL.revokeObjectURL(url));
        delete this.previews[mission._id];
        this.submitting.set('');
      },
      error: err => {
        this.toast.error(err.error?.error || 'שגיאה בשליחה');
        this.submitting.set('');
      },
    });
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/services/toast.service';
import { IGroup, IMessage } from '../../../../../../server/src/types';

@Component({
  selector: 'app-admin-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <h2 style="margin-bottom:1.5rem">💬 שליחת הודעה</h2>

      <!-- Compose form -->
      <div class="card form-card">
        <div class="form-group">
          <label>נמען</label>
          <select [(ngModel)]="form.groupId">
            <option value="">📢 כל הקבוצות</option>
            @for (g of groups(); track g._id) {
              <option [value]="g._id">{{ g.emoji }} {{ g.name }}</option>
            }
          </select>
        </div>

        <!-- Type selector -->
        <div class="type-tabs">
          <button class="type-tab" [class.active]="form.type === 'broadcast'" (click)="form.type = 'broadcast'">
            📢 הודעה
          </button>
          <button class="type-tab" [class.active]="form.type === 'hint'" (click)="form.type = 'hint'">
            💡 רמז
          </button>
        </div>

        <div class="form-group">
          <label>כותרת (אופציונלי)</label>
          <input [(ngModel)]="form.title" placeholder="למשל: רמז 2 — המשך הדרך" />
        </div>

        <div class="form-group">
          <label>{{ form.type === 'hint' ? 'טקסט הרמז' : 'הודעה' }}</label>
          <textarea [(ngModel)]="form.content" rows="3"
                    placeholder="{{ form.type === 'hint' ? 'הוראות או רמז טקסטואלי...' : 'כתוב כאן את ההודעה...' }}"></textarea>
        </div>

        @if (form.type === 'hint') {
          <div class="form-group">
            <label>תמונת רמז (אופציונלי)</label>
            <input type="file" accept="image/*" (change)="onImageSelect($event)" />
            @if (imagePreview) {
              <div style="margin-top:0.5rem">
                <img [src]="imagePreview" style="max-height:80px;border-radius:6px;border:1px solid var(--border)" />
              </div>
            }
          </div>
        }

        <!-- Quick templates -->
        <div class="templates">
          <span class="templates-label">תבניות מהירות:</span>
          @for (t of templates; track t.label) {
            <button class="template-btn" (click)="applyTemplate(t)">{{ t.label }}</button>
          }
        </div>

        <button class="btn btn-primary btn-block mt-2"
                [disabled]="sending() || !form.content.trim()"
                (click)="send()">
          {{ sending() ? 'שולח...' : (form.groupId ? '📨 שלח לקבוצה' : '📢 שלח לכולם') }}
        </button>
      </div>

      <!-- History -->
      <h3 style="margin:1.5rem 0 0.75rem">היסטוריה</h3>
      @if (messages().length === 0) {
        <div class="card text-center text-muted">אין הודעות עדיין</div>
      }
      @for (msg of messages(); track msg._id) {
        <div class="card msg-card">
          <div class="msg-header">
            <span class="msg-icon">{{ typeIcon(msg.type) }}</span>
            <div class="msg-meta">
              <strong>{{ msg.title || typeLabel(msg.type) }}</strong>
              <span class="text-muted">
                {{ groupLabel(msg) }} · {{ msg.createdAt | date:'HH:mm' }}
              </span>
            </div>
          </div>
          <p class="msg-content">{{ msg.content }}</p>
          @if (msg.mediaUrl) {
            <img [src]="msg.mediaUrl" class="msg-img" />
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .form-card { margin-bottom: 1rem; }
    .type-tabs { display:flex; gap:0.5rem; margin-bottom:1rem; }
    .type-tab {
      flex:1; padding:0.5rem; border-radius:8px; border:1.5px solid var(--border);
      background:none; cursor:pointer; font-family:inherit; font-weight:600; font-size:0.9rem;
      transition:all 0.15s;
      &.active { background:var(--primary); border-color:var(--primary); color:#fff; }
      &:not(.active):hover { background:var(--bg); }
    }
    .msg-img { max-width:100%; border-radius:8px; margin-top:0.5rem; max-height:200px; object-fit:contain; }
    .templates { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.25rem; align-items: center; }
    .templates-label { font-size: 0.8rem; color: var(--text-muted); font-weight: 600; }
    .template-btn {
      font-size: 0.78rem; padding: 0.25rem 0.6rem; border-radius: 999px;
      border: 1.5px solid var(--border); background: none; cursor: pointer;
      font-family: inherit; transition: all 0.15s;
      &:hover { background: var(--primary); border-color: var(--primary); }
    }
    .msg-card { margin-bottom: 0.75rem; border-right: 4px solid var(--border); }
    .msg-header { display: flex; align-items: flex-start; gap: 0.6rem; }
    .msg-icon { font-size: 1.4rem; flex-shrink: 0; }
    .msg-meta { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
    .msg-meta strong { font-size: 0.95rem; }
    .msg-meta .text-muted { font-size: 0.78rem; }
    .msg-content { margin-top: 0.5rem; font-size: 0.9rem; white-space: pre-line; }
  `],
})
export class AdminMessagesComponent implements OnInit {
  private api   = inject(ApiService);
  private toast = inject(ToastService);

  groups   = signal<IGroup[]>([]);
  messages = signal<IMessage[]>([]);
  sending  = signal(false);

  form = { groupId: '', title: '', content: '', type: 'broadcast' };
  imageFile:    File | null = null;
  imagePreview: string | null = null;

  templates = [
    { label: '🔥 כל הכבוד!',      title: 'כל הכבוד!',     content: 'אתם עושים עבודה מצוינת! המשיכו כך 💪' },
    { label: '⚡ מהרו!',           title: 'מהרו!',          content: 'יש לכם עוד הרבה משימות לפניכם — קדימה! 🏃' },
    { label: '💡 רמז כללי',        title: 'טיפ מהמנהל',    content: 'שימו לב לפרטים הקטנים — הם עשויים לעזור 😉' },
    { label: '⏳ עצרו רגע',        title: 'המתינו בבקשה',  content: 'אנחנו בודקים משהו — המתינו לעדכון נוסף.' },
  ];

  ngOnInit() {
    this.api.get<IGroup[]>('groups').subscribe(g => this.groups.set(g));
    this.loadMessages();
  }

  loadMessages() {
    this.api.get<IMessage[]>('messages/all').subscribe(m => this.messages.set(m));
  }

  applyTemplate(t: { label: string; title: string; content: string }) {
    this.form.title   = t.title;
    this.form.content = t.content;
  }

  onImageSelect(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0] ?? null;
    this.imageFile = file;
    this.imagePreview = file ? URL.createObjectURL(file) : null;
  }

  send() {
    if (!this.form.content.trim()) return;
    this.sending.set(true);

    const fd = new FormData();
    fd.append('groupId', this.form.groupId || '');
    fd.append('type',    this.form.type);
    fd.append('title',   this.form.title);
    fd.append('content', this.form.content);
    if (this.imageFile) fd.append('media', this.imageFile);

    this.api.postForm<IMessage>('messages', fd).subscribe({
      next: msg => {
        this.messages.update(m => [msg, ...m]);
        this.form = { groupId: '', title: '', content: '', type: 'broadcast' };
        this.imageFile    = null;
        this.imagePreview = null;
        this.sending.set(false);
        this.toast.success('ההודעה נשלחה!');
      },
      error: () => {
        this.sending.set(false);
        this.toast.error('שגיאה בשליחה');
      },
    });
  }

  typeIcon(type: string) {
    return { broadcast: '📢', hint: '💡', feedback: '📝', welcome: '👋', mission_unlock: '🎯' }[type] ?? '💬';
  }

  typeLabel(type: string) {
    return { broadcast: 'הודעה כללית', hint: 'רמז', feedback: 'פידבק', welcome: 'ברוכים הבאים', mission_unlock: 'משימה' }[type] ?? 'הודעה';
  }

  groupLabel(msg: IMessage): string {
    if (!msg.groupId) return 'כל הקבוצות';
    const g = msg.groupId as any;
    return typeof g === 'object' ? `${g.name}` : 'קבוצה';
  }
}

import { Component, OnInit, inject, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/services/toast.service';
import { IMission, MissionDelivery } from '../../../../../../server/src/types';

interface MissionForm {
  order: number;
  title: string;
  type: string;
  delivery: MissionDelivery;
  content: string;
  autoHintTitle: string;
  hintMode: 'auto' | 'manual' | 'none';
}

@Component({
  selector: 'app-admin-missions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <div class="flex justify-between items-center" style="margin-bottom:1.5rem">
        <h2>🎯 משימות</h2>
        <button class="btn btn-primary" (click)="openCreate()">
          {{ showForm() === 'create' ? 'ביטול' : '+ משימה חדשה' }}
        </button>
      </div>

      <!-- Create / Edit form -->
      @if (showForm()) {
        <div class="card form-card" #formCard>
          <h3 style="margin-bottom:1rem">
            {{ showForm() === 'edit' ? 'עריכת משימה' : 'משימה חדשה' }}
          </h3>

          <div class="form-row-3">
            <div class="form-group">
              <label>מספר סדר</label>
              <input type="number" [(ngModel)]="form.order" min="1" />
            </div>
            <div class="form-group">
              <label>סוג תשובה</label>
              <select [(ngModel)]="form.type">
                <option value="text">טקסט</option>
                <option value="photo">תמונה / סרטון</option>
                <option value="location">מיקום + תמונה</option>
              </select>
            </div>
            <div class="form-group">
              <label>אופן קבלה</label>
              <select [(ngModel)]="form.delivery">
                <option value="envelope">מעטפה פיזית ✉️</option>
                <option value="digital">דיגיטלי 📱</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>כותרת</label>
            <input [(ngModel)]="form.title" placeholder="כותרת המשימה" />
          </div>

          <div class="form-group">
            <label>
              תוכן / שאלה
              @if (form.delivery === 'envelope') {
                <span class="text-muted" style="font-size:0.8rem"> — מוצג רק למנהל (השחקן פותח מעטפה)</span>
              }
            </label>
            <textarea [(ngModel)]="form.content" rows="5"
                      placeholder="הכנס את תוכן המשימה..."></textarea>
          </div>

          <div class="form-group">
            <label>קובץ מדיה (תמונה)</label>
            <input type="file" accept="image/*" (change)="onMediaSelect($event)" />
            @if (mediaPreview) {
              <div class="current-hint-preview">
                <span class="text-muted" style="font-size:0.8rem">✅ נבחר:</span>
                <img [src]="mediaPreview" style="max-height:60px;border-radius:4px" />
              </div>
            } @else if (editingMission()?.mediaUrl) {
              <div class="current-hint-preview">
                <span class="text-muted" style="font-size:0.8rem">נוכחי:</span>
                <img [src]="editingMission()!.mediaUrl" style="max-height:60px;border-radius:4px" />
              </div>
            }
          </div>

          <div class="hint-section">
            <div class="hint-section-header">
              <h4>🗺️ רמז למשימה</h4>
              @if (showForm() === 'edit' && editingMission()?.autoHintOnApproval && !hintPreview) {
                <button class="btn btn-danger btn-sm" [disabled]="removingHint()"
                        (click)="removeAutoHint()">
                  {{ removingHint() ? '...' : '🗑️ הסר רמז' }}
                </button>
              }
            </div>

            <!-- Mode selector -->
            <div class="hint-mode-tabs">
              <button class="hint-mode-tab" [class.active]="form.hintMode === 'none'"
                      (click)="form.hintMode = 'none'" type="button">ללא רמז</button>
              <button class="hint-mode-tab" [class.active]="form.hintMode === 'auto'"
                      (click)="form.hintMode = 'auto'" type="button">⚡ אוטומטי</button>
              <button class="hint-mode-tab" [class.active]="form.hintMode === 'manual'"
                      (click)="form.hintMode = 'manual'" type="button">✋ ידני</button>
            </div>

            @if (form.hintMode === 'auto') {
              <p class="text-muted" style="font-size:0.82rem;margin:0.5rem 0 0.75rem">
                הרמז יישלח אוטומטית לקבוצה ברגע שתאשר את תשובתה.
              </p>
            }
            @if (form.hintMode === 'manual') {
              <p class="text-muted" style="font-size:0.82rem;margin:0.5rem 0 0.75rem">
                הרמז שמור במשימה — תשלח אותו ידנית מדף התשובות כשתחליט.
              </p>
            }

            @if (form.hintMode !== 'none') {
              <div class="form-group">
                <label>כותרת הרמז</label>
                <input [(ngModel)]="form.autoHintTitle" placeholder="לדוגמה: רמז 1 — ניווט לכיכר פריז" />
              </div>
              <div class="form-group">
                <label>תמונת הרמז</label>
                <input type="file" accept="image/*" (change)="onHintSelect($event)" />
                @if (hintPreview) {
                  <div class="current-hint-preview">
                    <span class="text-muted" style="font-size:0.8rem">✅ נבחר:</span>
                    <img [src]="hintPreview" style="max-height:60px;border-radius:4px" />
                  </div>
                } @else if (editingMission()?.autoHintOnApproval) {
                  <div class="current-hint-preview">
                    <span class="text-muted" style="font-size:0.8rem">נוכחי:</span>
                    <img [src]="editingMission()!.autoHintOnApproval" style="max-height:60px;border-radius:4px" />
                  </div>
                }
              </div>
            }
          </div>

          <div class="flex gap-1 mt-2">
            <button class="btn btn-primary" [disabled]="saving()" (click)="save()">
              {{ saving() ? 'שומר...' : (showForm() === 'edit' ? 'שמור שינויים' : 'צור משימה') }}
            </button>
            <button class="btn" (click)="closeForm()">ביטול</button>
          </div>
        </div>
      }

      <!-- Missions list -->
      <div class="missions-list">
        @for (mission of missions(); track mission._id; let i = $index) {
          <div class="card mission-item" [class.active]="mission.isActive">
            <div class="mission-header">
              <!-- Reorder arrows -->
              <div class="order-controls">
                <button class="order-btn" [disabled]="i === 0"
                        (click)="moveUp(i)" title="הזז למעלה">▲</button>
                <span class="mission-order">{{ mission.order }}</span>
                <button class="order-btn" [disabled]="i === missions().length - 1"
                        (click)="moveDown(i)" title="הזז למטה">▼</button>
              </div>

              <div class="mission-info">
                <strong>{{ mission.title }}</strong>
                <div class="mission-meta">
                  <span class="tag">{{ typeLabel(mission.type) }}</span>
                  <span class="tag" [class.tag-envelope]="mission.delivery === 'envelope'">
                    {{ mission.delivery === 'envelope' ? '✉️ מעטפה' : '📱 דיגיטלי' }}
                  </span>
                  @if (mission.autoHintOnApproval) {
                    <span class="tag tag-hint">🗺️ רמז אוטו׳</span>
                  }
                </div>
              </div>

              <div class="mission-actions">
                @if (mission.isActive) {
                  <span class="badge badge-approved">פעיל ✅</span>
                }
                <button class="btn btn-sm" (click)="edit(mission)" title="עריכה">✏️</button>
                <button class="btn btn-danger btn-sm" (click)="confirmDelete(mission)" title="מחיקה">🗑️</button>
              </div>
            </div>

            <p class="mission-content-preview text-muted">
              {{ mission.content | slice:0:100 }}{{ mission.content.length > 100 ? '...' : '' }}
            </p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .form-card { margin-bottom: 1.5rem; }
    .form-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; }
    .hint-section {
      border: 1px solid var(--border); border-radius: 8px;
      padding: 1rem; margin-top: 0.5rem; background: #f8fafc;
    }
    .hint-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
    .hint-section-header h4 { margin: 0; }
    .hint-mode-tabs { display:flex; gap:0.4rem; margin-bottom:0.25rem; }
    .hint-mode-tab {
      flex:1; padding:0.35rem 0.5rem; border-radius:6px; border:1.5px solid var(--border);
      background:none; cursor:pointer; font-family:inherit; font-size:0.82rem; font-weight:600;
      transition:all 0.15s;
      &.active { background:var(--primary); border-color:var(--primary); color:#fff; }
      &:not(.active):hover { background:var(--bg); }
    }
    .current-hint-preview { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; }

    .missions-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .mission-item { transition: box-shadow 0.15s; }
    .mission-item.active { border-right: 3px solid var(--success, #22c55e); }
    .mission-header { display: flex; align-items: center; gap: 0.75rem; }

    .order-controls { display: flex; flex-direction: column; align-items: center; gap: 0; flex-shrink: 0; }
    .order-btn {
      background: none; border: none; cursor: pointer; font-size: 1rem;
      color: var(--text-muted); padding: 0.2rem; line-height: 1;
      min-width: 28px; min-height: 28px;
      display: flex; align-items: center; justify-content: center;
      &:disabled { opacity: 0.2; cursor: default; }
      &:not(:disabled):hover { color: var(--primary); }
    }
    .mission-order {
      width: 36px; height: 36px; border-radius: 50%; background: var(--primary);
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 0.9rem; flex-shrink: 0;
    }
    .mission-info { flex: 1; min-width: 0; }
    .mission-meta { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.25rem; }
    .tag {
      font-size: 0.75rem; padding: 0.15rem 0.5rem; border-radius: 99px;
      background: var(--border); color: var(--text-muted);
    }
    .tag-envelope { background: #fef3c7; color: #92400e; }
    .tag-hint     { background: #ede9fe; color: #5b21b6; }

    .mission-actions { display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0; margin-right: auto; }
    .mission-content-preview { font-size: 0.85rem; margin-top: 0.4rem; }

    @media (max-width: 768px) {
      .form-row-3 { grid-template-columns: 1fr; }
      .mission-actions .btn { padding: 0.4rem 0.6rem; font-size: 0.8rem; }
    }
  `],
})
export class AdminMissionsComponent implements OnInit {
  private api   = inject(ApiService);
  private toast = inject(ToastService);

  @ViewChild('formCard') formCard!: ElementRef<HTMLElement>;

  missions       = signal<IMission[]>([]);
  showForm       = signal<'create' | 'edit' | null>(null);
  saving         = signal(false);
  removingHint   = signal(false);
  editingMission = signal<IMission | null>(null);

  form: MissionForm = this.emptyForm();
  mediaFile: File | null = null;
  hintFile:  File | null = null;
  mediaPreview: string | null = null;
  hintPreview:  string | null = null;

  ngOnInit() { this.load(); }

  load() {
    this.api.get<IMission[]>('missions').subscribe(m => this.missions.set(m));
  }

  typeLabel(type: string) {
    return { text: 'טקסט', photo: 'תמונה', location: 'מיקום' }[type] ?? type;
  }

  private emptyForm(): MissionForm {
    return { order: 1, title: '', type: 'text', delivery: 'digital', content: '', autoHintTitle: '', hintMode: 'none' };
  }

  openCreate() {
    if (this.showForm() === 'create') { this.closeForm(); return; }
    this.form = this.emptyForm();
    this.form.order = (this.missions().length > 0)
      ? Math.max(...this.missions().map(m => m.order)) + 1
      : 1;
    this.editingMission.set(null);
    this.mediaFile = null;
    this.hintFile  = null;
    this.showForm.set('create');
  }

  edit(mission: IMission) {
    this.form = {
      order:         mission.order,
      title:         mission.title,
      type:          mission.type,
      delivery:      (mission as any).delivery ?? 'digital',
      content:       mission.content,
      autoHintTitle: mission.autoHintTitle ?? '',
      hintMode:      mission.hintMode ?? 'none',
    };
    this.editingMission.set(mission);
    this.mediaFile = null;
    this.hintFile  = null;
    this.mediaPreview = null;
    this.hintPreview  = null;
    this.showForm.set('edit');
    setTimeout(() => {
      const el = this.formCard?.nativeElement;
      if (!el) return;
      // scroll the scrollable parent (.admin-main) to show the form
      const scrollParent = el.closest('.admin-main') ?? el.parentElement;
      if (scrollParent) scrollParent.scrollTo({ top: 0, behavior: 'smooth' });
      else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  closeForm() {
    this.showForm.set(null);
    this.editingMission.set(null);
    this.mediaFile = null;
    this.hintFile  = null;
    this.mediaPreview = null;
    this.hintPreview  = null;
  }

  onMediaSelect(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0] ?? null;
    this.mediaFile = file;
    this.mediaPreview = file ? URL.createObjectURL(file) : null;
  }

  onHintSelect(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0] ?? null;
    this.hintFile = file;
    this.hintPreview = file ? URL.createObjectURL(file) : null;
  }

  save() {
    this.saving.set(true);
    const fd = new FormData();
    fd.append('order',         String(this.form.order));
    fd.append('title',         this.form.title);
    fd.append('type',          this.form.type);
    fd.append('delivery',      this.form.delivery);
    fd.append('content',       this.form.content);
    fd.append('autoHintTitle', this.form.autoHintTitle);
    fd.append('hintMode',      this.form.hintMode);
    if (this.mediaFile) fd.append('media', this.mediaFile);
    if (this.hintFile)  fd.append('hint',  this.hintFile);

    const request = this.showForm() === 'edit' && this.editingMission()
      ? this.api.putForm<IMission>(`missions/${this.editingMission()!._id}`, fd)
      : this.api.postForm<IMission>('missions', fd);

    const mode = this.showForm();
    request.subscribe({
      next: () => {
        this.load();
        this.closeForm();
        this.toast.success(mode === 'edit' ? 'משימה עודכנה!' : 'משימה נוצרה!');
        this.saving.set(false);
      },
      error: err => { this.toast.error(err.error?.error || 'שגיאה'); this.saving.set(false); },
    });
  }

  removeAutoHint() {
    const mission = this.editingMission();
    if (!mission) return;
    if (!confirm('להסיר את הרמז האוטומטי ממשימה זו?')) return;
    this.removingHint.set(true);
    this.api.delete<IMission>(`missions/${mission._id}/hint`).subscribe({
      next: updated => {
        this.editingMission.set(updated);
        this.form.autoHintTitle = '';
        this.hintFile = null;
        this.hintPreview = null;
        this.missions.update(list => list.map(m => m._id === updated._id ? updated : m));
        this.toast.success('הרמז הוסר');
        this.removingHint.set(false);
      },
      error: () => { this.toast.error('שגיאה בהסרת הרמז'); this.removingHint.set(false); },
    });
  }

  confirmDelete(mission: IMission) {
    if (!confirm(`למחוק את "${mission.title}"?`)) return;
    this.api.delete(`missions/${mission._id}`).subscribe({
      next: () => { this.missions.update(m => m.filter(x => x._id !== mission._id)); this.toast.success('נמחק'); },
      error: () => this.toast.error('שגיאה במחיקה'),
    });
  }

  moveUp(i: number) {
    if (i === 0) return;
    const list = [...this.missions()];
    [list[i - 1], list[i]] = [list[i], list[i - 1]];
    this.saveOrder(list);
  }

  moveDown(i: number) {
    const list = [...this.missions()];
    if (i >= list.length - 1) return;
    [list[i], list[i + 1]] = [list[i + 1], list[i]];
    this.saveOrder(list);
  }

  private saveOrder(list: IMission[]) {
    const reordered = list.map((m, idx) => ({ ...m, order: idx + 1 }));
    this.missions.set(reordered);
    const payload = reordered.map(m => ({ id: m._id, order: m.order }));
    this.api.put<IMission[]>('missions/reorder', payload).subscribe({
      next: m => this.missions.set(m),
      error: () => { this.toast.error('שגיאה בשמירת הסדר'); this.load(); },
    });
  }
}

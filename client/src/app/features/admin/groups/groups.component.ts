import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/services/toast.service';
import { IGroup } from '../../../../../../server/src/types';

const COLORS = [
  '#e74c3c','#e67e22','#f1c40f','#2ecc71','#1abc9c',
  '#3498db','#9b59b6','#34495e','#e91e63','#00bcd4',
];
const EMOJIS = ['🏆','⚡','🔥','🌟','🎯','🚀','💎','🦁','🐯','🦊','🐺','🦅','🌈','🍀','🎸','⚽'];

interface GroupForm { name: string; color: string; emoji: string; }

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <div class="flex justify-between items-center" style="margin-bottom:1.5rem">
        <h2>👥 קבוצות</h2>
        <button class="btn btn-primary" (click)="toggleCreate()">
          {{ showCreate() ? 'ביטול' : '+ קבוצה חדשה' }}
        </button>
      </div>

      <!-- Create form -->
      @if (showCreate()) {
        <div class="card form-card">
          <h3 style="margin-bottom:1rem">קבוצה חדשה</h3>
          <ng-container *ngTemplateOutlet="groupForm; context: { $implicit: newGroup }" />
          <button class="btn btn-primary mt-1" (click)="create()">צור קבוצה</button>
        </div>
      }

      <!-- Groups list -->
      <div class="groups-list">
        @for (group of groups(); track group._id) {
          <div class="card group-card">

            <!-- View mode -->
            @if (editingId() !== group._id) {
              <div class="group-view">
                <div class="group-identity">
                  <span class="group-emoji">{{ group.emoji }}</span>
                  <div class="color-swatch" [style.background]="group.color"></div>
                  <strong class="group-name">{{ group.name }}</strong>
                  <span class="badge" style="margin-right:auto">{{ group.memberCount }} חברים</span>
                </div>
                <div class="group-actions">
                  <button class="btn btn-sm" (click)="startEdit(group)">✏️ עריכה</button>
                  <button class="btn btn-danger btn-sm" (click)="confirmDelete(group)">🗑️</button>
                </div>
              </div>

              <!-- Welcome message (always visible) -->
              <div class="form-group welcome-section mt-1">
                <label>הודעת ברוכים הבאים</label>
                <textarea [(ngModel)]="welcomeTexts[group._id]"
                          placeholder="הודעה שהקבוצה תקבל בהצטרפות..." rows="2"></textarea>
                <button class="btn btn-outline btn-sm" (click)="saveWelcome(group._id)">
                  שמור הודעה
                </button>
              </div>
            }

            <!-- Edit mode -->
            @if (editingId() === group._id) {
              <h4 style="margin-bottom:0.75rem">✏️ עריכת קבוצה</h4>
              <ng-container *ngTemplateOutlet="groupForm; context: { $implicit: editForm }" />
              <div class="flex gap-1 mt-1">
                <button class="btn btn-primary" (click)="saveEdit(group._id)">שמור</button>
                <button class="btn" (click)="editingId.set(null)">ביטול</button>
              </div>
            }

          </div>
        }
      </div>
    </div>

    <!-- Shared form template -->
    <ng-template #groupForm let-form>
      <div class="form-group">
        <label>שם</label>
        <input [(ngModel)]="form.name" placeholder="שם הקבוצה" />
      </div>
      <div class="form-group">
        <label>צבע</label>
        <div class="color-grid">
          @for (c of colors; track c) {
            <button class="color-dot" [style.background]="c"
                    [class.selected]="form.color === c"
                    (click)="form.color = c"
                    [title]="c"></button>
          }
          <!-- Custom color picker -->
          <label class="color-dot custom-color" title="בחר צבע מותאם">
            <input type="color" [(ngModel)]="form.color" style="opacity:0;position:absolute;width:0;height:0" />
            🎨
          </label>
        </div>
        <div class="color-preview mt-half">
          <div class="color-swatch" [style.background]="form.color"></div>
          <span class="text-muted" style="font-size:0.8rem">{{ form.color }}</span>
        </div>
      </div>
      <div class="form-group">
        <label>אמוג'י</label>
        <div class="emoji-grid">
          @for (e of emojis; track e) {
            <button class="emoji-pick" [class.selected]="form.emoji === e"
                    (click)="form.emoji = e">{{ e }}</button>
          }
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    .form-card  { margin-bottom: 1.5rem; }
    .groups-list { display: flex; flex-direction: column; gap: 1rem; }

    .group-view { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .group-identity { display: flex; align-items: center; gap: 0.6rem; flex: 1; min-width: 0; }
    .group-emoji { font-size: 1.6rem; flex-shrink: 0; }
    .group-name  { font-size: 1.05rem; }
    .group-actions { display: flex; gap: 0.4rem; flex-shrink: 0; }

    .color-swatch { width: 18px; height: 18px; border-radius: 4px; flex-shrink: 0; border: 1px solid rgba(0,0,0,.15); }
    .color-preview { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.35rem; }

    .color-grid { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .color-dot {
      width: 44px; height: 44px; border-radius: 50%; cursor: pointer;
      border: 3px solid transparent; padding: 0; position: relative;
      transition: transform 0.1s;
      &.selected { border-color: #1a1a1a; transform: scale(1.15); }
      &:hover:not(.selected) { transform: scale(1.08); }
    }
    .custom-color {
      background: #f0f0f0; display: flex; align-items: center; justify-content: center;
      font-size: 1rem; cursor: pointer;
    }

    .emoji-grid { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .emoji-pick {
      font-size: 1.5rem; cursor: pointer; padding: 0.25rem 0.4rem;
      border-radius: 6px; border: 2px solid transparent; background: none;
      transition: background 0.1s;
      &.selected { background: var(--primary); border-color: #0001; }
      &:hover:not(.selected) { background: var(--border); }
    }

    .welcome-section { border-top: 1px solid var(--border); padding-top: 0.75rem; margin-bottom: 0; }
  `],
})
export class GroupsComponent implements OnInit {
  private api   = inject(ApiService);
  private toast = inject(ToastService);

  groups      = signal<(IGroup & { memberCount: number })[]>([]);
  showCreate  = signal(false);
  editingId   = signal<string | null>(null);

  welcomeTexts: Record<string, string> = {};
  colors = COLORS;
  emojis = EMOJIS;

  newGroup: GroupForm = { name: '', color: COLORS[0], emoji: EMOJIS[0] };
  editForm: GroupForm = { name: '', color: COLORS[0], emoji: EMOJIS[0] };

  ngOnInit() { this.load(); }

  load() {
    this.api.get<(IGroup & { memberCount: number })[]>('groups').subscribe(g => this.groups.set(g));
  }

  toggleCreate() {
    this.showCreate.update(v => !v);
    if (this.showCreate()) this.newGroup = { name: '', color: COLORS[0], emoji: EMOJIS[0] };
  }

  create() {
    if (!this.newGroup.name.trim()) { this.toast.warning('הזן שם לקבוצה'); return; }
    this.api.post<IGroup>('groups', this.newGroup).subscribe({
      next: () => { this.load(); this.showCreate.set(false); this.toast.success('קבוצה נוצרה!'); },
      error: err => this.toast.error(err.error?.error || 'שגיאה'),
    });
  }

  startEdit(group: IGroup) {
    this.editForm = { name: group.name, color: group.color, emoji: group.emoji };
    this.editingId.set(group._id);
  }

  saveEdit(id: string) {
    if (!this.editForm.name.trim()) { this.toast.warning('שם לא יכול להיות ריק'); return; }
    this.api.put<IGroup>(`groups/${id}`, this.editForm).subscribe({
      next: updated => {
        this.groups.update(list =>
          list.map(g => g._id === id ? { ...g, ...updated } : g)
        );
        this.editingId.set(null);
        this.toast.success('הקבוצה עודכנה!');
      },
      error: err => this.toast.error(err.error?.error || 'שגיאה בעדכון'),
    });
  }

  confirmDelete(group: IGroup & { memberCount: number }) {
    if (group.memberCount > 0) {
      this.toast.warning(`לא ניתן למחוק — יש ${group.memberCount} חברים בקבוצה`);
      return;
    }
    if (!confirm(`למחוק את קבוצת "${group.name}"?`)) return;
    this.api.delete(`groups/${group._id}`).subscribe({
      next: () => { this.groups.update(list => list.filter(g => g._id !== group._id)); this.toast.success('נמחק'); },
      error: err => this.toast.error(err.error?.error || 'שגיאה'),
    });
  }

  saveWelcome(groupId: string) {
    const content = this.welcomeTexts[groupId];
    if (!content?.trim()) { this.toast.warning('הזן טקסט לברכה'); return; }
    this.api.put('messages/welcome', { groupId, content }).subscribe({
      next: () => this.toast.success('הברכה נשמרה!'),
      error: () => this.toast.error('שגיאה בשמירה'),
    });
  }
}

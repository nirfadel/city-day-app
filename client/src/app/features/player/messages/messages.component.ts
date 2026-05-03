import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { SocketService } from '../../../core/services/socket.service';
import { IMessage } from '../../../../../../server/src/types';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <h2 style="margin-bottom:1rem">💬 הודעות</h2>

      @for (msg of messages(); track msg._id) {
        <div class="card message-card" [class]="'msg-' + msg.type" style="margin-bottom:0.75rem">
          <div class="msg-header">
            <span class="msg-type-icon">{{ typeIcon(msg.type) }}</span>
            <strong>{{ msg.title || typeLabel(msg.type) }}</strong>
            <span class="text-muted" style="font-size:0.75rem;margin-right:auto">
              {{ msg.createdAt | date:'HH:mm' }}
            </span>
          </div>
          <p style="margin-top:0.5rem">{{ msg.content }}</p>
          @if (msg.mediaUrl) {
            <img [src]="msg.mediaUrl" style="max-width:100%;border-radius:8px;margin-top:0.5rem" />
          }
        </div>
      }

      @if (messages().length === 0) {
        <div class="card text-center text-muted">אין הודעות עדיין</div>
      }
    </div>
  `,
  styles: [`
    .message-card { border-right: 4px solid var(--border); }
    .msg-feedback    { border-color: var(--info); }
    .msg-welcome     { border-color: var(--success); }
    .msg-broadcast   { border-color: var(--warning); }
    .msg-header      { display: flex; align-items: center; gap: 0.5rem; }
    .msg-type-icon   { font-size: 1.2rem; }
  `],
})
export class MessagesComponent implements OnInit {
  private api    = inject(ApiService);
  private socket = inject(SocketService);

  messages = signal<IMessage[]>([]);

  ngOnInit() {
    this.api.get<IMessage[]>('messages').subscribe(m => this.messages.set(m));
    this.socket.onNewMessage().subscribe(msg => {
      this.messages.update(m => [msg, ...m]);
    });
  }

  typeIcon(type: string) {
    const icons: Record<string, string> = {
      welcome: '👋', hint: '💡', mission_unlock: '🎯', feedback: '📝', broadcast: '📢'
    };
    return icons[type] || '💬';
  }

  typeLabel(type: string) {
    const labels: Record<string, string> = {
      welcome: 'ברוכים הבאים', hint: 'רמז', mission_unlock: 'משימה חדשה',
      feedback: 'פידבק', broadcast: 'הודעה כללית'
    };
    return labels[type] || 'הודעה';
  }
}

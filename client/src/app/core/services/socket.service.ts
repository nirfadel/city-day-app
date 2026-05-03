// src/app/core/services/socket.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { SOCKET_EVENTS } from '../../../../../server/src/types';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket!: Socket;

  private joinPayload: { event: string; data?: unknown } | null = null;

  connect(): void {
    if (this.socket?.connected) return;
    this.socket = io(environment.apiUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    this.socket.on('connect', () => {
      console.log('[Socket] Connected');
      // Re-join room on every connect/reconnect
      if (this.joinPayload) {
        this.socket.emit(this.joinPayload.event, this.joinPayload.data);
      }
    });
    this.socket.on('disconnect', reason => console.log('[Socket] Disconnected:', reason));
    this.socket.on('connect_error', err => console.warn('[Socket] Error:', err.message));
  }

  joinAsPlayer(groupId: string, nickname: string, groupName?: string, groupColor?: string): void {
    this.joinPayload = { event: SOCKET_EVENTS.JOIN_ROOM, data: { groupId, nickname, groupName, groupColor } };
    if (this.socket?.connected) this.socket.emit(this.joinPayload.event, this.joinPayload.data);
    else this.socket?.once('connect', () => this.socket.emit(this.joinPayload!.event, this.joinPayload!.data));
  }

  joinAsAdmin(): void {
    this.joinPayload = { event: SOCKET_EVENTS.ADMIN_JOIN };
    if (this.socket?.connected) this.socket.emit(SOCKET_EVENTS.ADMIN_JOIN);
    else this.socket?.once('connect', () => this.socket.emit(SOCKET_EVENTS.ADMIN_JOIN));
  }

  // Generic listener
  on<T>(event: string): Observable<T> {
    return new Observable(observer => {
      this.socket.on(event, (data: T) => observer.next(data));
      return () => this.socket.off(event);
    });
  }

  // Typed listeners
  onUserJoined()         { return this.on<any>(SOCKET_EVENTS.USER_JOINED); }
  onMissionUnlocked()    { return this.on<any>(SOCKET_EVENTS.MISSION_UNLOCKED); }
  onSubmissionReceived() { return this.on<any>(SOCKET_EVENTS.SUBMISSION_RECEIVED); }
  onSubmissionReviewed() { return this.on<any>(SOCKET_EVENTS.SUBMISSION_REVIEWED); }
  onNewMessage()         { return this.on<any>(SOCKET_EVENTS.MESSAGE_NEW); }
  onHintUnlocked()       { return this.on<any>(SOCKET_EVENTS.HINT_UNLOCKED); }
  onGameCompleted()      { return this.on<{ groupName: string }>(SOCKET_EVENTS.GAME_COMPLETED); }

  isConnected(): boolean { return !!this.socket?.connected; }
  disconnect(): void { this.socket?.disconnect(); }
  ngOnDestroy():  void { this.disconnect(); }
}

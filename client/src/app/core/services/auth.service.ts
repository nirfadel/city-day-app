// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { SocketService } from './socket.service';

export interface CurrentUser {
  _id: string;
  nickname: string;
  role: 'admin' | 'player';
  groupId?: string;
  groupName?: string;
  groupColor?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user$ = new BehaviorSubject<CurrentUser | null>(this.loadUser());
  user$ = this._user$.asObservable();

  get user()    { return this._user$.value; }
  get isAdmin() { return this._user$.value?.role === 'admin'; }

  constructor(private api: ApiService, private socket: SocketService) {}

  joinGame(nickname: string, groupId: string) {
    return this.api.post<{ token: string; user: CurrentUser; welcomeMessage: string | null }>(
      'auth/join', { nickname, groupId }
    ).pipe(
      tap(({ token, user }) => this.setSession(token, user))
    );
  }

  adminLogin(password: string) {
    return this.api.post<{ token: string; user: CurrentUser }>('auth/admin-login', { password })
      .pipe(tap(({ token, user }) => this.setSession(token, user)));
  }

  private setSession(token: string, user: CurrentUser) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    this._user$.next(user);

    // Connect socket
    this.socket.connect();
    if (user.role === 'admin') this.socket.joinAsAdmin();
    else this.socket.joinAsPlayer(user.groupId!, user.nickname, user.groupName, user.groupColor);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this._user$.next(null);
    this.socket.disconnect();
  }

  private loadUser(): CurrentUser | null {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
}

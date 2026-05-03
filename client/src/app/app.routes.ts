import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/join', pathMatch: 'full' },

  // Public
  {
    path: 'join',
    loadComponent: () => import('./features/player/join/join.component').then(m => m.JoinComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'admin/login',
    loadComponent: () => import('./features/admin/login/admin-login.component').then(m => m.AdminLoginComponent),
    canActivate: [guestGuard],
  },

  // Player area
  {
    path: 'play',
    loadComponent: () => import('./features/player/player-shell/player-shell.component').then(m => m.PlayerShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'missions', pathMatch: 'full' },
      {
        path: 'missions',
        loadComponent: () => import('./features/player/missions/missions.component').then(m => m.MissionsComponent),
      },
      {
        path: 'messages',
        loadComponent: () => import('./features/player/messages/messages.component').then(m => m.MessagesComponent),
      },
    ],
  },

  // Admin area
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin-shell/admin-shell.component').then(m => m.AdminShellComponent),
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/admin/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'groups',
        loadComponent: () => import('./features/admin/groups/groups.component').then(m => m.GroupsComponent),
      },
      {
        path: 'missions',
        loadComponent: () => import('./features/admin/missions/missions.component').then(m => m.AdminMissionsComponent),
      },
      {
        path: 'submissions',
        loadComponent: () => import('./features/admin/submissions/submissions.component').then(m => m.SubmissionsComponent),
      },
    ],
  },

  { path: '**', redirectTo: '/join' },
];

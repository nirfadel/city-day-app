import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Requires any logged-in user
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.user) return true;
  return router.createUrlTree(['/join']);
};

// Requires admin role
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAdmin) return true;
  return router.createUrlTree(['/join']);
};

// Redirects logged-in users away from join/login pages
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.user) return true;
  return router.createUrlTree([auth.isAdmin ? '/admin' : '/play']);
};

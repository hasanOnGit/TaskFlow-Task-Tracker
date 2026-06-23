import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ApiService } from './api.service';

export const authGuard: CanActivateFn = () => {
  const api = inject(ApiService);
  const router = inject(Router);
  if (api.isLoggedIn()) return true;
  router.navigate(['/login']);
  return false;
};

export const guestGuard: CanActivateFn = () => {
  const api = inject(ApiService);
  const router = inject(Router);
  if (!api.isLoggedIn()) return true;
  router.navigate(['/dashboard']);
  return false;
};

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const api = inject(ApiService);
  const router = inject(Router);
  const token = api.token;

  const out = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(out).pipe(
    catchError((err) => {
      if (err.status === 401) {
        api.logout();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth-service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const vigente = auth.tokenVigente();
  if (vigente) {
    return true;
  }

  auth.limpiarSesion();
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};
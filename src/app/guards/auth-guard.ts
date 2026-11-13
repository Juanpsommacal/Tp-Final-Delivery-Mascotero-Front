import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/authentication/auth-service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const vigente = auth.tokenVigente();
  if (vigente) {
    return true;
  }

  auth.limpiarSesion();
  const queryParams = state.url && state.url !== '/' ? { returnUrl: state.url } : undefined;
  return router.createUrlTree(['/login'], queryParams ? { queryParams } : undefined);
};
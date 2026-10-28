import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth-service';

export const adminGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService)
  const router = inject(Router)

  if (!auth.tokenVigente()) {
    auth.limpiarSesion()
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url }
    })
  }
  
  return auth.tieneRol('ADMIN') ? true : router.createUrlTree(['/']);
};

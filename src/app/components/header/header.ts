import { Component, HostListener, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../services/authentication/auth-service';

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-header',
  styleUrl: './header.css',
  templateUrl: './header.html',
})
export class Header {
  protected auth = inject(AuthService)

  // Solo se usa en pantallas chicas, donde el menú se esconde detrás de un botón
  menuAbierto = signal(false)

  constructor() {
    // Al elegir una sección el menú se cierra solo
    inject(Router).events
      .pipe(filter(evento => evento instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.menuAbierto.set(false))
  }

  @HostListener('document:keydown.escape')
  cerrarMenu() {
    this.menuAbierto.set(false)
  }
}

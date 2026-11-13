import { Component, HostListener, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../services/authentication/auth-service';
import { SidebarService } from '../../services/sidebar/sidebar-service';

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-header',
  styleUrl: './header.css',
  templateUrl: './header.html',
})
export class Header {
  protected auth = inject(AuthService);
  protected sidebar = inject(SidebarService);

  // Menú abierto en mobile (off-canvas drawer)
  menuAbierto = signal(false);

  // Expone la señal colapsado del servicio
  colapsado = this.sidebar.colapsado;

  constructor() {
    // Al navegar en mobile, el menú se cierra automáticamente
    inject(Router).events
      .pipe(filter((evento) => evento instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.menuAbierto.set(false));
  }

  toggleColapsar(): void {
    this.sidebar.toggle();
  }

  @HostListener('document:keydown.escape')
  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }
}

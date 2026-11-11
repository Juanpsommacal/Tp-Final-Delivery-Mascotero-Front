import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Footer } from './components/footer/footer';
import { Header } from './components/header/header';
import { ModalConfirmacion } from './components/modal-confirmacion/modal-confirmacion';
import { ModalAlerta } from './components/modal-alerta/modal-alerta';
import { AuthService } from './services/authentication/auth-service';
import { SidebarService } from './services/sidebar/sidebar-service';

@Component({
  imports: [RouterOutlet, Header, Footer, ModalConfirmacion, ModalAlerta],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly sidebar = inject(SidebarService);
  protected readonly title = signal('delivery-mascotero');
}

import { Component, inject, OnInit, signal } from '@angular/core';
import { AuthService } from '../../services/authentication/auth-service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  imports: [FormsModule],
  selector: 'app-login',
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class Login implements OnInit {

  private auth = inject(AuthService)
  private router = inject(Router)
  private route = inject(ActivatedRoute)

  email = signal('')
  password = signal('')
  mensaje = signal('')
  cargando = signal(false)
  estadoGatito = signal<'normal' | 'empujando' | 'aranando'>('normal');

  ngOnInit(): void {
    if (this.auth.tokenVigente()) {
      this.router.navigate(['/']);
    }
  }

  iniciarSesion() {
    if (this.cargando() || this.estadoGatito() === 'empujando') return;

    this.mensaje.set('');
    this.cargando.set(true);

    this.auth.login({ email: this.email(), password: this.password() }).subscribe({
      next: (respuesta) => {
        this.cargando.set(false);
        // El gatito empuja el formulario hacia abajo con fuerza
        this.estadoGatito.set('empujando');

        const destino = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
        setTimeout(() => {
          this.router.navigateByUrl(destino);
        }, 800);
      },
      error: (error) => {
        console.error('Error de login:', error);
        this.cargando.set(false);

        // El gatito araña la pantalla
        this.estadoGatito.set('aranando');
        setTimeout(() => {
          if (this.estadoGatito() === 'aranando') {
            this.estadoGatito.set('normal');
          }
        }, 1300);

        if (error.status === 401) {
          this.mensaje.set('Email o contraseña incorrectos.');
        } else if (error.status === 0) {
          this.mensaje.set('Sin respuesta del servidor (backend apagado o bloqueado por CORS).');
        } else {
          this.mensaje.set(`Error ${error.status}: ${error.error?.message ?? 'error inesperado'}`);
        }
      }
    });
  }
}

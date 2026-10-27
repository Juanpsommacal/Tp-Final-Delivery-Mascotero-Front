import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../services/auth-service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  imports: [FormsModule],
  selector: 'app-login',
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class Login {

  private auth = inject(AuthService)
  private router = inject(Router)
  private route = inject(ActivatedRoute)

  email = signal('')
  password = signal('')
  mensaje = signal('')
  cargando = signal(false)

  iniciarSesion() {
    this.mensaje.set('');
    this.cargando.set(true);

    this.auth.login({ email: this.email(), password: this.password() }).subscribe({
      next: (respuesta) => {
        this.cargando.set(false);

        const destino = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/productos';
        this.router.navigateByUrl(destino).then(entro => {
        });
      },
      error: (error) => {
        console.error('Error de login:', error);

        if (error.status === 401) {
          this.mensaje.set('Email o contraseña incorrectos.');
        } else if (error.status === 0) {
          this.mensaje.set('Sin respuesta del servidor (backend apagado o bloqueado por CORS).');
        } else {
          this.mensaje.set(`Error ${error.status}: ${error.error?.message ?? 'error inesperado'}`);
        }
        this.cargando.set(false);
      }
    });
  }
}

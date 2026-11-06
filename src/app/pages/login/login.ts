import { Component, inject, OnInit, signal } from '@angular/core';
import { AuthService } from '../../services/authentication/auth-service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

// paseando: va y viene por arriba de la tarjeta
// saliendo: login correcto, arranca y se va de la pantalla
// frenando: login incorrecto, frena de golpe y se le bajan los anteojos
type EstadoGatito = 'paseando' | 'saliendo' | 'frenando'

@Component({
  imports: [FormsModule, RouterLink],
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
  estadoGatito = signal<EstadoGatito>('paseando');

  private temporizadorFreno: ReturnType<typeof setTimeout> | null = null

  ngOnInit(): void {
    if (this.auth.tokenVigente()) {
      this.router.navigate(['/']);
    }
  }

  iniciarSesion() {
    if (this.cargando() || this.estadoGatito() === 'saliendo') return;

    this.mensaje.set('');

    // Sin esto, un envío vacío terminaba en "el email o la contraseña no coinciden"
    const faltan = [!this.email().trim() && 'el email', !this.password() && 'la contraseña'].filter(Boolean);
    if (faltan.length) {
      this.mensaje.set(`Completá ${faltan.join(' y ')} para ingresar.`);
      return;
    }

    this.cargando.set(true);

    this.auth.login({ email: this.email(), password: this.password() }).subscribe({
      next: () => {
        this.cargando.set(false);
        this.estadoGatito.set('saliendo');

        const destino = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
        setTimeout(() => {
          this.router.navigateByUrl(destino);
        }, 750);
      },
      error: (error) => {
        this.cargando.set(false);

        // Si ya estaba frenado, se reinicia la animación
        if (this.temporizadorFreno) clearTimeout(this.temporizadorFreno)
        this.estadoGatito.set('paseando')
        requestAnimationFrame(() => this.estadoGatito.set('frenando'))
        this.temporizadorFreno = setTimeout(() => {
          if (this.estadoGatito() === 'frenando') this.estadoGatito.set('paseando');
        }, 2600);

        if (error.status === 401) {
          this.mensaje.set('El email o la contraseña no coinciden. Revisalos y volvé a intentar.');
        } else if (error.status === 0) {
          this.mensaje.set('No se pudo conectar con el servidor. Revisá que esté prendido y volvé a intentar.');
        } else {
          this.mensaje.set(error.error?.message ?? 'No se pudo iniciar sesión. Volvé a intentar en un momento.');
        }
      }
    });
  }
}

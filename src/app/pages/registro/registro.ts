import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { AuthService } from '../../services/Authentication/auth-service';
import { AlertaService } from '../../services/Alerta/alerta-service';
import { noVacio } from '../../validators/producto-validators';
import { clavesIguales, SOLO_LETRAS } from '../../validators/usuario-validators';
import { extraerMensajeError } from '../../utils/error-util';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-registro',
  styleUrl: './registro.css',
  templateUrl: './registro.html',
})
export class Registro {

  private fb = inject(FormBuilder)
  private auth = inject(AuthService)
  private alertaService = inject(AlertaService)
  private router = inject(Router)

  guardando = signal(false)
  mensaje = signal('')

  // Mismas validaciones que UsuarioCreateRequestDTO del back
  formulario = this.fb.group({
    nombre: ['', [Validators.required, noVacio(), Validators.pattern(SOLO_LETRAS), Validators.maxLength(30)]],
    apellido: ['', [Validators.required, noVacio(), Validators.pattern(SOLO_LETRAS), Validators.maxLength(30)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(40)]],
    password: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(8)]],
    repetirPassword: ['', [Validators.required]],
  }, { validators: clavesIguales() })

  private mensajes: Record<string, Record<string, string>> = {
    'nombre': {
      required: 'El nombre no puede estar vacio',
      noVacio: 'El nombre no puede estar vacio',
      pattern: 'El nombre solo puede contener letras',
      maxlength: 'El nombre no puede exceder los 30 caracteres'
    },
    'apellido': {
      required: 'El apellido no puede estar vacio',
      noVacio: 'El apellido no puede estar vacio',
      pattern: 'El apellido solo puede contener letras',
      maxlength: 'El apellido no puede exceder los 30 caracteres'
    },
    'email': {
      required: 'El email no puede estar vacio',
      email: 'El email no es valido',
      maxlength: 'El mail no puede exceder los 40 caracteres'
    },
    'password': {
      required: 'La contraseña no puede estar vacia',
      minlength: 'La contraseña debe contener entre 3 y 8 caracteres',
      maxlength: 'La contraseña debe contener entre 3 y 8 caracteres'
    },
    'repetirPassword': { required: 'Repeti la contraseña' },
  }

  mensajeError(campo: string): string | null {
    const control = this.formulario.get(campo)
    if (!control?.touched || !control.errors) return null

    const error = Object.keys(control.errors)[0]
    return this.mensajes[campo]?.[error] ?? 'Valor invalido'
  }

  errorClaves(): boolean {
    return !!this.formulario.errors?.['clavesDistintas'] && this.formulario.controls.repetirPassword.touched
  }

  crearCuenta() {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched()
      return
    }

    this.guardando.set(true)
    this.mensaje.set('')

    const { nombre, apellido, email, password } = this.formulario.getRawValue()
    const datos = {
      nombre: nombre!.trim(),
      apellido: apellido!.trim(),
      email: email!.trim(),
      password: password!
    }

    // El register no devuelve token, asi que se inicia sesion con los mismos datos
    this.auth.register(datos).pipe(
      switchMap(() => this.auth.login({ email: datos.email, password: datos.password }))
    ).subscribe({
      next: async () => {
        await this.alertaService.exito('Cuenta creada correctamente')
        this.router.navigate(['/productos'])
      },
      error: (error) => {
        this.mensaje.set(extraerMensajeError(error))
        this.guardando.set(false)
      }
    })
  }
}

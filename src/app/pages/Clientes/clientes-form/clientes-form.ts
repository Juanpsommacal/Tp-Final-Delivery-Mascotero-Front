import { Component, Inject, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClientesService } from '../../../services/Clientes/clientes-service';
import { AlertaService } from '../../../services/Alerta/alerta-service';
import { noVacio } from '../../../validators/producto-validators';
import { SOLO_LETRAS } from '../../../validators/usuario-validators';
import { form, maxLength, pattern, required } from '@angular/forms/signals';
import { extraerMensajeError } from '../../../utils/error-util';
import { ClienteRequest } from '../../../models/Cliente';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-clientes-form',
  styleUrl: './clientes-form.css',
  templateUrl: './clientes-form.html',
})
export class ClientesForm implements OnInit{

  private fb = inject(FormBuilder)
  private clienteService = inject(ClientesService)
  private alertaService = inject(AlertaService)
  private router = inject(Router)
  private route = inject(ActivatedRoute)

  idCliente = signal<string | null>(null)
  modoEdicion = signal(false)
  guardando = signal(false)
  mensaje = signal('')

  formulario = this.fb.group({
    nombre: ['', [Validators.required, noVacio(), Validators.pattern(SOLO_LETRAS), Validators.maxLength(30)]],
    apellido: ['', [Validators.required, noVacio(), Validators.pattern(SOLO_LETRAS), Validators.maxLength(30)]],
    telefono: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{7,15}$/)]],
  })

  private mensajes: Record<string, Record<string, string>> = {
    'nombre': {
      required: 'El nombre del cliente es obligatorio',
      noVacio: 'El nombre del cliente no puede estar vacio',
      pattern: 'El nombre solo puede contener letras y espacios',
      maxlength: 'El nombre no puede superar los 30 caracteres'
    },
    'apellido': {
      required: 'El apellido del cliente es obligatorio',
      noVacio: 'El apellido del cliente no puede estar vacio',
      pattern: 'El apellido solo puede contener letras y espacios',
      maxlength: 'El apellido no puede superar los 30 caracteres'
    },
    'telefono': {
      required: 'El campo de telefono es obligatorio',
      pattern: 'Debe contener entre 7 y 15 numeros, con "+" opcional al inicio'
    }
  }


  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')

    if(!id) {
      return
    }

    this.idCliente.set(id)
    this.modoEdicion.set(true)

    this.clienteService.getClienteById(id).subscribe({
      next: (cliente) => this.formulario.patchValue(cliente),
      error: async (error) => {
        await this.alertaService.error(extraerMensajeError(error))
        this.router.navigate(['/clientes'])
      }
    })
  }

  mensajeError(campo: string): string | null {
    const control = this.formulario.get(campo)
    if (!control?.touched || !control.errors) return null

    const error = Object.keys(control.errors)[0]
    return this.mensajes[campo]?.[error] ?? 'Valor invalido'
  }

  onSubmit() {

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched()
      return
    }

    this.guardando.set(true)
    this.mensaje.set('')

    const { nombre, apellido, telefono } = this.formulario.value
    const cliente: ClienteRequest = {
      nombre: nombre!.trim(),
      apellido: apellido!.trim(),
      telefono: telefono!.trim()
    }

    const id = this.idCliente()
    console.log(`ID: ${this.idCliente}`)
    const peticion = id 
      ? this.clienteService.updateCliente(id, cliente)
      : this.clienteService.createCliente(cliente)

    peticion.subscribe({
      next: async (guardado) => {
        await this.alertaService.exito(id ? 'Cliente actualizado correctamente' : 'Cliente creado correctamente')
        this.router.navigate(['/clientes', guardado.id])
      },
      error: (error) => {
        this.mensaje.set(extraerMensajeError(error))
        this.guardando.set(false)
      }
    })
  }

  volver() {
    const id = this.idCliente()
    this.router.navigate(id ? ['/clientes', id] :['/clientes'])
  }

}

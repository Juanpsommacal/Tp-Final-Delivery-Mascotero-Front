import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClientesService } from '../../../services/Clientes/clientes-service';
import Cliente from '../../../models/Cliente';
import { digitos, noVacio } from '../../../validators/producto-validators';
import { maxLength, required } from '@angular/forms/signals';
import { extraerMensajeError } from '../../../utils/error-util';
import Direccion, { DireccionRequest } from '../../../models/Direccion';
import { DireccionesService } from '../../../services/Direcciones/direcciones-service';

const MAX_SUGERENCIAS = 8

@Component({
  imports: [RouterLink, ReactiveFormsModule],
  selector: 'app-cliente-details',
  styleUrl: './cliente-details.css',
  templateUrl: './cliente-details.html',
})
export class ClienteDetails implements OnInit{

  private clientesService = inject(ClientesService)
  private direccionesService = inject(DireccionesService)
  private route = inject(ActivatedRoute)
  private router = inject(Router)
  private fb = inject(FormBuilder)

  cliente = signal<Cliente | null>(null)
  agregando = signal(false)
  mensajeDireccion = signal('')

  // Autocompletado de calle: direcciones ya cargadas en la BDD (de cualquier cliente)
  todasLasDirecciones = signal<Direccion[]>([])
  direccionSeleccionada = signal<Direccion | null>(null)
  mostrarSugerencias = signal(false)
  indiceActivo = signal(-1)

  formularioDireccion = this.fb.group({
    calle: ['', [Validators.required, noVacio(), Validators.maxLength(30)]],
    numero: [null as number | null, [Validators.required, Validators.min(0), digitos(5, 0)]],
    piso: [null as number | null, [Validators.min(0), digitos(2, 0)]],
    departamento: ['', [Validators.maxLength(10)]],
    observaciones: ['', [Validators.maxLength(50)]],
  })

  private textoCalle = toSignal(this.formularioDireccion.controls.calle.valueChanges, { initialValue: '' })

  sugerencias = computed(() => {
    const texto = this.normalizar(this.textoCalle() ?? '')
    if (texto.length < 2) return []

    const yaAsociadas = new Set(this.cliente()?.direcciones.map(d => d.id) ?? [])

    return this.todasLasDirecciones()
      .filter(d => !yaAsociadas.has(d.id) && this.normalizar(d.direccionCompleta).includes(texto))
      .slice(0, MAX_SUGERENCIAS)
  })

  private mensajes: Record<string, Record<string, string>> = {
    'calle': {
      required: 'El campo calle es obligatorio',
      noVacio: 'La calle no puede estar vacia',
      maxlength: 'La calle no puede superar los 30 caracteres'
    }, 
    'numero': {
      required: 'El numero de la calle es obligatorio',
      min: 'El numero no puede ser nagativo',
      digitos: 'Tiene que ser un entero de hasta 5 digitos'
    },
    'piso': {
      min: 'El numero del piso no puede ser negativo',
      digitos: 'El numero del piso tiene que ser un numero entero de hasta 2 digitos'
    },
    'departamento': { maxlength: 'El departamento no puede superar los 10 caracteres' },
    'observaciones': { maxlength: 'Las observaciones no pueden superar los 50 caracteres' },
  }

  ngOnInit(): void {
    const id = this.route.snapshot.params['id']

    if(!id) {
      this.router.navigate(['/clientes'])
      return
    }

    this.clientesService.getClienteById(id).subscribe({
      next: (data) => this.cliente.set(data),
      error: (error) => {
        alert(`Error: ${extraerMensajeError(error)}`)
        this.router.navigate(['/clientes'])
      }
    })

    this.cargarDirecciones()
  }

  private cargarDirecciones() {
    // Si falla, el formulario sigue funcionando para cargar direcciones nuevas
    this.direccionesService.getAll().subscribe({
      next: (data) => this.todasLasDirecciones.set(data),
      error: () => this.todasLasDirecciones.set([])
    })
  }

  // Minusculas y sin tildes, para que "calabria" encuentre "Calabría"
  private normalizar(valor: string): string {
    return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  }

  abrirSugerencias() {
    this.mostrarSugerencias.set(true)
    this.indiceActivo.set(-1)
  }

  cerrarSugerencias() {
    this.mostrarSugerencias.set(false)
    this.indiceActivo.set(-1)
  }

  navegarSugerencias(evento: KeyboardEvent) {
    const cantidad = this.sugerencias().length
    if (!this.mostrarSugerencias() || cantidad === 0) return

    if (evento.key === 'ArrowDown') {
      evento.preventDefault()
      this.indiceActivo.update(i => (i + 1) % cantidad)
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault()
      this.indiceActivo.update(i => (i <= 0 ? cantidad - 1 : i - 1))
    } else if (evento.key === 'Enter' && this.indiceActivo() >= 0) {
      evento.preventDefault()
      this.seleccionarDireccion(this.sugerencias()[this.indiceActivo()])
    } else if (evento.key === 'Escape') {
      this.cerrarSugerencias()
    }
  }

  seleccionarDireccion(direccion: Direccion) {
    this.direccionSeleccionada.set(direccion)
    this.cerrarSugerencias()
    this.mensajeDireccion.set('')
  }

  cancelarSeleccion() {
    this.direccionSeleccionada.set(null)
    this.mensajeDireccion.set('')
  }

  mensajeError(campo: string): string | null {
    const control = this.formularioDireccion.get(campo)
    if (!control?.touched || !control.errors) return null

    const error = Object.keys(control.errors)[0]
    return this.mensajes[campo]?.[error] ?? 'Valor invalido'
  }

  agregarDireccion() {
    const cliente = this.cliente()
    if (!cliente) return

    const existente = this.direccionSeleccionada()
    if (existente) {
      this.asociarExistente(cliente, existente)
      return
    }

    if (this.formularioDireccion.invalid) {
      this.formularioDireccion.markAllAsTouched()
      return
    }

    this.agregando.set(true)
    this.mensajeDireccion.set('')

    const valores = this.formularioDireccion.getRawValue()
    const direccion: DireccionRequest = {
      calle: valores.calle!.trim(),
      numero: valores.numero!,
      piso: valores.piso ?? null,
      departamento: valores.departamento?.trim() || null,
      observaciones: valores.observaciones?.trim() || null,
    }

    this.clientesService.addDireccion(cliente.id!, direccion).subscribe({
      next: (actualizado) => {
        this.cliente.set(actualizado)
        this.formularioDireccion.reset()
        this.agregando.set(false)
        this.cargarDirecciones()
      },
      error: (error) => {
        this.mensajeDireccion.set(extraerMensajeError(error))
        this.agregando.set(false)
      }
    })
  }

  private asociarExistente(cliente: Cliente, direccion: Direccion) {
    this.agregando.set(true)
    this.mensajeDireccion.set('')

    this.clientesService.asociarDireccionExistente(cliente.id!, direccion.id!).subscribe({
      next: (actualizado) => {
        this.cliente.set(actualizado)
        this.direccionSeleccionada.set(null)
        this.formularioDireccion.reset()
        this.agregando.set(false)
      },
      error: (error) => {
        this.mensajeDireccion.set(extraerMensajeError(error))
        this.agregando.set(false)
      }
    })
  }

  eliminarDireccion(direccion: Direccion) {
    const cliente = this.cliente()
    if (!cliente) return

    if (!confirm(`¿Desea eliminar la direccion "${direccion.direccionCompleta}"?`)) return

    this.clientesService.removeDireccion(cliente.id!, direccion.id!).subscribe({
      next: (actualizado) => this.cliente.set(actualizado),
      error: (error) => alert(`Error: ${extraerMensajeError(error)}`)
    })
  }

}

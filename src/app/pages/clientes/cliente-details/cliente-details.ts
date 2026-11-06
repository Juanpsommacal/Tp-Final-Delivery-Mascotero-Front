import { Icono } from '../../../components/icono/icono';
import { PesosPipe } from '../../../pipes/pesos-pipe';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import Cliente from '../../../models/Cliente';
import { digitos, noVacio } from '../../../validators/producto-validators';
import { extraerMensajeError } from '../../../utils/error-util';
import Direccion, { DireccionRequest } from '../../../models/Direccion';
import { DireccionesService } from '../../../services/direcciones/direcciones-service';
import { ConfirmacionService } from '../../../services/confirmacion/confirmacion-service';
import { AlertaService } from '../../../services/alerta/alerta-service';
import { PedidosService } from '../../../services/pedidos/pedidos-service';
import { PagosService } from '../../../services/pagos/pagos-service';
import Pedido from '../../../models/Pedido';
import Pago from '../../../models/Pago';
import { ClientesService } from '../../../services/clientes/clientes-service';
import { DatePipe } from '@angular/common';
import { FormatoEnumPipe } from '../../../pipes/formato-enum-pipe';
import { AuthService } from '../../../services/authentication/auth-service';

const MAX_SUGERENCIAS = 8

// Saldo de un pedido redondeado a centavos
function saldoDe(pedido: Pedido): number {
  const pagado = pedido.pagos.reduce((suma, pago) => suma + pago.monto, 0)
  return Math.round((pedido.montoTotal - pagado) * 100) / 100
}

@Component({
  imports: [RouterLink, ReactiveFormsModule, DatePipe, FormatoEnumPipe, PesosPipe, Icono],
  selector: 'app-cliente-details',
  styleUrl: './cliente-details.css',
  templateUrl: './cliente-details.html',
})
export class ClienteDetails implements OnInit{

  private clientesService = inject(ClientesService)
  private direccionesService = inject(DireccionesService)
  private confirmacionService = inject(ConfirmacionService)
  private alertaService = inject(AlertaService)
  private auth = inject(AuthService)
  private route = inject(ActivatedRoute)
  private router = inject(Router)
  private fb = inject(FormBuilder)

  private pedidosService = inject(PedidosService)
  private pagosService = inject(PagosService)

  cliente = signal<Cliente | null>(null)
  agregando = signal(false)
  mensajeDireccion = signal('')
  esAdmin = this.auth.tieneRol('ADMIN')
  eliminado = signal(false)

  // Cuenta del cliente: pedidos que debe (entregados y no pagados del todo) y pagos que hizo
  pedidosConDeuda = signal<Pedido[]>([])
  // Último pedido no cancelado, para "Repetir último pedido"
  ultimoPedido = signal<Pedido | null>(null)
  pagos = signal<Pago[]>([])

  deudaTotal = computed(() =>
    Math.round(this.pedidosConDeuda().reduce((suma, pedido) => suma + this.saldo(pedido), 0) * 100) / 100
  )

  saldo(pedido: Pedido): number {
    return saldoDe(pedido)
  }

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
  private valoresDireccion = toSignal(this.formularioDireccion.valueChanges, { initialValue: this.formularioDireccion.value })

  // Direccion de la BDD con los mismos datos que se estan escribiendo a mano (mismo criterio que el back).
  // Si se ignora la sugerencia y se carga igual, el back reutiliza esta en vez de crear otra
  coincidencia = computed(() => {
    const valores = this.valoresDireccion()
    const calle = this.normalizar(valores.calle ?? '')
    if (!calle || valores.numero == null) return null

    const piso = valores.piso ?? null
    const departamento = this.normalizar(valores.departamento ?? '')

    return this.todasLasDirecciones().find(d =>
      this.normalizar(d.calle) === calle
      && d.numero === valores.numero
      && (d.piso ?? null) === piso
      && this.normalizar(d.departamento ?? '') === departamento
    ) ?? null
  })

  coincidenciaYaAsociada = computed(() => {
    const coincidencia = this.coincidencia()
    return !!coincidencia && !!this.cliente()?.direcciones.some(d => d.id === coincidencia.id)
  })

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
      noVacio: 'La calle no puede estar vacía',
      maxlength: 'La calle no puede superar los 30 caracteres'
    }, 
    'numero': {
      required: 'El número de la calle es obligatorio',
      min: 'El número no puede ser negativo',
      digitos: 'Tiene que ser un entero de hasta 5 dígitos'
    },
    'piso': {
      min: 'El número del piso no puede ser negativo',
      digitos: 'El número del piso tiene que ser un número entero de hasta 2 dígitos'
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
      error: async (error) => {
        await this.alertaService.error(extraerMensajeError(error))
        this.router.navigate(['/clientes'])
      }
    })

    this.cargarDirecciones()
    this.cargarCuenta(id)
  }

  // Si falla, el resto de la ficha se sigue viendo: la cuenta es informativa
  private cargarCuenta(clienteId: string) {
    this.pedidosService.getAllPedidos().subscribe({
      next: (pedidos) => {
        const delCliente = pedidos.filter(p => String(p.clienteId) === String(clienteId))
        this.pedidosConDeuda.set(
          delCliente.filter(p => p.estadoPago === 'DEUDA' || p.estadoPago === 'DEUDA_PARCIAL')
        )
        this.ultimoPedido.set(
          delCliente
            .filter(p => p.estadoPedido !== 'CANCELADO')
            .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)[0] ?? null
        )
      },
      error: () => this.pedidosConDeuda.set([])
    })

    this.pagosService.getPagosByCliente(clienteId).subscribe({
      // Los mas nuevos primero
      next: (pagos) => this.pagos.set([...pagos].sort((a, b) => b.id - a.id)),
      error: () => this.pagos.set([])
    })
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
    return this.mensajes[campo]?.[error] ?? 'Valor inválido'
  }

  agregarDireccion() {
    const cliente = this.cliente()
    if (!cliente) return

    const existente = this.direccionSeleccionada()
    if (existente) {
      this.asociarExistente(cliente, existente)
      return
    }

    // Ya esta asociada: el aviso se ve en pantalla y no se manda nada al back
    if (this.coincidenciaYaAsociada()) return

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


    async eliminarCliente() {
    const cliente = this.cliente()
    if (!cliente) return

    const confirmado = await this.confirmacionService.confirmar({
      titulo: 'Eliminar cliente',
      mensaje: `¿Seguro que querés eliminar a "${cliente.nombre} ${cliente.apellido}"?`,
      textoConfirmar: 'Eliminar cliente',
      textoCancelar: 'Volver',
      tipo: 'peligro'
    })

    if (!confirmado) return

    this.eliminado.set(true)
    this.clientesService.deleteCliente(cliente.id!).subscribe({
      next: () => {
        this.alertaService.exito(`${cliente.nombre} ${cliente.apellido} se eliminó.`, 'Cliente eliminado')
        this.router.navigate(['/clientes'])
      },
      error: (error) => {
        this.alertaService.error(extraerMensajeError(error), 'No se pudo eliminar el cliente')
        this.eliminado.set(false)
      }
    })
  }


  // ----------------------------- DIRECCIONES DEL CLIENTE --------------------------------- \\

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

  async eliminarDireccion(direccion: Direccion) {
    const cliente = this.cliente()
    if (!cliente) return

    const confirmado = await this.confirmacionService.confirmar({
      titulo: 'Eliminar dirección',
      mensaje: `¿Querés eliminar la dirección "${direccion.direccionCompleta}"?`,
      textoConfirmar: 'Eliminar',
      tipo: 'peligro'
    })
    if (!confirmado) return

    this.clientesService.removeDireccion(cliente.id!, direccion.id!).subscribe({
      next: (actualizado) => this.cliente.set(actualizado),
      error: (error) => this.alertaService.error(extraerMensajeError(error))
    })
  }

  // El boton se bloquea mientras se envia, o si la direccion escrita ya esta asociada al cliente
  agregarDeshabilitado = computed(() =>
    this.agregando() || (!this.direccionSeleccionada() && this.coincidenciaYaAsociada())
  )

}

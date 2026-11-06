import { OrdenMobile, OpcionOrden } from '../../../components/orden-mobile/orden-mobile';
import { PesosPipe } from '../../../pipes/pesos-pipe';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import Cliente from '../../../models/Cliente';
import Pedido from '../../../models/Pedido';
import { ClientesService } from '../../../services/clientes/clientes-service';
import { PedidosService } from '../../../services/pedidos/pedidos-service';
import { AlertaService } from '../../../services/alerta/alerta-service';
import { extraerMensajeError } from '../../../utils/error-util';
import { coincideBusqueda } from '../../../utils/busqueda-util';
import { saldoDe, tieneDeuda } from '../../../utils/pedido-utils';
import { SkeletonLista } from '../../../components/skeleton-lista/skeleton-lista';
import { Paginacion } from '../../../components/paginacion/paginacion';
import { filtrosEnUrl, TablaOrdenable } from '../../../utils/tabla';
import { formatearTelefono, normalizarTelefono } from '../../../utils/whatsapp-util';

interface FilaCliente {
  cliente: Cliente
  pedidos: number
  deuda: number
  // Fecha (yyyy-MM-dd) e id del último pedido no cancelado; null si nunca pidió
  ultimoPedido: string | null
  ultimoPedidoId: number | null
}

@Component({
  imports: [RouterLink, DatePipe, SkeletonLista, Paginacion, PesosPipe, OrdenMobile],
  selector: 'app-clientes-list',
  styleUrl: './clientes-list.css',
  templateUrl: './clientes-list.html',
})
export class ClientesList implements OnInit {

  private clienteService = inject(ClientesService)
  private pedidosService = inject(PedidosService)
  private alertaService = inject(AlertaService)
  private router = inject(Router)

  clientes = signal<Cliente[]>([])
  // Para las columnas Pedidos y Debe. Si fallan, la tabla se ve igual sin esos datos
  private pedidos = signal<Pedido[] | null>(null)
  cargando = signal(true)
  busqueda = signal('')
  soloConDeuda = signal(false)

  conDatosDePedidos = computed(() => this.pedidos() !== null)

  filas = computed<FilaCliente[]>(() => {
    const vacio = () => ({ pedidos: 0, deuda: 0, ultimoPedido: null as string | null, ultimoPedidoId: null as number | null })
    const porCliente = new Map<string, ReturnType<typeof vacio>>()
    for (const pedido of this.pedidos() ?? []) {
      if (pedido.estadoPedido === 'CANCELADO') continue
      const datos = porCliente.get(String(pedido.clienteId)) ?? vacio()
      datos.pedidos++
      if (tieneDeuda(pedido)) datos.deuda += saldoDe(pedido)
      // El más reciente; a igual fecha, el de número más alto
      const esMasNuevo = !datos.ultimoPedido || pedido.fecha > datos.ultimoPedido ||
        (pedido.fecha === datos.ultimoPedido && pedido.id > (datos.ultimoPedidoId ?? 0))
      if (esMasNuevo) {
        datos.ultimoPedido = pedido.fecha
        datos.ultimoPedidoId = pedido.id
      }
      porCliente.set(String(pedido.clienteId), datos)
    }
    return this.clientes().map(cliente => ({
      cliente,
      ...(porCliente.get(String(cliente.id)) ?? vacio()),
    }))
  })

  filasFiltradas = computed(() => {
    const texto = this.busqueda()
    const conDeuda = this.soloConDeuda()
    return this.filas().filter(fila =>
      (!conDeuda || fila.deuda > 0) &&
      coincideBusqueda(`${fila.cliente.nombre} ${fila.cliente.apellido} ${fila.cliente.telefono}`, texto)
    )
  })

  // Opciones del select "Ordenar por" que se ve en el celular
  readonly opcionesOrden: OpcionOrden[] = [
    { valor: 'nombre-asc', etiqueta: 'Apellido (A–Z)' },
    { valor: 'ultimo-desc', etiqueta: 'Pidieron hace poco' },
    { valor: 'ultimo-asc', etiqueta: 'Hace más que no piden' },
    { valor: 'deuda-desc', etiqueta: 'Deben más' },
    { valor: 'pedidos-desc', etiqueta: 'Más pedidos' },
  ]

  tabla = new TablaOrdenable({
    filas: this.filasFiltradas,
    columnas: {
      nombre: (f: FilaCliente) => `${f.cliente.apellido} ${f.cliente.nombre}`.toLowerCase(),
      pedidos: (f: FilaCliente) => f.pedidos,
      // Los que nunca pidieron quedan al final cuando se ordena del más reciente al más viejo
      ultimo: (f: FilaCliente) => f.ultimoPedido ?? '',
      deuda: (f: FilaCliente) => f.deuda,
    },
    ordenInicial: 'nombre',
    ascendenteInicial: true,
    columnasTexto: ['nombre'],
    reiniciarPaginaCon: () => [this.busqueda(), this.soloConDeuda()],
  })

  constructor() {
    filtrosEnUrl({ q: this.busqueda, deuda: this.soloConDeuda }, this.tabla)
  }

  ngOnInit(): void {
    this.clienteService.getAllClientes().subscribe({
      next: (data) => {
        this.clientes.set(data)
        this.cargando.set(false)
      },
      error: async (error) => {
        this.cargando.set(false)
        await this.alertaService.error(extraerMensajeError(error))
        this.router.navigate(['/'])
      }
    })

    this.pedidosService.getAllPedidos().subscribe({
      next: (data) => this.pedidos.set(data),
      error: () => this.pedidos.set(null),
    })
  }

  // "Hoy", "Ayer", "Hace 5 días"... para ver de un vistazo quién hace mucho que no pide
  haceCuanto(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-').map(Number)
    const hoy = new Date()
    const dias = Math.round(
      (new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime() - new Date(anio, mes - 1, dia).getTime()) / 86_400_000
    )
    if (dias <= 0) return 'Hoy'
    if (dias === 1) return 'Ayer'
    if (dias < 30) return `Hace ${dias} días`
    const meses = Math.floor(dias / 30)
    return meses === 1 ? 'Hace 1 mes' : `Hace ${meses} meses`
  }

  // 2235550001 -> +54 9 223 555-0001; si no se puede armar, se muestra como está cargado
  telefonoVisible(telefono: string): string {
    const normalizado = normalizarTelefono(telefono)
    return normalizado ? formatearTelefono(normalizado) : telefono
  }

  abrir(cliente: Cliente) {
    this.router.navigate(['/clientes', cliente.id])
  }

  limpiarFiltros() {
    this.busqueda.set('')
    this.soloConDeuda.set(false)
  }

}

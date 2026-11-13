import { PesosPipe } from '../../../pipes/pesos-pipe';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormatoEnumPipe } from '../../../pipes/formato-enum-pipe';
import { EstadoPago, EstadoPedido, ESTADOS_PAGO, ESTADOS_PEDIDO } from '../../../models/Enums';
import Pedido, { FaltanteProducto } from '../../../models/Pedido';
import { PedidosService } from '../../../services/pedidos/pedidos-service';
import { AlertaService } from '../../../services/alerta/alerta-service';
import { saldoDe } from '../../../utils/pedido-utils';
import { SkeletonLista } from '../../../components/skeleton-lista/skeleton-lista';
import { OrdenMobile, OpcionOrden } from '../../../components/orden-mobile/orden-mobile';
import { Paginacion } from '../../../components/paginacion/paginacion';
import { SelectorPeriodo } from '../../../components/selector-periodo/selector-periodo';
import { ModalWhatsapp } from '../../../components/modal-whatsapp/modal-whatsapp';
import { Icono } from '../../../components/icono/icono';
import { filtrosEnUrl, TablaServidor } from '../../../utils/tabla';
import { haceCuanto } from '../../../utils/whatsapp-util';

// CON_DEUDA junta DEUDA y DEUDA_PARCIAL: es lo que se busca al querer cobrar
type FiltroPago = EstadoPago | 'CON_DEUDA' | ''

@Component({
  imports: [RouterLink, DatePipe, FormatoEnumPipe, SkeletonLista, OrdenMobile, Paginacion, SelectorPeriodo, ModalWhatsapp, Icono, PesosPipe],
  selector: 'app-pedidos-list',
  styleUrls: ['./pedidos-list.css', '../estados-pedido.css'],
  templateUrl: './pedidos-list.html',
})
export class PedidosList {

  private pedidosService = inject(PedidosService)
  private alertaService = inject(AlertaService)
  private router = inject(Router)

  estadosPedido = ESTADOS_PEDIDO
  // PEDIDO_CANCELADO no es un estado de pago real: el back lo pone cuando se cancela el pedido
  // DEUDA y DEUDA_PARCIAL se filtran juntas con la opción "Deuda" (CON_DEUDA)
  estadosPago = ESTADOS_PAGO.filter(estado => !['PEDIDO_CANCELADO', 'DEUDA', 'DEUDA_PARCIAL'].includes(estado))

  busqueda = signal('')
  filtroEstado = signal<EstadoPedido | ''>('')
  filtroPago = signal<FiltroPago>('')
  mostrarCancelados = signal(false)
  // Vacío = sin límite de ese lado. Arranca sin fechas para no esconder pendientes y deudas viejas
  desde = signal('')
  hasta = signal('')

  // Si se cargó "hasta" antes que "desde" se intercambian, en vez de no mostrar nada
  private rangoFechas = computed(() => {
    const d = this.desde(), h = this.hasta()
    return d && h && d > h ? { desde: h, hasta: d } : { desde: d, hasta: h }
  })

  // Accesos directos a lo que hay que resolver
  readonly etapas: { estado: EstadoPedido, titulo: string, detalle: string }[] = [
    { estado: 'FALTA_MERCADERIA', titulo: 'Falta mercadería', detalle: 'Hay que conseguirla' },
    { estado: 'A_COORDINAR', titulo: 'A coordinar', detalle: 'Falta acordar el día' },
    { estado: 'PROGRAMADO', titulo: 'Programados', detalle: 'Con día de entrega' },
  ]
  contadores = signal<Partial<Record<EstadoPedido, number>>>({})
  faltantes = signal<FaltanteProducto[]>([])

  // Pedido con el modal de WhatsApp abierto
  pedidoWhatsapp = signal<Pedido | null>(null)
  readonly haceCuanto = haceCuanto

  tabla = new TablaServidor({
    columnas: ['id', 'fecha', 'cliente', 'total', 'saldo'] as const,
    ordenInicial: 'id',
    columnasTexto: ['cliente'],
    busqueda: this.busqueda,
    filtros: () => [this.filtroEstado(), this.filtroPago(), this.mostrarCancelados(), this.rangoFechas()],
    cargar: consulta => this.pedidosService.getPagina(consulta, {
      // Busca por cliente, dirección o número (ej: "perez", "luro 1234" o "12")
      q: this.busqueda(),
      estado: this.filtroEstado(),
      filtroPago: this.filtroPago(),
      cancelados: this.mostrarCancelados(),
      ...this.rangoFechas(),
    }),
    alError: async (_, primeraCarga) => {
      await this.alertaService.error('No se pudieron cargar los pedidos')
      if (primeraCarga) this.router.navigate(['/'])
    },
  })

  // Suma de lo que falta cobrar en lo que se está viendo, de todas las páginas
  saldoFiltrado = computed(() => this.tabla.respuesta()?.saldoFiltrado ?? 0)

  hayFiltros = computed(() => !!(this.busqueda() || this.filtroEstado() || this.filtroPago() || this.mostrarCancelados() || this.desde() || this.hasta()))

  constructor() {
    // Si fallan, el listado se ve igual sin los números
    this.pedidosService.getContadores().subscribe({ next: (data) => this.contadores.set(data), error: () => {} })

    effect(() => {
      if (this.filtroEstado() !== 'FALTA_MERCADERIA') {
        this.faltantes.set([])
        return
      }
      this.pedidosService.getFaltantes().subscribe({ next: (data) => this.faltantes.set(data), error: () => this.faltantes.set([]) })
    })

    // Los filtros viven en la URL: sobreviven a entrar a un pedido y volver
    filtrosEnUrl({
      q: this.busqueda,
      estado: this.filtroEstado,
      pago: this.filtroPago,
      cancelados: this.mostrarCancelados,
      desde: this.desde,
      hasta: this.hasta,
    }, this.tabla)
  }

  // Reemplaza el pedido en la lista para que se vea la fecha del recordatorio
  alRegistrarRecordatorio(actualizado: Pedido) {
    this.tabla.actualizarFilas(p => p.id === actualizado.id ? actualizado : p)
  }

  saldo(pedido: Pedido): number {
    return pedido.estadoPedido === 'CANCELADO' ? 0 : saldoDe(pedido)
  }

  // Select "Ordenar por" del celular
  readonly opcionesOrden: OpcionOrden[] = [
    { valor: 'id-desc', etiqueta: 'Más nuevos primero' },
    { valor: 'id-asc', etiqueta: 'Más viejos primero' },
    { valor: 'saldo-desc', etiqueta: 'Mayor saldo' },
    { valor: 'total-desc', etiqueta: 'Mayor total' },
    { valor: 'cliente-asc', etiqueta: 'Cliente (A–Z)' },
  ]

  // En el celular los filtros (salvo el buscador) se esconden detrás de un botón
  filtrosAbiertos = signal(false)
  cantidadFiltros = computed(() =>
    [this.filtroEstado(), this.filtroPago(), this.mostrarCancelados(), this.desde() || this.hasta()].filter(Boolean).length
  )

  alternarEtapa(estado: EstadoPedido) {
    this.filtroEstado.update(actual => actual === estado ? '' : estado)
  }

  cambiarFiltroEstado(valor: string) {
    this.filtroEstado.set(valor as EstadoPedido | '')
  }

  cambiarFiltroPago(valor: string) {
    this.filtroPago.set(valor as FiltroPago)
  }

  limpiarFiltros() {
    this.busqueda.set('')
    this.filtroEstado.set('')
    this.filtroPago.set('')
    this.mostrarCancelados.set(false)
    this.desde.set('')
    this.hasta.set('')
  }

  abrir(pedido: Pedido) {
    this.router.navigate(['/pedidos', pedido.id])
  }

}

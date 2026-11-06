import { PesosPipe } from '../../../pipes/pesos-pipe';
import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormatoEnumPipe } from '../../../pipes/formato-enum-pipe';
import { EstadoPago, EstadoPedido, ESTADOS_PAGO, ESTADOS_PEDIDO } from '../../../models/Enums';
import Pedido from '../../../models/Pedido';
import { PedidosService } from '../../../services/pedidos/pedidos-service';
import { AlertaService } from '../../../services/alerta/alerta-service';
import { coincideBusqueda } from '../../../utils/busqueda-util';
import { saldoDe, tieneDeuda } from '../../../utils/pedido-utils';
import { SkeletonLista } from '../../../components/skeleton-lista/skeleton-lista';
import { OrdenMobile, OpcionOrden } from '../../../components/orden-mobile/orden-mobile';
import { ClientesService } from '../../../services/clientes/clientes-service';
import { ModalWhatsapp } from '../../../components/modal-whatsapp/modal-whatsapp';
import { Icono } from '../../../components/icono/icono';
import { haceCuanto } from '../../../utils/whatsapp-util';

type ColumnaOrden = 'id' | 'fecha' | 'cliente' | 'total' | 'saldo'
// CON_DEUDA junta DEUDA y DEUDA_PARCIAL: es lo que se busca al querer cobrar
type FiltroPago = EstadoPago | 'CON_DEUDA' | ''

@Component({
  imports: [RouterLink, DatePipe, FormatoEnumPipe, SkeletonLista, OrdenMobile, ModalWhatsapp, Icono, PesosPipe],
  selector: 'app-pedidos-list',
  styleUrls: ['./pedidos-list.css', '../estados-pedido.css'],
  templateUrl: './pedidos-list.html',
})
export class PedidosList implements OnInit {

  private pedidosService = inject(PedidosService)
  private alertaService = inject(AlertaService)
  private clientesService = inject(ClientesService)
  private router = inject(Router)
  private route = inject(ActivatedRoute)

  readonly porPagina = 20

  estadosPedido = ESTADOS_PEDIDO
  // PEDIDO_CANCELADO no es un estado de pago real: el back lo pone cuando se cancela el pedido
  // DEUDA y DEUDA_PARCIAL se filtran juntas con la opción "Deuda" (CON_DEUDA)
  estadosPago = ESTADOS_PAGO.filter(estado => !['PEDIDO_CANCELADO', 'DEUDA', 'DEUDA_PARCIAL'].includes(estado))

  pedidos = signal<Pedido[]>([])
  cargando = signal(true)
  busqueda = signal('')
  filtroEstado = signal<EstadoPedido | ''>('')
  filtroPago = signal<FiltroPago>('')
  mostrarCancelados = signal(false)
  orden = signal<ColumnaOrden>('id')
  ascendente = signal(false)
  pagina = signal(1)

  // clienteId -> teléfono, para el botón de WhatsApp. null mientras carga
  telefonos = signal<Map<string, string> | null>(null)
  // Pedido con el modal de WhatsApp abierto (siempre con la plantilla de saldo)
  pedidoWhatsapp = signal<Pedido | null>(null)
  readonly haceCuanto = haceCuanto

  // Busca por cliente, direccion o numero (ej: "perez", "luro 1234" o "12")
  pedidosFiltrados = computed(() => {
    const texto = this.busqueda()
    const estado = this.filtroEstado()
    const pago = this.filtroPago()
    // Los cancelados se ocultan salvo que se prenda el switch o se filtre justo por "Cancelado"
    const verCancelados = this.mostrarCancelados() || estado === 'CANCELADO'

    return this.pedidos().filter(pedido =>
      (verCancelados || pedido.estadoPedido !== 'CANCELADO') &&
      (!estado || pedido.estadoPedido === estado) &&
      (!pago || (pago === 'CON_DEUDA' ? tieneDeuda(pedido) : pedido.estadoPago === pago)) &&
      coincideBusqueda(`${pedido.nombreCliente} ${pedido.direccionCompleta} ${pedido.id}`, texto)
    )
  })

  pedidosOrdenados = computed(() => {
    const columna = this.orden()
    const signo = this.ascendente() ? 1 : -1
    const valor = (p: Pedido): number | string => {
      switch (columna) {
        case 'fecha': return p.fecha
        case 'cliente': return p.nombreCliente.toLowerCase()
        case 'total': return p.montoTotal
        case 'saldo': return this.saldo(p)
        default: return p.id
      }
    }
    // A igual valor, el mas nuevo arriba
    return [...this.pedidosFiltrados()].sort((a, b) => {
      const va = valor(a), vb = valor(b)
      if (va < vb) return -1 * signo
      if (va > vb) return 1 * signo
      return b.id - a.id
    })
  })

  totalPaginas = computed(() => Math.max(1, Math.ceil(this.pedidosFiltrados().length / this.porPagina)))

  pedidosPagina = computed(() => {
    const inicio = (this.pagina() - 1) * this.porPagina
    return this.pedidosOrdenados().slice(inicio, inicio + this.porPagina)
  })

  rango = computed(() => {
    const total = this.pedidosFiltrados().length
    if (total === 0) return { desde: 0, hasta: 0, total }
    const desde = (this.pagina() - 1) * this.porPagina + 1
    return { desde, hasta: Math.min(desde + this.porPagina - 1, total), total }
  })

  // Suma de lo que falta cobrar en lo que se está viendo
  saldoFiltrado = computed(() =>
    this.pedidosFiltrados()
      .filter(p => p.estadoPedido !== 'CANCELADO')
      .reduce((suma, p) => suma + Math.max(0, this.saldo(p)), 0)
  )

  constructor() {
    // Se leen antes de crear el effect, si no el effect borraría los filtros que llegan por link
    const q = this.route.snapshot.queryParamMap
    this.busqueda.set(q.get('q') ?? '')
    this.filtroEstado.set((q.get('estado') ?? '') as EstadoPedido | '')
    this.filtroPago.set((q.get('pago') ?? '') as FiltroPago)
    this.mostrarCancelados.set(q.get('cancelados') === '1')
    const [columna, sentido] = (q.get('orden') ?? '').split('-')
    if (['id', 'fecha', 'cliente', 'total', 'saldo'].includes(columna)) {
      this.orden.set(columna as ColumnaOrden)
      this.ascendente.set(sentido === 'asc')
    }
    this.pagina.set(Number(q.get('pagina')) || 1)
    // Los filtros viven en la URL: sobreviven a entrar a un pedido y volver
    effect(() => {
      const params: Record<string, string | null> = {
        q: this.busqueda() || null,
        estado: this.filtroEstado() || null,
        pago: this.filtroPago() || null,
        cancelados: this.mostrarCancelados() ? '1' : null,
        orden: this.orden() !== 'id' || this.ascendente() ? `${this.orden()}-${this.ascendente() ? 'asc' : 'desc'}` : null,
        pagina: this.pagina() > 1 ? String(this.pagina()) : null,
      }
      this.router.navigate([], { queryParams: params, replaceUrl: true })
    })
  }

  ngOnInit(): void {
    this.cargarTelefonos()
    this.pedidosService.getAllPedidos().subscribe({
      next: (data) => {
        this.pedidos.set(data)
        this.cargando.set(false)
        if (this.pagina() > this.totalPaginas()) this.pagina.set(1)
      },
      error: async () => {
        this.cargando.set(false)
        await this.alertaService.error('No se pudieron cargar los pedidos')
        this.router.navigate(['/'])
      }
    })
  }

  telefonoDe(pedido: Pedido): string | null | undefined {
    const telefonos = this.telefonos()
    return telefonos ? (telefonos.get(String(pedido.clienteId)) ?? null) : undefined
  }

  // Reemplaza el pedido en la lista para que se vea la fecha del recordatorio
  alRegistrarRecordatorio(actualizado: Pedido) {
    this.pedidos.update(lista => lista.map(p => p.id === actualizado.id ? actualizado : p))
  }

  private cargarTelefonos() {
    this.clientesService.getAllClientes().subscribe({
      next: (clientes) => this.telefonos.set(new Map(clientes.map(c => [String(c.id), c.telefono]))),
      // Sin clientes el botón igual abre el modal, que avisa que falta el teléfono
      error: () => this.telefonos.set(new Map()),
    })
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

  ordenActual = computed(() => `${this.orden()}-${this.ascendente() ? 'asc' : 'desc'}`)

  ordenarComo(valor: string) {
    const [columna, sentido] = valor.split('-')
    this.orden.set(columna as ColumnaOrden)
    this.ascendente.set(sentido === 'asc')
    this.pagina.set(1)
  }

  // En el celular los filtros (salvo el buscador) se esconden detrás de un botón
  filtrosAbiertos = signal(false)
  cantidadFiltros = computed(() =>
    [this.filtroEstado(), this.filtroPago(), this.mostrarCancelados()].filter(Boolean).length
  )

  ordenarPor(columna: ColumnaOrden) {
    if (this.orden() === columna) {
      this.ascendente.update(valor => !valor)
    } else {
      this.orden.set(columna)
      // Textos de la A a la Z; números y fechas del más grande al más chico
      this.ascendente.set(columna === 'cliente')
    }
    this.pagina.set(1)
  }

  ariaOrden(columna: ColumnaOrden): 'ascending' | 'descending' | 'none' {
    if (this.orden() !== columna) return 'none'
    return this.ascendente() ? 'ascending' : 'descending'
  }

  cambiarBusqueda(valor: string) {
    this.busqueda.set(valor)
    this.pagina.set(1)
  }

  cambiarFiltroEstado(valor: string) {
    this.filtroEstado.set(valor as EstadoPedido | '')
    this.pagina.set(1)
  }

  cambiarFiltroPago(valor: string) {
    this.filtroPago.set(valor as FiltroPago)
    this.pagina.set(1)
  }

  cambiarCancelados(valor: boolean) {
    this.mostrarCancelados.set(valor)
    this.pagina.set(1)
  }

  irAPagina(numero: number) {
    this.pagina.set(Math.min(Math.max(1, numero), this.totalPaginas()))
  }

  limpiarFiltros() {
    this.busqueda.set('')
    this.filtroEstado.set('')
    this.filtroPago.set('')
    this.mostrarCancelados.set(false)
    this.pagina.set(1)
  }

  abrir(pedido: Pedido) {
    this.router.navigate(['/pedidos', pedido.id])
  }

}

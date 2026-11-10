import { SelectorPeriodo, nombrePeriodo } from '../../../components/selector-periodo/selector-periodo';
import { OrdenMobile, OpcionOrden } from '../../../components/orden-mobile/orden-mobile';
import { PesosPipe } from '../../../pipes/pesos-pipe';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormatoEnumPipe } from '../../../pipes/formato-enum-pipe';
import { MetodoPago, METODOS_PAGO } from '../../../models/Enums';
import Pago from '../../../models/Pago';
import { PagosService } from '../../../services/pagos/pagos-service';
import { AlertaService } from '../../../services/alerta/alerta-service';
import { getFechaLocalISO } from '../../../utils/fecha-util';
import { SkeletonLista } from '../../../components/skeleton-lista/skeleton-lista';
import { Paginacion } from '../../../components/paginacion/paginacion';
import { filtrosEnUrl, TablaServidor } from '../../../utils/tabla';

// En la URL los métodos viajan separados por coma (?metodos=EFECTIVO,TRANSFERENCIA)
const TODOS_LOS_METODOS = METODOS_PAGO.join(',')

// Solo listado: los pagos se registran desde el detalle del pedido y no se editan ni se borran
@Component({
  imports: [SkeletonLista, Paginacion, RouterLink, DatePipe, FormatoEnumPipe, PesosPipe, OrdenMobile, SelectorPeriodo],
  selector: 'app-pagos-list',
  styleUrl: './pagos-list.css',
  templateUrl: './pagos-list.html',
})
export class PagosList {

  private pagosService = inject(PagosService)
  private alertaService = inject(AlertaService)
  private router = inject(Router)

  readonly metodosPago = METODOS_PAGO
  readonly hoy = getFechaLocalISO()

  busqueda = signal('')
  // Por defecto, los pagos del día. Vacío = sin límite de ese lado
  desde = signal(this.hoy)
  hasta = signal(this.hoy)
  metodos = signal(TODOS_LOS_METODOS)

  metodosElegidos = computed(() => new Set(this.metodos().split(',').filter(Boolean) as MetodoPago[]))
  todosLosMetodos = computed(() => this.metodosElegidos().size === METODOS_PAGO.length)
  // "efectivo y transferencia" para el resumen cuando hay métodos filtrados
  nombresMetodosElegidos = computed(() => {
    const nombres = METODOS_PAGO.filter(m => this.metodosElegidos().has(m)).map(m => m.replace(/_/g, ' ').toLowerCase())
    return nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}` : nombres[0] ?? ''
  })

  // Para los textos: "Hoy todavía no entró ningún pago", "Esta semana…"
  periodo = computed(() => nombrePeriodo(this.desde(), this.hasta()))
  esHoy = computed(() => this.periodo() === 'Hoy')
  // Si se cargó "hasta" antes que "desde" se intercambian, en vez de no mostrar nada
  rangoFechas = computed(() => {
    const d = this.desde(), h = this.hasta()
    return d && h && d > h ? { desde: h, hasta: d } : { desde: d, hasta: h }
  })

  sinFiltros = computed(() => !this.busqueda() && !this.desde() && !this.hasta() && this.todosLosMetodos())

  // Opciones del select "Ordenar por" que se ve en el celular
  readonly opcionesOrden: OpcionOrden[] = [
    { valor: 'fecha-desc', etiqueta: 'Más recientes primero' },
    { valor: 'fecha-asc', etiqueta: 'Más viejos primero' },
    { valor: 'monto-desc', etiqueta: 'Mayor monto' },
    { valor: 'cliente-asc', etiqueta: 'Cliente (A–Z)' },
  ]

  tabla = new TablaServidor({
    columnas: ['fecha', 'cliente', 'pedido', 'monto'] as const,
    ordenInicial: 'fecha',
    columnasTexto: ['cliente'],
    busqueda: this.busqueda,
    filtros: () => [this.metodos(), this.rangoFechas()],
    // Busca por cliente o por número de pedido (ej: "perez" o "12")
    cargar: consulta => this.pagosService.getPagina(consulta, {
      q: this.busqueda(),
      ...this.rangoFechas(),
      metodos: this.todosLosMetodos() ? null : this.metodos(),
    }),
    alError: async (_, primeraCarga) => {
      await this.alertaService.error('No se pudieron cargar los pagos')
      if (primeraCarga) this.router.navigate(['/'])
    },
  })

  totalFiltrado = computed(() => this.tabla.respuesta()?.totalFiltrado ?? 0)

  // Para cerrar la caja: cuánto entró por cada método en lo que se está viendo
  totalPorMetodo = computed(() => this.tabla.respuesta()?.totalPorMetodo ?? [])

  constructor() {
    filtrosEnUrl({ q: this.busqueda, desde: this.desde, hasta: this.hasta, metodos: this.metodos }, this.tabla)
  }

  // Un pago no tiene detalle propio: la fila lleva al pedido
  abrir(pago: Pago) {
    this.router.navigate(['/pedidos', pago.pedidoId])
  }

  alternarMetodo(metodo: MetodoPago, elegido: boolean) {
    const elegidos = new Set(this.metodosElegidos())
    if (elegido) elegidos.add(metodo)
    else elegidos.delete(metodo)
    // Se respeta el orden de METODOS_PAGO para que la URL quede siempre igual
    this.metodos.set(METODOS_PAGO.filter(m => elegidos.has(m)).join(','))
  }

  elegirTodosLosMetodos() {
    this.metodos.set(TODOS_LOS_METODOS)
  }

  verTodasLasFechas() {
    this.desde.set('')
    this.hasta.set('')
  }

  limpiarFiltros() {
    this.busqueda.set('')
    this.elegirTodosLosMetodos()
    this.verTodasLasFechas()
  }

}

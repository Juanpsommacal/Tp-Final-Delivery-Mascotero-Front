import { PesosPipe } from '../../pipes/pesos-pipe';
import { Component, computed, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { SelectorPeriodo } from '../../components/selector-periodo/selector-periodo';
import { ReportesService } from '../../services/reportes/reportes-service';
import { EstadoPedido, ESTADOS_PEDIDO } from '../../models/Enums';
import { PedidosPorEstado, ProductoMasVendido, TicketPromedio, VentasPorMes, VentasPorRango } from '../../models/Reportes';
import { extraerMensajeError } from '../../utils/error-util';
import { forkJoin } from 'rxjs';
import { FormatoEnumPipe } from '../../pipes/formato-enum-pipe';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
               'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function formatoFecha(fecha: Date) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

@Component({
  imports: [FormatoEnumPipe, PesosPipe, SelectorPeriodo],
  selector: 'app-reportes',
  styleUrl: './reportes.css',
  templateUrl: './reportes.html',
})
export class Reportes implements OnInit {

  private reportesService = inject(ReportesService)

  hoy = new Date()
  meses = MESES.map((nombre, indice) => ({ valor: indice + 1, nombre }))
  estados = ESTADOS_PEDIDO

  // --------------------- Resumen del mes ---------------------
  anio = signal(this.hoy.getFullYear())
  mes = signal(this.hoy.getMonth() + 1)
  periodoMes = signal('')
  ventasMes = signal<VentasPorMes | null>(null)
  ticket = signal<TicketPromedio | null>(null)
  pedidosPorEstado = signal<PedidosPorEstado[]>([])
  cargandoMes = signal(false)
  errorMes = signal('')

  anioValido = computed(() => Number.isInteger(this.anio()) && this.anio() >= 2000 && this.anio() <= 2100)


  // --------------------- Ventas por rango de fechas ------------------------
  fechaInicio = signal(formatoFecha(new Date(this.hoy.getFullYear(), this.hoy.getMonth(), 1)))
  fechaFin = signal(formatoFecha(this.hoy))
  ventasRango = signal<VentasPorRango | null>(null)
  cargandoRango = signal(false)
  errorRango = signal('')

  rangoValido = computed(() => !!this.fechaInicio() && !!this.fechaFin() && this.fechaInicio() <= this.fechaFin())

  // Las ventas del rango se recalculan solas al cambiar las fechas (sin botón "Calcular")
  private recalcularRango = effect(() => {
    this.fechaInicio()
    this.fechaFin()
    untracked(() => this.cargarRango())
  })


  // --------------------- Top 5 productos mas vendidos ---------------------
  top5 = signal<ProductoMasVendido[]>([])
  cargandoTop = signal(false)
  errorTop = signal('')

  maxVendido = computed(() => Math.max(1, ...this.top5().map(producto => producto.cantidadVendida)))

  ngOnInit(): void {
    this.cargarMes()
    this.cargarTop5()
  }

  cantidadPorEstado(estado: EstadoPedido) {
    return this.pedidosPorEstado().find(item => item.estado === estado)?.cantidad ?? 0
  }

  cargarMes() { 
    if (!this.anioValido()) return

    this.cargandoMes.set(true)
    this.errorMes.set('')
    this.periodoMes.set(`${this.meses[this.mes() - 1].nombre.toLowerCase()} de ${this.anio()}`)

    forkJoin({
      ventas: this.reportesService.getVentasPorMes(this.anio(), this.mes()),
      ticket: this.reportesService.getTicketPromedio(this.anio(), this.mes()),
      estados: this.reportesService.getPedidosPorEstado(this.anio(), this.mes()),
    }).subscribe({
      next: ({ventas, ticket, estados}) => {
        this.ventasMes.set(ventas)
        this.ticket.set(ticket)
        this.pedidosPorEstado.set(estados)
        this.cargandoMes.set(false)
      },
      error: (error) => {
        this.errorMes.set(extraerMensajeError(error))
        this.cargandoMes.set(false)
      }
    })
  }

  cargarRango() {
    if (!this.rangoValido()) return

    this.cargandoRango.set(true)
    this.errorRango.set('')

    this.reportesService.getVentasPorRango(this.fechaInicio(), this.fechaFin()).subscribe({
      next: (ventas) => {
        this.ventasRango.set(ventas)
        this.cargandoRango.set(false)
      },
      error: (error) => {
        this.errorRango.set(extraerMensajeError(error))
        this.cargandoRango.set(false)
      }
    })
  }

  cargarTop5() {
    this.cargandoTop.set(true)
    this.errorTop.set('')

    this.reportesService.getTop5MasVendidos().subscribe({
      next: (productos) => {
        this.top5.set(productos)
        this.cargandoTop.set(false)
      },
      error: (error) => {
        this.errorTop.set(extraerMensajeError(error))
        this.cargandoTop.set(false)
      }
    })
  }

}

import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ReportesService } from '../../services/reportes/reportes-service';
import { PedidosService } from '../../services/pedidos/pedidos-service';
import { EstadoPedido, ESTADOS_PEDIDO } from '../../models/Enums';
import Pedido from '../../models/Pedido';
import { saldoDe, tieneDeuda } from '../../utils/pedido-utils';
import { PedidosPorEstado, ProductoMasVendido, TicketPromedio, VentasPorMes, VentasPorRango } from '../../models/Reportes';
import { extraerMensajeError } from '../../utils/error-util';
import { forkJoin } from 'rxjs';
import { FormatoEnumPipe } from '../../pipes/formato-enum-pipe';
import { CurrencyPipe } from '@angular/common';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
               'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function formatoFecha(fecha: Date) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

@Component({
  imports: [CurrencyPipe, FormatoEnumPipe],
  selector: 'app-reportes',
  styleUrl: './reportes.css',
  templateUrl: './reportes.html',
})
export class Reportes implements OnInit {

  private reportesService = inject(ReportesService)
  private pedidosService = inject(PedidosService)

  hoy = new Date()
  meses = MESES.map((nombre, indice) => ({ valor: indice + 1, nombre }))
  estados = ESTADOS_PEDIDO

  // --------------------- Deuda pendiente de cobro ---------------------
  pedidosConDeuda = signal<Pedido[]>([])
  cargandoDeuda = signal(false)
  errorDeuda = signal('')

  deudaTotal = computed(() => 
    Math.round(this.pedidosConDeuda().reduce((suma, pedido) => suma + saldoDe(pedido), 0) * 100) / 100
  )

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


  // --------------------- Top 5 productos mas vendidos ---------------------
  top5 = signal<ProductoMasVendido[]>([])
  cargandoTop = signal(false)
  errorTop = signal('')

  maxVendido = computed(() => Math.max(1, ...this.top5().map(producto => producto.cantidadVendida)))

  ngOnInit(): void {
    this.cargarDeuda()
    this.cargarMes()
    this.cargarRango()
    this.cargarTop5()
  }

  cantidadPorEstado(estado: EstadoPedido) {
    return this.pedidosPorEstado().find(item => item.estado === estado)?.cantidad ?? 0
  }

  cargarDeuda() {
    this.cargandoDeuda.set(true)
    this.errorDeuda.set('')

    this.pedidosService.getAllPedidos().subscribe({
      next: (pedidos) => {
        this.pedidosConDeuda.set(pedidos.filter(tieneDeuda))
        this.cargandoDeuda.set(false)
      },
      error: (error) => {
        this.errorDeuda.set(extraerMensajeError(error))
        this.cargandoDeuda.set(false)
      }
    })
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

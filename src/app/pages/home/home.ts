import { PesosPipe } from '../../pipes/pesos-pipe';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import Pedido from '../../models/Pedido';
import Producto from '../../models/Producto';
import { saldoDe } from '../../utils/pedido-utils';
import { PedidosService } from '../../services/pedidos/pedidos-service';
import { ProductosService } from '../../services/productos/productos-service';
import { ModalWhatsapp } from '../../components/modal-whatsapp/modal-whatsapp';
import { Icono } from '../../components/icono/icono';
import { haceCuanto } from '../../utils/whatsapp-util';
import { getFechaLocalISO } from '../../utils/fecha-util';
import { EstadoPedido } from '../../models/Enums';
import { AuthService } from '../../services/authentication/auth-service';

// Con este stock o menos un producto aparece en "Stock bajo"
const STOCK_BAJO = 3
const MAX_FILAS = 5
const MAX_DEUDAS = 3

@Component({
  imports: [RouterLink, DatePipe, ModalWhatsapp, Icono, PesosPipe],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home implements OnInit {

  protected auth = inject(AuthService)
  private pedidosService = inject(PedidosService)
  private productosService = inject(ProductosService)

  readonly stockBajo = STOCK_BAJO
  readonly hoy = new Date()
  private readonly hoyISO = getFechaLocalISO()

  cargando = signal(true)
  error = signal(false)
  // Solo se traen las filas que se muestran; el total de cada cola viene aparte
  porEntregar = signal<Pedido[]>([])
  cantidadPorEntregar = signal(0)
  private deudas = signal<Pedido[]>([])
  cantidadPorCobrar = signal(0)
  totalPorCobrar = signal(0)
  contadores = signal<Partial<Record<EstadoPedido, number>>>({})
  conStockBajo = signal<Producto[]>([])
  cantidadStockBajo = signal(0)

  // Pedido con el modal de WhatsApp abierto (siempre con la plantilla de saldo)
  pedidoWhatsapp = signal<Pedido | null>(null)
  readonly haceCuanto = haceCuanto

  // Deuda más grande primero
  porCobrar = computed(() => this.deudas().map(pedido => ({ pedido, saldo: saldoDe(pedido) })))

  readonly maxFilas = MAX_FILAS

  saludo = computed(() => {
    const hora = this.hoy.getHours()
    if (hora < 13) return 'Buen día'
    if (hora < 20) return 'Buenas tardes'
    return 'Buenas noches'
  })

  ngOnInit(): void {
    this.cargar()
  }

  // Reemplaza el pedido en la lista para que se vea la fecha del recordatorio
  alRegistrarRecordatorio(actualizado: Pedido) {
    this.deudas.update(lista => lista.map(p => p.id === actualizado.id ? actualizado : p))
  }

  cargar() {
    this.cargando.set(true)
    this.error.set(false)
    forkJoin({
      entregas: this.pedidosService.getReparto(this.hoyISO),
      contadores: this.pedidosService.getContadores(),
      deudas: this.pedidosService.getPagina({ page: 0, size: MAX_DEUDAS, orden: 'saldo-desc' }, { q: '', estado: '', filtroPago: 'CON_DEUDA', cancelados: false }),
      stock: this.productosService.getPagina({ page: 0, size: MAX_FILAS, orden: 'stock-asc' }, { q: '', tipo: '', stockMaximo: STOCK_BAJO }),
    }).subscribe({
      next: ({ entregas, contadores, deudas, stock }) => {
        this.porEntregar.set(entregas.slice(0, MAX_FILAS))
        this.cantidadPorEntregar.set(entregas.length)
        this.contadores.set(contadores)
        this.deudas.set(deudas.contenido)
        this.cantidadPorCobrar.set(deudas.totalElementos)
        this.totalPorCobrar.set(deudas.saldoFiltrado)
        this.conStockBajo.set(stock.contenido)
        this.cantidadStockBajo.set(stock.totalElementos)
        this.cargando.set(false)
      },
      error: () => {
        this.error.set(true)
        this.cargando.set(false)
      }
    })
  }

  estaAtrasado(pedido: Pedido): boolean {
    return !!pedido.fechaEntrega && pedido.fechaEntrega < this.hoyISO
  }
}

import { PesosPipe } from '../../pipes/pesos-pipe';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import Pedido from '../../models/Pedido';
import Producto from '../../models/Producto';
import { PedidosService } from '../../services/pedidos/pedidos-service';
import { ProductosService } from '../../services/productos/productos-service';
import { saldoDe, tieneDeuda } from '../../utils/pedido-utils';
import { ClientesService } from '../../services/clientes/clientes-service';
import { ModalWhatsapp } from '../../components/modal-whatsapp/modal-whatsapp';
import { Icono } from '../../components/icono/icono';
import { haceCuanto } from '../../utils/whatsapp-util';

// Con este stock o menos un producto aparece en "Stock bajo"
const STOCK_BAJO = 3
const MAX_FILAS = 5

@Component({
  imports: [RouterLink, DatePipe, ModalWhatsapp, Icono, PesosPipe],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home implements OnInit {

  private pedidosService = inject(PedidosService)
  private productosService = inject(ProductosService)
  private clientesService = inject(ClientesService)

  readonly stockBajo = STOCK_BAJO
  readonly hoy = new Date()

  cargando = signal(true)
  error = signal(false)
  pedidos = signal<Pedido[]>([])
  productos = signal<Producto[]>([])

  // clienteId -> teléfono, para el botón de WhatsApp. null mientras carga
  telefonos = signal<Map<string, string> | null>(null)
  // Pedido con el modal de WhatsApp abierto (siempre con la plantilla de saldo)
  pedidoWhatsapp = signal<Pedido | null>(null)
  readonly haceCuanto = haceCuanto

  // Los más viejos primero: son los que hace más que esperan
  porEntregar = computed(() =>
    this.pedidos()
      .filter(p => p.estadoPedido === 'PENDIENTE')
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id)
  )

  // Deuda más grande primero
  porCobrar = computed(() =>
    this.pedidos()
      .filter(p => p.estadoPedido !== 'CANCELADO' && tieneDeuda(p))
      .map(p => ({ pedido: p, saldo: saldoDe(p) }))
      .sort((a, b) => b.saldo - a.saldo)
  )

  totalPorCobrar = computed(() => this.porCobrar().reduce((suma, d) => suma + d.saldo, 0))

  conStockBajo = computed(() =>
    this.productos()
      .filter(p => p.activo !== false && p.stock <= STOCK_BAJO)
      .sort((a, b) => a.stock - b.stock)
  )

  readonly maxFilas = MAX_FILAS

  saludo = computed(() => {
    const hora = this.hoy.getHours()
    if (hora < 13) return 'Buen día'
    if (hora < 20) return 'Buenas tardes'
    return 'Buenas noches'
  })

  ngOnInit(): void {
    this.cargar()
    this.cargarTelefonos()
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


  cargar() {
    this.cargando.set(true)
    this.error.set(false)
    forkJoin({
      pedidos: this.pedidosService.getAllPedidos(),
      productos: this.productosService.getAllProductos(),
    }).subscribe({
      next: ({ pedidos, productos }) => {
        this.pedidos.set(pedidos)
        this.productos.set(productos)
        this.cargando.set(false)
      },
      error: () => {
        this.error.set(true)
        this.cargando.set(false)
      }
    })
  }

  diasEsperando(pedido: Pedido): number {
    const [anio, mes, dia] = pedido.fecha.split('-').map(Number)
    const fecha = new Date(anio, mes - 1, dia)
    const inicioHoy = new Date(this.hoy.getFullYear(), this.hoy.getMonth(), this.hoy.getDate())
    return Math.max(0, Math.round((inicioHoy.getTime() - fecha.getTime()) / 86_400_000))
  }

  textoEspera(pedido: Pedido): string {
    const dias = this.diasEsperando(pedido)
    if (dias === 0) return 'Hoy'
    if (dias === 1) return 'Ayer'
    return `Hace ${dias} días`
  }
}

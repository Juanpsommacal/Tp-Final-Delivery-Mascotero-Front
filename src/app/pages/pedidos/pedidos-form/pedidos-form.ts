import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import Cliente from '../../../models/Cliente';
import Direccion from '../../../models/Direccion';
import Producto from '../../../models/Producto';
import { PedidoRequest } from '../../../models/Pedido';
import { ClientesService } from '../../../services/clientes/clientes-service';
import { ProductosService } from '../../../services/productos/productos-service';
import { PedidosService } from '../../../services/pedidos/pedidos-service';
import { AlertaService } from '../../../services/alerta/alerta-service';
import { coincideBusqueda } from '../../../utils/busqueda-util';
import { coincideProducto } from '../../../utils/producto-util';
import { extraerMensajeError } from '../../../utils/error-util';

const MAX_SUGERENCIAS = 8
// Igual que @Digits(integer = 2) de DetallePedidoCreateRequestDTO
const MAX_CANTIDAD = 99

interface ItemPedido {
  producto: Producto
  cantidad: number
}

@Component({
  imports: [RouterLink, CurrencyPipe],
  selector: 'app-pedidos-form',
  styleUrl: './pedidos-form.css',
  templateUrl: './pedidos-form.html',
})
export class PedidosForm implements OnInit {

  private pedidosService = inject(PedidosService)
  private clientesService = inject(ClientesService)
  private productosService = inject(ProductosService)
  private alertaService = inject(AlertaService)
  private router = inject(Router)

  guardando = signal(false)
  mensaje = signal('')
  // Los errores generales (falta cliente, direccion, productos) se muestran recien al intentar guardar
  intentoGuardar = signal(false)

  ///----- Cliente -----

  clientes = signal<Cliente[]>([])
  busquedaCliente = signal('')
  clienteSeleccionado = signal<Cliente | null>(null)
  mostrarSugerencias = signal(false)
  indiceActivo = signal(-1)

  sugerenciasClientes = computed(() => {
    const texto = this.busquedaCliente()
    if (texto.trim().length < 2) return []

    return this.clientes()
      .filter(c => coincideBusqueda(`${c.nombre} ${c.apellido} ${c.telefono}`, texto))
      .slice(0, MAX_SUGERENCIAS)
  })

  ///----- Direccion -----

  direccionSeleccionada = signal<Direccion | null>(null)

  ///----- Productos -----

  productos = signal<Producto[]>([])
  cargandoProductos = signal(true)
  busquedaProducto = signal('')
  items = signal<ItemPedido[]>([])

  // Solo productos activos: el back rechaza el pedido si alguno esta inactivo
  productosFiltrados = computed(() =>
    this.productos()
      .filter(p => p.activo !== false && coincideProducto(p, this.busquedaProducto()))
      .slice(0, MAX_SUGERENCIAS)
  )

  total = computed(() =>
    this.items().reduce((suma, item) => suma + this.precioFinal(item.producto) * item.cantidad, 0)
  )

  hayErroresEnItems = computed(() => this.items().some(item => this.errorCantidad(item) !== null))

  ngOnInit(): void {
    this.clientesService.getAllClientes().subscribe({
      next: (data) => this.clientes.set(data),
      error: () => this.alertaService.error('No se pudieron cargar los clientes')
    })

    this.productosService.getAllProductos().subscribe({
      next: (data) => {
        this.productos.set(data)
        this.cargandoProductos.set(false)
      },
      error: () => {
        this.cargandoProductos.set(false)
        this.alertaService.error('No se pudieron cargar los productos')
      }
    })
  }

  ///----- Cliente -----

  abrirSugerencias() {
    this.mostrarSugerencias.set(true)
    this.indiceActivo.set(-1)
  }

  cerrarSugerencias() {
    this.mostrarSugerencias.set(false)
    this.indiceActivo.set(-1)
  }

  navegarSugerencias(evento: KeyboardEvent) {
    const cantidad = this.sugerenciasClientes().length
    if (!this.mostrarSugerencias() || cantidad === 0) return

    if (evento.key === 'ArrowDown') {
      evento.preventDefault()
      this.indiceActivo.update(i => (i + 1) % cantidad)
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault()
      this.indiceActivo.update(i => (i <= 0 ? cantidad - 1 : i - 1))
    } else if (evento.key === 'Enter' && this.indiceActivo() >= 0) {
      evento.preventDefault()
      this.seleccionarCliente(this.sugerenciasClientes()[this.indiceActivo()])
    } else if (evento.key === 'Escape') {
      this.cerrarSugerencias()
    }
  }

  seleccionarCliente(cliente: Cliente) {
    this.clienteSeleccionado.set(cliente)
    this.cerrarSugerencias()
    this.busquedaCliente.set('')

    // Si tiene una sola direccion se elige sola
    this.direccionSeleccionada.set(cliente.direcciones.length === 1 ? cliente.direcciones[0] : null)
  }

  cambiarCliente() {
    this.clienteSeleccionado.set(null)
    this.direccionSeleccionada.set(null)
  }

  seleccionarDireccion(id: string) {
    const direccion = this.clienteSeleccionado()?.direcciones.find(d => String(d.id) === id) ?? null
    this.direccionSeleccionada.set(direccion)
  }

  ///----- Productos -----

  // Mismo precio que cobra el back: el de la oferta si hay una vigente, si no el de lista
  precioFinal(producto: Producto): number {
    return producto.precioOferta ?? producto.precio
  }

  estaAgregado(producto: Producto): boolean {
    return this.items().some(item => item.producto.id === producto.id)
  }

  agregarProducto(producto: Producto) {
    if (this.estaAgregado(producto) || producto.stock <= 0) return
    this.items.update(items => [...items, { producto, cantidad: 1 }])
  }

  quitarProducto(producto: Producto) {
    this.items.update(items => items.filter(item => item.producto.id !== producto.id))
  }

  cambiarCantidad(producto: Producto, valor: string) {
    const cantidad = valor === '' ? 0 : Number(valor)
    this.items.update(items =>
      items.map(item => item.producto.id === producto.id ? { ...item, cantidad } : item)
    )
  }

  // Se valida aca para no mandar al back un pedido que sabemos que va a rechazar
  errorCantidad(item: ItemPedido): string | null {
    if (!Number.isInteger(item.cantidad) || item.cantidad < 1)
      return 'La cantidad tiene que ser un entero mayor a 0'
    if (item.cantidad > MAX_CANTIDAD)
      return `No se pueden pedir mas de ${MAX_CANTIDAD} unidades`
    if (item.cantidad > item.producto.stock)
      return `Solo hay ${item.producto.stock} en stock`
    return null
  }

  ///----- Guardar -----

  guardar() {
    this.intentoGuardar.set(true)
    this.mensaje.set('')

    const cliente = this.clienteSeleccionado()
    const direccion = this.direccionSeleccionada()

    if (!cliente || !direccion || this.items().length === 0 || this.hayErroresEnItems()) {
      this.mensaje.set('Revisá los datos del pedido antes de guardarlo')
      return
    }

    const pedido: PedidoRequest = {
      clienteId: Number(cliente.id),
      direccion: {
        calle: direccion.calle,
        numero: direccion.numero,
        piso: direccion.piso,
        departamento: direccion.departamento,
        observaciones: direccion.observaciones,
      },
      detalles: this.items().map(item => ({ productoId: item.producto.id!, cantidad: item.cantidad })),
    }

    this.guardando.set(true)

    this.pedidosService.createPedido(pedido).subscribe({
      next: async (creado) => {
        await this.alertaService.exito(`Pedido #${creado.id} creado correctamente`)
        this.router.navigate(['/pedidos', creado.id])
      },
      error: (error) => {
        this.mensaje.set(extraerMensajeError(error))
        this.guardando.set(false)
      }
    })
  }

  volver() {
    this.router.navigate(['/pedidos'])
  }

}

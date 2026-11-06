import { DatePipe } from '@angular/common';
import { PesosPipe, formatearPesos } from '../../../pipes/pesos-pipe';
import { Icono } from '../../../components/icono/icono';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import Cliente from '../../../models/Cliente';
import Direccion from '../../../models/Direccion';
import Producto from '../../../models/Producto';
import Pedido, { PedidoRequest } from '../../../models/Pedido';
import { ClientesService } from '../../../services/clientes/clientes-service';
import { ProductosService } from '../../../services/productos/productos-service';
import { PedidosService } from '../../../services/pedidos/pedidos-service';
import { AlertaService } from '../../../services/alerta/alerta-service';
import { ConfirmacionService } from '../../../services/confirmacion/confirmacion-service';
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
  imports: [RouterLink, DatePipe, Icono, PesosPipe],
  selector: 'app-pedidos-form',
  styleUrl: './pedidos-form.css',
  templateUrl: './pedidos-form.html',
})
export class PedidosForm implements OnInit {

  private pedidosService = inject(PedidosService)
  private clientesService = inject(ClientesService)
  private productosService = inject(ProductosService)
  private alertaService = inject(AlertaService)
  private confirmacionService = inject(ConfirmacionService)
  private router = inject(Router)
  private route = inject(ActivatedRoute)

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

  ///----- Repetir el último pedido -----

  // Historial para "Repetir último pedido": el alimento se compra todos los meses
  private pedidos = signal<Pedido[]>([])
  // Qué no se pudo copiar tal cual (sin stock, dado de baja, menos unidades)
  avisosRepetir = signal<string[]>([])

  ultimoPedido = computed(() => {
    const cliente = this.clienteSeleccionado()
    if (!cliente) return null
    return this.pedidos()
      .filter(p => String(p.clienteId) === String(cliente.id) && p.estadoPedido !== 'CANCELADO')
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)[0] ?? null
  })

  unidadesUltimoPedido = computed(() =>
    this.ultimoPedido()?.detallePedido.reduce((suma, d) => suma + d.cantidad, 0) ?? 0
  )

  repetirUltimoPedido() {
    const pedido = this.ultimoPedido()
    const cliente = this.clienteSeleccionado()
    if (!pedido || !cliente) return

    const avisos: string[] = []
    const items: ItemPedido[] = []
    for (const detalle of pedido.detallePedido) {
      // Por id si el back lo manda; si no, por "marca nombre", que es como el back arma el nombre
      const producto = this.productos().find(p =>
        detalle.productoId != null ? p.id === detalle.productoId : `${p.marca} ${p.nombre}` === detalle.nombreProducto
      )
      if (!producto || producto.activo === false) {
        avisos.push(`${detalle.nombreProducto} ya no está a la venta.`)
      } else if (producto.stock <= 0) {
        avisos.push(`${detalle.nombreProducto} no tiene stock.`)
      } else {
        const cantidad = Math.min(detalle.cantidad, producto.stock)
        if (cantidad < detalle.cantidad) {
          avisos.push(`${detalle.nombreProducto}: había ${detalle.cantidad}, solo quedan ${producto.stock}.`)
        }
        if (this.precioFinal(producto) !== detalle.precioDescuento) {
          avisos.push(`${detalle.nombreProducto} cambió de precio: antes ${formatearPesos(detalle.precioDescuento)}, ahora ${formatearPesos(this.precioFinal(producto))}.`)
        }
        items.push({ producto, cantidad })
      }
    }

    this.items.set(items)
    this.avisosRepetir.set(avisos)

    // La misma dirección de entrega, si el cliente la sigue teniendo
    const direccion = cliente.direcciones.find(d => `${d.calle} ${d.numero}` === pedido.direccionCompleta)
    if (direccion) this.direccionSeleccionada.set(direccion)
  }

  ngOnInit(): void {
    // ?cliente=3&repetir=1 llega desde el detalle del cliente
    const params = this.route.snapshot.queryParamMap
    const clienteInicial = params.get('cliente')
    const repetir = params.get('repetir') === '1'

    this.clientesService.getAllClientes().subscribe({
      next: (data) => {
        this.clientes.set(data)
        const cliente = clienteInicial ? data.find(c => String(c.id) === clienteInicial) : null
        if (cliente) this.seleccionarCliente(cliente)
        if (repetir) this.repetirSiEstaTodo()
      },
      error: () => this.alertaService.error('No se pudieron cargar los clientes')
    })


    this.pedidosService.getAllPedidos().subscribe({
      next: (data) => {
        this.pedidos.set(data)
        if (repetir) this.repetirSiEstaTodo()
      },
      // Sin historial solo se pierde el botón de repetir
      error: () => this.pedidos.set([]),
    })

    this.productosService.getAllProductos().subscribe({
      next: (data) => {
        this.productos.set(data)
        this.cargandoProductos.set(false)
        if (repetir) this.repetirSiEstaTodo()
      },
      error: () => {
        this.cargandoProductos.set(false)
        this.alertaService.error('No se pudieron cargar los productos')
      }
    })
  }

  // Clientes, productos e historial llegan por separado: se repite cuando están los tres
  private yaRepetido = false
  private repetirSiEstaTodo() {
    if (this.yaRepetido || !this.clienteSeleccionado() || this.cargandoProductos() || this.pedidos().length === 0) return
    this.yaRepetido = true
    this.repetirUltimoPedido()
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
    this.avisosRepetir.set([])
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
      return `No se pueden pedir más de ${MAX_CANTIDAD} unidades`
    if (item.cantidad > item.producto.stock)
      return `Solo hay ${item.producto.stock} en stock`
    return null
  }

  ///----- Guardar -----

  async guardar() {
    this.intentoGuardar.set(true)
    this.mensaje.set('')

    const cliente = this.clienteSeleccionado()
    const direccion = this.direccionSeleccionada()

    if (!cliente || !direccion || this.items().length === 0 || this.hayErroresEnItems()) {
      const faltan = [
        !cliente && 'elegir el cliente',
        cliente && !direccion && 'elegir la dirección de entrega',
        this.items().length === 0 && 'agregar al menos un producto',
        this.hayErroresEnItems() && 'corregir las cantidades marcadas',
      ].filter(Boolean)
      this.mensaje.set(`Para crear el pedido falta ${faltan.join(', ')}.`)
      setTimeout(() => document.getElementById('error-formulario')?.focus())
      return
    }

    // Resumen antes de crear: el pedido descuenta stock en el momento
    const unidades = this.items().reduce((suma, item) => suma + item.cantidad, 0)
    const confirmado = await this.confirmacionService.confirmar({
      titulo: 'Revisá el pedido',
      mensaje: `${cliente.nombre} ${cliente.apellido}, a ${direccion.calle} ${direccion.numero}. ` +
        `${unidades} ${unidades === 1 ? 'unidad' : 'unidades'} por ${formatearPesos(this.total())}. ` +
        `Al crearlo se descuenta el stock de los productos.`,
      textoConfirmar: 'Crear pedido',
      textoCancelar: 'Seguir editando',
      tipo: 'info',
    })
    if (!confirmado) return

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
        await this.alertaService.exito(`Pedido #${creado.id} para ${cliente.nombre} ${cliente.apellido}.`, 'Pedido creado')
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

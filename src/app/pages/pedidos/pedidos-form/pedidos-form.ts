import { DatePipe } from '@angular/common';
import { PesosPipe, formatearPesos } from '../../../pipes/pesos-pipe';
import { Icono } from '../../../components/icono/icono';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
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

  busquedaCliente = signal('')
  clienteSeleccionado = signal<Cliente | null>(null)
  mostrarSugerencias = signal(false)
  indiceActivo = signal(-1)

  sugerenciasClientes = toSignal(toObservable(this.busquedaCliente).pipe(
    map(texto => texto.trim()),
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(texto => texto.length < 2 ? of<Cliente[]>([]) : this.clientesService.getPagina(
      { page: 0, size: MAX_SUGERENCIAS, orden: 'nombre-asc' }, texto, false
    ).pipe(
      map(pagina => pagina.contenido.map(fila => fila.cliente)),
      catchError(() => {
        this.alertaService.error('No se pudieron cargar los clientes')
        return of<Cliente[]>([])
      }),
    )),
  ), { initialValue: [] as Cliente[] })

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

  // Si no alcanza el stock el pedido se crea igual, esperando la mercadería
  faltaMercaderia = computed(() => this.items().some(item => item.cantidad > item.producto.stock))

  ///----- Repetir el último pedido -----

  // Pedidos del cliente elegido, para "Repetir último pedido": el alimento se compra todos los meses
  private pedidos = signal<Pedido[]>([])
  // Qué no se pudo copiar tal cual (sin stock, dado de baja, menos unidades)
  avisosRepetir = signal<string[]>([])

  ultimoPedido = computed(() => {
    const cliente = this.clienteSeleccionado()
    if (!cliente) return null
    return this.pedidos()
      .filter(p => p.estadoPedido !== 'CANCELADO')
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
      } else {
        if (producto.stock <= 0) {
          avisos.push(`${detalle.nombreProducto} no tiene stock.`)
        } else if (detalle.cantidad > producto.stock) {
          const disponible = producto.stock === 1 ? 'queda 1' : `quedan ${producto.stock}`
          avisos.push(`${detalle.nombreProducto}: el pedido anterior tenía ${detalle.cantidad} pero solo ${disponible} en stock.`)
        }
        const cambioDePrecio = this.textoCambioDePrecio(producto, detalle.precioDescuento)
        if (cambioDePrecio) {
          avisos.push(`${detalle.nombreProducto} ${cambioDePrecio}: antes ${formatearPesos(detalle.precioDescuento)}, ahora ${formatearPesos(this.precioFinal(producto))}.`)
        }
        items.push({ producto, cantidad: detalle.cantidad })
      }
    }

    this.items.set(items)
    this.avisosRepetir.set(avisos)

    // La misma dirección de entrega, si el cliente la sigue teniendo
    const direccion = cliente.direcciones.find(d => `${d.calle} ${d.numero}` === pedido.direccionCompleta)
    if (direccion) this.direccionSeleccionada.set(direccion)
  }

  private textoCambioDePrecio(producto: Producto, precioAnterior: number): string | null {
    const precioActual = this.precioFinal(producto)
    if (precioActual === precioAnterior) return null
    if (precioActual > precioAnterior) return 'aumentó de precio'
    return producto.precioOferta != null ? 'tiene una oferta' : 'bajó de precio'
  }

  ngOnInit(): void {
    // ?cliente=3&repetir=1 llega desde el detalle del cliente
    const params = this.route.snapshot.queryParamMap
    const clienteInicial = params.get('cliente')
    this.repetirAlCargar = params.get('repetir') === '1'

    if (clienteInicial) {
      this.clientesService.getClienteById(clienteInicial).subscribe({
        next: (cliente) => this.seleccionarCliente(cliente),
        error: () => this.alertaService.error('No se pudo cargar el cliente')
      })
    }

    this.productosService.getAllProductos().subscribe({
      next: (data) => {
        this.productos.set(data)
        this.cargandoProductos.set(false)
        this.repetirSiEstaTodo()
      },
      error: () => {
        this.cargandoProductos.set(false)
        this.alertaService.error('No se pudieron cargar los productos')
      }
    })
  }

  // Productos e historial del cliente llegan por separado: se repite cuando están los dos
  private repetirAlCargar = false
  private repetirSiEstaTodo() {
    if (!this.repetirAlCargar || !this.clienteSeleccionado() || this.cargandoProductos() || this.pedidos().length === 0) return
    this.repetirAlCargar = false
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

    this.pedidos.set([])
    this.pedidosService.getPedidosDeCliente(cliente.id!).subscribe({
      next: (data) => {
        // Si mientras tanto se eligió otro cliente, esta respuesta ya no sirve
        if (this.clienteSeleccionado()?.id !== cliente.id) return
        this.pedidos.set(data)
        this.repetirSiEstaTodo()
      },
      // Sin historial solo se pierde el botón de repetir
      error: () => this.pedidos.set([]),
    })
  }

  cambiarCliente() {
    this.clienteSeleccionado.set(null)
    this.direccionSeleccionada.set(null)
    this.pedidos.set([])
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
    if (this.estaAgregado(producto)) return
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
    return null
  }

  faltanteDe(item: ItemPedido): number {
    return Math.max(0, item.cantidad - item.producto.stock)
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
        (this.faltaMercaderia()
          ? `Como falta mercadería, va a quedar en espera y todavía no se descuenta stock.`
          : `Al crearlo se descuenta el stock de los productos.`),
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

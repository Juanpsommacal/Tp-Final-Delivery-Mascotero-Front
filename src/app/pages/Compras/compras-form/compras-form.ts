import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import Producto from '../../../models/Producto';
import Compra, { CompraRequest } from '../../../models/Compra';
import { Proveedor } from '../../../models/Proveedor';
import { ProveedoresService } from '../../../services/proveedores/proveedores-service';
import { ProductosService } from '../../../services/Productos/productos-service';
import { ComprasService } from '../../../services/Compras/compras-service';
import { AlertaService } from '../../../services/Alerta/alerta-service';
import { coincideProducto } from '../../../utils/producto-util';
import { extraerMensajeError } from '../../../utils/error-util';

const MAX_SUGERENCIAS = 8
// Igual que @Digits de DetalleCompraCreateRequestDTO
const MAX_CANTIDAD = 9999
const MAX_PRECIO = 9999999.99

interface ItemCompra {
  producto: Producto
  cantidad: number
  // null mientras no se cargo un precio
  precio: number | null
}

@Component({
  imports: [CurrencyPipe],
  selector: 'app-compras-form',
  styleUrl: './compras-form.css',
  templateUrl: './compras-form.html',
})
export class ComprasForm implements OnInit {

  private comprasService = inject(ComprasService)
  private proveedoresService = inject(ProveedoresService)
  private productosService = inject(ProductosService)
  private alertaService = inject(AlertaService)
  private router = inject(Router)

  guardando = signal(false)
  mensaje = signal('')
  // Los errores generales (falta proveedor o productos) se muestran recien al intentar guardar
  intentoGuardar = signal(false)

  // Solo proveedores activos: el back rechaza compras a proveedores dados de baja
  proveedores = signal<Proveedor[]>([])
  proveedorId = signal('')

  productos = signal<Producto[]>([])
  cargandoProductos = signal(true)
  busquedaProducto = signal('')
  items = signal<ItemCompra[]>([])

  // Historial de compras: de ahi sale el ultimo precio de cada producto y que productos vende cada proveedor
  private compras = signal<Compra[]>([])

  private ultimoPrecio = computed(() => {
    const precios = new Map<number, number>()
    // De la mas vieja a la mas nueva, asi la ultima compra pisa a las anteriores
    for (const compra of [...this.compras()].sort((a, b) => a.id - b.id)) {
      if (compra.estadoCompra === 'CANCELADA') continue
      for (const detalle of compra.detalleResponseDTO) precios.set(detalle.productoId, detalle.precioUnitario)
    }
    return precios
  })

  private productosDelProveedor = computed(() => {
    const id = this.proveedorId()
    return new Set(
      this.compras()
        .filter(compra => String(compra.proveedorId) === id)
        .flatMap(compra => compra.detalleResponseDTO.map(d => d.productoId))
    )
  })

  // Los que ya se le compraron a este proveedor van primero
  productosFiltrados = computed(() => {
    const delProveedor = this.productosDelProveedor()
    return this.productos()
      .filter(p => p.activo !== false && coincideProducto(p, this.busquedaProducto()))
      .sort((a, b) => Number(delProveedor.has(b.id!)) - Number(delProveedor.has(a.id!)))
      .slice(0, MAX_SUGERENCIAS)
  })

  total = computed(() =>
    Math.round(this.items().reduce((suma, item) => suma + (item.precio ?? 0) * item.cantidad, 0) * 100) / 100
  )

  hayErroresEnItems = computed(() =>
    this.items().some(item => this.errorCantidad(item) !== null || this.errorPrecio(item) !== null)
  )

  ngOnInit(): void {
    this.proveedoresService.getAll().subscribe({
      next: (data) => this.proveedores.set(data.filter(p => p.activo)),
      error: () => this.alertaService.error('No se pudieron cargar los proveedores')
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

    // Si falla solo se pierde la ayuda (ultimo precio y orden por proveedor), la compra se puede cargar igual
    this.comprasService.getAllCompras().subscribe({
      next: (data) => this.compras.set(data),
      error: () => this.compras.set([])
    })
  }

  esDelProveedor(producto: Producto): boolean {
    return this.productosDelProveedor().has(producto.id!)
  }

  estaAgregado(producto: Producto): boolean {
    return this.items().some(item => item.producto.id === producto.id)
  }

  agregarProducto(producto: Producto) {
    if (this.estaAgregado(producto)) return
    const precio = this.ultimoPrecio().get(producto.id!) ?? null
    this.items.update(items => [...items, { producto, cantidad: 1, precio }])
  }

  quitarProducto(producto: Producto) {
    this.items.update(items => items.filter(item => item.producto.id !== producto.id))
  }

  cambiarCantidad(producto: Producto, valor: string) {
    const cantidad = valor === '' ? 0 : Number(valor)
    this.actualizarItem(producto, { cantidad })
  }

  cambiarPrecio(producto: Producto, valor: string) {
    const precio = valor === '' ? null : Number(valor)
    this.actualizarItem(producto, { precio })
  }

  private actualizarItem(producto: Producto, cambios: Partial<ItemCompra>) {
    this.items.update(items =>
      items.map(item => item.producto.id === producto.id ? { ...item, ...cambios } : item)
    )
  }

  ///----- Validaciones (mismas que DetalleCompraCreateRequestDTO) -----

  errorCantidad(item: ItemCompra): string | null {
    if (!Number.isInteger(item.cantidad) || item.cantidad < 1)
      return 'La cantidad tiene que ser un entero mayor a 0'
    if (item.cantidad > MAX_CANTIDAD)
      return `No se pueden comprar mas de ${MAX_CANTIDAD} unidades`
    return null
  }

  // El precio puede ser 0: hay productos que vienen bonificados
  errorPrecio(item: ItemCompra): string | null {
    if (item.precio === null || Number.isNaN(item.precio))
      return 'Cargá el precio unitario'
    if (item.precio < 0)
      return 'El precio no puede ser negativo'
    if (item.precio > MAX_PRECIO || Math.round(item.precio * 100) !== item.precio * 100)
      return 'Maximo 7 digitos enteros y 2 decimales'
    return null
  }

  // No bloquea la compra, solo avisa
  avisoPrecio(item: ItemCompra): string | null {
    if (item.precio === null || item.precio <= item.producto.precio) return null
    return 'Lo estás comprando más caro de lo que lo vendés'
  }

  ///----- Guardar -----

  guardar() {
    this.intentoGuardar.set(true)
    this.mensaje.set('')

    if (!this.proveedorId() || this.items().length === 0 || this.hayErroresEnItems()) {
      this.mensaje.set('Revisá los datos de la compra antes de guardarla')
      return
    }

    const compra: CompraRequest = {
      proveedorId: Number(this.proveedorId()),
      detalle: this.items().map(item => ({
        productoId: item.producto.id!,
        cantidad: item.cantidad,
        precioUnitario: item.precio!,
      })),
    }

    this.guardando.set(true)

    this.comprasService.createCompra(compra).subscribe({
      next: async (creada) => {
        await this.alertaService.exito(`Compra #${creada.id} creada correctamente`)
        this.router.navigate(['/compras', creada.id])
      },
      error: (error) => {
        this.mensaje.set(extraerMensajeError(error))
        this.guardando.set(false)
      }
    })
  }

  volver() {
    this.router.navigate(['/compras'])
  }

}

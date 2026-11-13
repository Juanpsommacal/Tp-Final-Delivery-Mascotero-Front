import { PesosPipe, formatearPesos } from '../../../pipes/pesos-pipe';
import { Icono } from '../../../components/icono/icono';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap } from 'rxjs';
import { Router } from '@angular/router';
import Producto from '../../../models/Producto';
import { CompraRequest } from '../../../models/Compra';
import { Proveedor } from '../../../models/Proveedor';
import { ProveedoresService } from '../../../services/proveedores/proveedores-service';
import { ConfirmacionService } from '../../../services/confirmacion/confirmacion-service';

import { ComprasService } from '../../../services/compras/compras-service';
import { AlertaService } from '../../../services/alerta/alerta-service';
import { coincideProducto } from '../../../utils/producto-util';
import { extraerMensajeError } from '../../../utils/error-util';
import { ProductosService } from '../../../services/productos/productos-service';

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
  imports: [Icono, PesosPipe],
  selector: 'app-compras-form',
  styleUrl: './compras-form.css',
  templateUrl: './compras-form.html',
})
export class ComprasForm implements OnInit {

  private comprasService = inject(ComprasService)
  private proveedoresService = inject(ProveedoresService)
  private productosService = inject(ProductosService)
  private alertaService = inject(AlertaService)
  private confirmacionService = inject(ConfirmacionService)
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

  // Último precio de cada producto. Si falla solo se pierde la sugerencia, la compra se puede cargar igual
  private ultimoPrecio = signal(new Map<number, number>())

  // Productos que ya se le compraron al proveedor elegido
  private productosDelProveedor = toSignal(toObservable(this.proveedorId).pipe(
    switchMap(id => id ? this.comprasService.getProductosDeProveedor(id).pipe(catchError(() => of<number[]>([]))) : of<number[]>([])),
    map(ids => new Set(ids)),
  ), { initialValue: new Set<number>() })

  // Los que ya se le compraron a este proveedor van primero, y dentro de cada grupo
  // el de menos stock arriba: son los que más urge reponer
  productosFiltrados = computed(() => {
    const delProveedor = this.productosDelProveedor()
    return this.productos()
      .filter(p => p.activo !== false && coincideProducto(p, this.busquedaProducto()))
      .sort((a, b) =>
        Number(delProveedor.has(b.id!)) - Number(delProveedor.has(a.id!)) ||
        a.stock - b.stock
      )
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

    this.comprasService.getUltimosPrecios().subscribe({
      next: (precios) => this.ultimoPrecio.set(new Map(precios.map(p => [p.productoId, p.precioUnitario]))),
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
      return `No se pueden comprar más de ${MAX_CANTIDAD} unidades`
    return null
  }

  // El precio puede ser 0: hay productos que vienen bonificados
  errorPrecio(item: ItemCompra): string | null {
    if (item.precio === null || Number.isNaN(item.precio))
      return 'Cargá el precio unitario'
    if (item.precio < 0)
      return 'El precio no puede ser negativo'
    if (item.precio > MAX_PRECIO || Math.round(item.precio * 100) !== item.precio * 100)
      return 'Máximo 7 dígitos enteros y 2 decimales'
    return null
  }

  // No bloquea la compra, solo avisa
  avisoPrecio(item: ItemCompra): string | null {
    if (item.precio === null || item.precio <= item.producto.precio) return null
    return 'Lo estás comprando más caro de lo que lo vendés'
  }

  ///----- Guardar -----

  async guardar() {
    this.intentoGuardar.set(true)
    this.mensaje.set('')

    if (!this.proveedorId() || this.items().length === 0 || this.hayErroresEnItems()) {
      const faltan = [
        !this.proveedorId() && 'elegir el proveedor',
        this.items().length === 0 && 'agregar al menos un producto',
        this.hayErroresEnItems() && 'corregir las cantidades o precios marcados',
      ].filter(Boolean)
      this.mensaje.set(`Para crear la compra falta ${faltan.join(', ')}.`)
      setTimeout(() => document.getElementById('error-formulario')?.focus())
      return
    }

    const proveedor = this.proveedores().find(p => String(p.id) === String(this.proveedorId()))
    const unidades = this.items().reduce((suma, item) => suma + item.cantidad, 0)
    const confirmado = await this.confirmacionService.confirmar({
      titulo: 'Revisá la compra',
      mensaje: `${unidades} ${unidades === 1 ? 'unidad' : 'unidades'} a ${proveedor?.nombre ?? 'este proveedor'} ` +
        `por ${formatearPesos(this.total())}. El stock se suma cuando marques la compra como recibida.`,
      textoConfirmar: 'Crear compra',
      textoCancelar: 'Seguir editando',
      tipo: 'info',
    })
    if (!confirmado) return

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
        await this.alertaService.exito(`Compra #${creada.id} a ${proveedor?.nombre ?? 'proveedor'}.`, 'Compra creada')
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

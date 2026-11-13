import { OrdenMobile, OpcionOrden } from '../../../components/orden-mobile/orden-mobile';
import { PesosPipe } from '../../../pipes/pesos-pipe';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import Producto from '../../../models/Producto';
import { TIPOS_PRODUCTO, TipoProducto } from '../../../models/Enums';
import { ProductosService } from '../../../services/productos/productos-service';
import { AlertaService } from '../../../services/alerta/alerta-service';
import { FormatoEnumPipe } from '../../../pipes/formato-enum-pipe';
import { SkeletonLista } from '../../../components/skeleton-lista/skeleton-lista';
import { Paginacion } from '../../../components/paginacion/paginacion';
import { filtrosEnUrl, TablaServidor } from '../../../utils/tabla';

// Mismo límite que el panel "Stock bajo" del inicio
export const STOCK_BAJO = 3

@Component({
  imports: [RouterLink, FormatoEnumPipe, SkeletonLista, Paginacion, PesosPipe, OrdenMobile],
  selector: 'app-productos-list',
  styleUrl: './productos-list.css',
  templateUrl: './productos-list.html',
})
export class ProductosList {

  private productoService = inject(ProductosService)
  private alertaService = inject(AlertaService)
  private router = inject(Router)

  readonly tipos = TIPOS_PRODUCTO
  readonly stockBajo = STOCK_BAJO

  busqueda = signal('')
  filtroTipo = signal<TipoProducto | ''>('')
  soloStockBajo = signal(false)

  hayFiltros = computed(() => !!(this.busqueda() || this.filtroTipo() || this.soloStockBajo()))

  // Opciones del select "Ordenar por" que se ve en el celular
  readonly opcionesOrden: OpcionOrden[] = [
    { valor: 'nombre-asc', etiqueta: 'Nombre (A–Z)' },
    { valor: 'stock-asc', etiqueta: 'Menos stock primero' },
    { valor: 'stock-desc', etiqueta: 'Más stock primero' },
    { valor: 'precio-asc', etiqueta: 'Más baratos primero' },
    { valor: 'precio-desc', etiqueta: 'Más caros primero' },
  ]

  // En el celular los filtros (salvo el buscador) se esconden detrás de un botón
  filtrosAbiertos = signal(false)
  cantidadFiltros = computed(() => [this.filtroTipo(), this.soloStockBajo()].filter(Boolean).length)

  tabla = new TablaServidor({
    columnas: ['nombre', 'precio', 'stock'] as const,
    ordenInicial: 'nombre',
    ascendenteInicial: true,
    columnasTexto: ['nombre'],
    busqueda: this.busqueda,
    filtros: () => [this.filtroTipo(), this.soloStockBajo()],
    cargar: consulta => this.productoService.getPagina(consulta, {
      q: this.busqueda(),
      tipo: this.filtroTipo(),
      stockMaximo: this.soloStockBajo() ? STOCK_BAJO : null,
    }),
    alError: async (_, primeraCarga) => {
      await this.alertaService.error('No se pudieron cargar los productos')
      if (primeraCarga) this.router.navigate(['/'])
    },
  })

  constructor() {
    filtrosEnUrl({ q: this.busqueda, tipo: this.filtroTipo, bajo: this.soloStockBajo }, this.tabla)
  }

  rutaDe(producto: Producto) {
    return ['/productos', producto.tipoProducto?.toLowerCase(), producto.id]
  }

  abrir(producto: Producto) {
    this.router.navigate(this.rutaDe(producto))
  }

  cambiarFiltroTipo(valor: string) {
    this.filtroTipo.set(valor as TipoProducto | '')
  }

  limpiarFiltros() {
    this.busqueda.set('')
    this.filtroTipo.set('')
    this.soloStockBajo.set(false)
  }

}

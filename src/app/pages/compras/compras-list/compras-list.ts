import { OrdenMobile, OpcionOrden } from '../../../components/orden-mobile/orden-mobile';
import { PesosPipe } from '../../../pipes/pesos-pipe';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormatoEnumPipe } from '../../../pipes/formato-enum-pipe';
import { EstadoCompra, ESTADOS_COMPRA } from '../../../models/Enums';
import Compra from '../../../models/Compra';
import { ComprasService } from '../../../services/compras/compras-service';
import { AlertaService } from '../../../services/alerta/alerta-service';
import { SkeletonLista } from '../../../components/skeleton-lista/skeleton-lista';
import { Paginacion } from '../../../components/paginacion/paginacion';
import { filtrosEnUrl, TablaServidor } from '../../../utils/tabla';

@Component({
  imports: [SkeletonLista, Paginacion, RouterLink, DatePipe, FormatoEnumPipe, PesosPipe, OrdenMobile],
  selector: 'app-compras-list',
  styleUrls: ['./compras-list.css', '../estados-compra.css'],
  templateUrl: './compras-list.html',
})
export class ComprasList {

  private comprasService = inject(ComprasService)
  private alertaService = inject(AlertaService)
  private router = inject(Router)

  estadosCompra = ESTADOS_COMPRA

  busqueda = signal('')
  filtroEstado = signal<EstadoCompra | ''>('')
  mostrarCanceladas = signal(false)

  // Opciones del select "Ordenar por" que se ve en el celular
  readonly opcionesOrden: OpcionOrden[] = [
    { valor: 'id-desc', etiqueta: 'Más nuevas primero' },
    { valor: 'id-asc', etiqueta: 'Más viejas primero' },
    { valor: 'total-desc', etiqueta: 'Mayor total' },
    { valor: 'proveedor-asc', etiqueta: 'Proveedor (A–Z)' },
  ]

  // En el celular los filtros (salvo el buscador) se esconden detrás de un botón
  filtrosAbiertos = signal(false)
  cantidadFiltros = computed(() => [this.filtroEstado(), this.mostrarCanceladas()].filter(Boolean).length)

  tabla = new TablaServidor({
    columnas: ['id', 'fecha', 'proveedor', 'total'] as const,
    ordenInicial: 'id',
    columnasTexto: ['proveedor'],
    busqueda: this.busqueda,
    filtros: () => [this.filtroEstado(), this.mostrarCanceladas()],
    // Busca por proveedor, producto o número (ej: "distribuidora", "proplan" o "12")
    cargar: consulta => this.comprasService.getPagina(consulta, {
      q: this.busqueda(),
      estado: this.filtroEstado(),
      canceladas: this.mostrarCanceladas(),
    }),
    alError: async (_, primeraCarga) => {
      await this.alertaService.error('No se pudieron cargar las compras')
      if (primeraCarga) this.router.navigate(['/'])
    },
  })

  // Lo que falta recibir de lo que se está viendo, de todas las páginas
  totalPendiente = computed(() => this.tabla.respuesta()?.totalPendiente ?? 0)

  hayFiltros = computed(() => !!(this.busqueda() || this.filtroEstado() || this.mostrarCanceladas()))

  constructor() {
    filtrosEnUrl({ q: this.busqueda, estado: this.filtroEstado, canceladas: this.mostrarCanceladas }, this.tabla)
  }

  nombresProductos(compra: Compra): string {
    return compra.detalleResponseDTO.map(d => d.nombreProducto).join(', ')
  }

  unidades(compra: Compra): number {
    return compra.detalleResponseDTO.reduce((suma, d) => suma + d.cantidad, 0)
  }

  abrir(compra: Compra) {
    this.router.navigate(['/compras', compra.id])
  }

  cambiarFiltroEstado(valor: string) {
    this.filtroEstado.set(valor as EstadoCompra | '')
  }

  limpiarFiltros() {
    this.busqueda.set('')
    this.filtroEstado.set('')
    this.mostrarCanceladas.set(false)
  }

}

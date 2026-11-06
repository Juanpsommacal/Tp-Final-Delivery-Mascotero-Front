import { OrdenMobile, OpcionOrden } from '../../../components/orden-mobile/orden-mobile';
import { PesosPipe } from '../../../pipes/pesos-pipe';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormatoEnumPipe } from '../../../pipes/formato-enum-pipe';
import { EstadoCompra, ESTADOS_COMPRA } from '../../../models/Enums';
import Compra from '../../../models/Compra';
import { ComprasService } from '../../../services/compras/compras-service';
import { AlertaService } from '../../../services/alerta/alerta-service';
import { coincideBusqueda } from '../../../utils/busqueda-util';
import { SkeletonLista } from '../../../components/skeleton-lista/skeleton-lista';
import { Paginacion } from '../../../components/paginacion/paginacion';
import { filtrosEnUrl, TablaOrdenable } from '../../../utils/tabla';

@Component({
  imports: [SkeletonLista, Paginacion, RouterLink, DatePipe, FormatoEnumPipe, PesosPipe, OrdenMobile],
  selector: 'app-compras-list',
  styleUrls: ['./compras-list.css', '../estados-compra.css'],
  templateUrl: './compras-list.html',
})
export class ComprasList implements OnInit {

  private comprasService = inject(ComprasService)
  private alertaService = inject(AlertaService)
  private router = inject(Router)

  estadosCompra = ESTADOS_COMPRA

  compras = signal<Compra[]>([])
  cargando = signal(true)
  busqueda = signal('')
  filtroEstado = signal<EstadoCompra | ''>('')
  mostrarCanceladas = signal(false)

  // Busca por proveedor, producto o número (ej: "distribuidora", "proplan" o "12")
  comprasFiltradas = computed(() => {
    const texto = this.busqueda()
    const estado = this.filtroEstado()
    // Las canceladas se ocultan salvo que se prenda el switch o se filtre justo por "Cancelada"
    const verCanceladas = this.mostrarCanceladas() || estado === 'CANCELADA'

    return this.compras().filter(compra =>
      (verCanceladas || compra.estadoCompra !== 'CANCELADA') &&
      (!estado || compra.estadoCompra === estado) &&
      coincideBusqueda(`${compra.nombreProveedor} ${this.nombresProductos(compra)} ${compra.id}`, texto)
    )
  })

  // Lo que falta recibir de lo que se está viendo
  totalPendiente = computed(() =>
    this.comprasFiltradas()
      .filter(c => c.estadoCompra === 'PENDIENTE')
      .reduce((suma, c) => suma + c.montoTotal, 0)
  )

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

  tabla = new TablaOrdenable({
    filas: this.comprasFiltradas,
    columnas: {
      id: (c: Compra) => c.id,
      fecha: (c: Compra) => c.fecha,
      proveedor: (c: Compra) => c.nombreProveedor.toLowerCase(),
      total: (c: Compra) => c.montoTotal,
    },
    ordenInicial: 'id',
    columnasTexto: ['proveedor'],
    reiniciarPaginaCon: () => [this.busqueda(), this.filtroEstado(), this.mostrarCanceladas()],
  })

  constructor() {
    filtrosEnUrl({ q: this.busqueda, estado: this.filtroEstado, canceladas: this.mostrarCanceladas }, this.tabla)
  }

  ngOnInit(): void {
    this.comprasService.getAllCompras().subscribe({
      next: (data) => {
        this.compras.set(data)
        this.cargando.set(false)
      },
      error: async () => {
        this.cargando.set(false)
        await this.alertaService.error('No se pudieron cargar las compras')
        this.router.navigate(['/'])
      }
    })
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

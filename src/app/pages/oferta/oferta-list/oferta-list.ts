import { OrdenMobile, OpcionOrden } from '../../../components/orden-mobile/orden-mobile';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { OfertasService } from '../../../services/ofertas/ofertas-service';
import { Oferta } from '../../../models/Oferta';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { formatearPorcentajeVisual } from '../../../utils/oferta-util';
import { getFechaLocalISO } from '../../../utils/fecha-util';
import { SkeletonLista } from '../../../components/skeleton-lista/skeleton-lista';
import { Paginacion } from '../../../components/paginacion/paginacion';
import { filtrosEnUrl, TablaOrdenable } from '../../../utils/tabla';
import { AlertaService } from '../../../services/alerta/alerta-service';

export type FiltroEstadoOferta = 'TODAS' | 'VIGENTES' | 'PROXIMAS' | 'FINALIZADAS';

export interface EstadoOfertaInfo {
  codigo: 'VIGENTE' | 'PROXIMA' | 'FINALIZADA';
  clase: string;
  etiqueta: string;
}

@Component({
  imports: [RouterLink, DatePipe, SkeletonLista, Paginacion, OrdenMobile],
  selector: 'app-oferta-list',
  styleUrl: './oferta-list.css',
  templateUrl: './oferta-list.html',
})
export class OfertaList implements OnInit {
  private ofertasService = inject(OfertasService);
  private alertaService = inject(AlertaService);
  private router = inject(Router);

  readonly porcentajeVisual = formatearPorcentajeVisual;

  ofertas = signal<Oferta[]>([]);
  cargando = signal(true);
  busqueda = signal('');
  filtroEstado = signal<FiltroEstadoOferta>('TODAS');

  obtenerEstadoOferta(oferta: Oferta): EstadoOfertaInfo {
    if (!oferta.fechaInicio || !oferta.fechaFin) {
      return { codigo: 'FINALIZADA', clase: 'estado-finalizada', etiqueta: 'Sin fecha' };
    }

    const hoyStr = getFechaLocalISO();
    const inicioStr =
      typeof oferta.fechaInicio === 'string'
        ? oferta.fechaInicio.slice(0, 10)
        : getFechaLocalISO(new Date(oferta.fechaInicio));
    const finStr =
      typeof oferta.fechaFin === 'string'
        ? oferta.fechaFin.slice(0, 10)
        : getFechaLocalISO(new Date(oferta.fechaFin));

    if (hoyStr < inicioStr) {
      return { codigo: 'PROXIMA', clase: 'estado-proxima', etiqueta: 'Próxima' };
    } else if (hoyStr > finStr) {
      return { codigo: 'FINALIZADA', clase: 'estado-finalizada', etiqueta: 'Finalizada' };
    } else {
      return { codigo: 'VIGENTE', clase: 'estado-vigente', etiqueta: 'Vigente' };
    }
  }

  ofertasFiltradas = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const estado = this.filtroEstado();

    return this.ofertas().filter((o) => {
      const coincideTexto =
        !texto ||
        o.nombre.toLowerCase().includes(texto) ||
        (o.descripcion && o.descripcion.toLowerCase().includes(texto));

      if (!coincideTexto) return false;

      if (estado === 'TODAS') return true;
      const estadoInfo = this.obtenerEstadoOferta(o);
      if (estado === 'VIGENTES') return estadoInfo.codigo === 'VIGENTE';
      if (estado === 'PROXIMAS') return estadoInfo.codigo === 'PROXIMA';
      if (estado === 'FINALIZADAS') return estadoInfo.codigo === 'FINALIZADA';
      return true;
    });
  });

  // Opciones del select "Ordenar por" que se ve en el celular
  readonly opcionesOrden: OpcionOrden[] = [
    { valor: 'inicio-desc', etiqueta: 'Más nuevas primero' },
    { valor: 'fin-asc', etiqueta: 'Terminan antes' },
    { valor: 'descuento-desc', etiqueta: 'Mayor descuento' },
    { valor: 'nombre-asc', etiqueta: 'Nombre (A–Z)' },
  ]

  tabla = new TablaOrdenable({
    filas: this.ofertasFiltradas,
    columnas: {
      nombre: (o: Oferta) => o.nombre.toLowerCase(),
      descuento: (o: Oferta) => o.porcentaje,
      inicio: (o: Oferta) => this.fechaISO(o.fechaInicio),
      fin: (o: Oferta) => this.fechaISO(o.fechaFin),
    },
    ordenInicial: 'inicio',
    columnasTexto: ['nombre'],
    reiniciarPaginaCon: () => [this.busqueda(), this.filtroEstado()],
  });

  constructor() {
    filtrosEnUrl({ q: this.busqueda, estado: this.filtroEstado as any }, this.tabla);
  }

  private fechaISO(fecha: string | Date): string {
    return typeof fecha === 'string' ? fecha.slice(0, 10) : getFechaLocalISO(new Date(fecha));
  }

  cantidadProductos(oferta: Oferta): number {
    if (oferta.productos) return oferta.productos.length;
    return Array.isArray(oferta.productosIds) ? oferta.productosIds.length : 0;
  }

  abrir(oferta: Oferta) {
    this.router.navigate(['/ofertas', oferta.id]);
  }

  conteos = computed(() => {
    const lista = this.ofertas();
    let vigentes = 0;
    let proximas = 0;
    let finalizadas = 0;

    for (const o of lista) {
      const e = this.obtenerEstadoOferta(o);
      if (e.codigo === 'VIGENTE') vigentes++;
      else if (e.codigo === 'PROXIMA') proximas++;
      else if (e.codigo === 'FINALIZADA') finalizadas++;
    }

    return {
      todas: lista.length,
      vigentes,
      proximas,
      finalizadas,
    };
  });

  ngOnInit(): void {
    this.obtenerOfertas();
  }

  obtenerOfertas(): void {
    this.cargando.set(true);
    this.ofertasService.getAllOfertas().subscribe({
      next: (respuesta) => {
        this.ofertas.set(respuesta);
        this.cargando.set(false);
      },
      error: (error) => {
        console.error('Error al obtener las ofertas:', error);
        this.cargando.set(false);
        this.alertaService.error('No se pudieron cargar las ofertas');
      },
    });
  }

  cambiarBusqueda(texto: string): void {
    this.busqueda.set(texto);
  }

  cambiarFiltro(estado: FiltroEstadoOferta): void {
    this.filtroEstado.set(estado);
  }

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.filtroEstado.set('TODAS');
  }
}

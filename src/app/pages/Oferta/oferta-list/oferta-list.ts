import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { OfertasService } from '../../../services/Ofertas/ofertas-service';
import { Oferta } from '../../../models/Oferta';
import { RouterLink } from '@angular/router';
import { DatePipe, NgClass } from '@angular/common';
import { formatearPorcentajeVisual } from '../../../utils/oferta-util';
import { getFechaLocalISO } from '../../../utils/fecha-util';

export type FiltroEstadoOferta = 'TODAS' | 'VIGENTES' | 'PROXIMAS' | 'FINALIZADAS';

export interface EstadoOfertaInfo {
  codigo: 'VIGENTE' | 'PROXIMA' | 'FINALIZADA';
  clase: string;
  etiqueta: string;
}

@Component({
  imports: [RouterLink, DatePipe, NgClass],
  selector: 'app-oferta-list',
  styleUrl: './oferta-list.css',
  templateUrl: './oferta-list.html',
})
export class OfertaList implements OnInit {
  private ofertasService = inject(OfertasService);

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
      },
    });
  }

  cambiarBusqueda(texto: string): void {
    this.busqueda.set(texto);
  }

  cambiarFiltro(estado: FiltroEstadoOferta): void {
    this.filtroEstado.set(estado);
  }
}

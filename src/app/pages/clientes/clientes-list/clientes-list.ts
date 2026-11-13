import { OrdenMobile, OpcionOrden } from '../../../components/orden-mobile/orden-mobile';
import { PesosPipe } from '../../../pipes/pesos-pipe';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import Cliente from '../../../models/Cliente';
import { ClientesService } from '../../../services/clientes/clientes-service';
import { AlertaService } from '../../../services/alerta/alerta-service';
import { extraerMensajeError } from '../../../utils/error-util';
import { SkeletonLista } from '../../../components/skeleton-lista/skeleton-lista';
import { Paginacion } from '../../../components/paginacion/paginacion';
import { filtrosEnUrl, TablaServidor } from '../../../utils/tabla';
import { formatearTelefono, normalizarTelefono } from '../../../utils/whatsapp-util';

@Component({
  imports: [RouterLink, DatePipe, SkeletonLista, Paginacion, PesosPipe, OrdenMobile],
  selector: 'app-clientes-list',
  styleUrl: './clientes-list.css',
  templateUrl: './clientes-list.html',
})
export class ClientesList {

  private clienteService = inject(ClientesService)
  private alertaService = inject(AlertaService)
  private router = inject(Router)

  busqueda = signal('')
  soloConDeuda = signal(false)

  hayFiltros = computed(() => !!this.busqueda() || this.soloConDeuda())

  // Opciones del select "Ordenar por" que se ve en el celular
  readonly opcionesOrden: OpcionOrden[] = [
    { valor: 'nombre-asc', etiqueta: 'Apellido (A–Z)' },
    { valor: 'ultimo-desc', etiqueta: 'Pidieron hace poco' },
    { valor: 'ultimo-asc', etiqueta: 'Hace más que no piden' },
    { valor: 'deuda-desc', etiqueta: 'Deben más' },
    { valor: 'pedidos-desc', etiqueta: 'Más pedidos' },
  ]

  tabla = new TablaServidor({
    columnas: ['nombre', 'pedidos', 'ultimo', 'deuda'] as const,
    ordenInicial: 'nombre',
    ascendenteInicial: true,
    columnasTexto: ['nombre'],
    busqueda: this.busqueda,
    filtros: () => this.soloConDeuda(),
    cargar: consulta => this.clienteService.getPagina(consulta, this.busqueda(), this.soloConDeuda()),
    alError: async (error, primeraCarga) => {
      await this.alertaService.error(extraerMensajeError(error))
      if (primeraCarga) this.router.navigate(['/'])
    },
  })

  constructor() {
    filtrosEnUrl({ q: this.busqueda, deuda: this.soloConDeuda }, this.tabla)
  }

  // "Hoy", "Ayer", "Hace 5 días"... para ver de un vistazo quién hace mucho que no pide
  haceCuanto(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-').map(Number)
    const hoy = new Date()
    const dias = Math.round(
      (new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime() - new Date(anio, mes - 1, dia).getTime()) / 86_400_000
    )
    if (dias <= 0) return 'Hoy'
    if (dias === 1) return 'Ayer'
    if (dias < 30) return `Hace ${dias} días`
    const meses = Math.floor(dias / 30)
    return meses === 1 ? 'Hace 1 mes' : `Hace ${meses} meses`
  }

  // 2235550001 -> +54 9 223 555-0001; si no se puede armar, se muestra como está cargado
  telefonoVisible(telefono: string): string {
    const normalizado = normalizarTelefono(telefono)
    return normalizado ? formatearTelefono(normalizado) : telefono
  }

  abrir(cliente: Cliente) {
    this.router.navigate(['/clientes', cliente.id])
  }

  limpiarFiltros() {
    this.busqueda.set('')
    this.soloConDeuda.set(false)
  }

}

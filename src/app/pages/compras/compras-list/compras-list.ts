import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormatoEnumPipe } from '../../../pipes/formato-enum-pipe';
import { EstadoCompra, ESTADOS_COMPRA } from '../../../models/Enums';
import Compra from '../../../models/Compra';
import { ComprasService } from '../../../services/compras/compras-service';
import { AlertaService } from '../../../services/alerta/alerta-service';
import { coincideBusqueda } from '../../../utils/busqueda-util';

@Component({
  imports: [RouterLink, CurrencyPipe, DatePipe, FormatoEnumPipe],
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
  busqueda = signal('')
  filtroEstado = signal<EstadoCompra | ''>('')
  mostrarCanceladas = signal(false)

  // Busca por proveedor o por cualquier producto de la compra (ej: "distribuidora" o "proplan")
  comprasFiltradas = computed(() => {
    const texto = this.busqueda()
    const estado = this.filtroEstado()
    // Las canceladas se ocultan salvo que se prenda el switch o se filtre justo por "Cancelada"
    const verCanceladas = this.mostrarCanceladas() || estado === 'CANCELADA'

    return this.compras()
      .filter(compra =>
        (verCanceladas || compra.estadoCompra !== 'CANCELADA') &&
        (!estado || compra.estadoCompra === estado) &&
        coincideBusqueda(`${compra.nombreProveedor} ${this.nombresProductos(compra)}`, texto)
      )
      // Las mas nuevas primero
      .sort((a, b) => b.id - a.id)
  })

  ngOnInit(): void {
    this.comprasService.getAllCompras().subscribe({
      next: (data) => this.compras.set(data),
      error: async () => {
        await this.alertaService.error('No se pudieron cargar las compras')
        this.router.navigate(['/'])
      }
    })
  }

  nombresProductos(compra: Compra): string {
    return compra.detalleResponseDTO.map(d => d.nombreProducto).join(', ')
  }

  cambiarFiltroEstado(valor: string) {
    this.filtroEstado.set(valor as EstadoCompra | '')
  }

}

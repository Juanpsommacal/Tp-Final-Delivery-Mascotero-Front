import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormatoEnumPipe } from '../../../pipes/formato-enum-pipe';
import { MetodoPago, METODOS_PAGO } from '../../../models/Enums';
import Pago from '../../../models/Pago';
import { PagosService } from '../../../services/Pagos/pagos-service';
import { AlertaService } from '../../../services/Alerta/alerta-service';
import { coincideBusqueda } from '../../../utils/busqueda-util';

// Solo listado: los pagos se registran desde el detalle del pedido y no se editan ni se borran
@Component({
  imports: [RouterLink, CurrencyPipe, DatePipe, FormatoEnumPipe],
  selector: 'app-pagos-list',
  styleUrl: './pagos-list.css',
  templateUrl: './pagos-list.html',
})
export class PagosList implements OnInit {

  private pagosService = inject(PagosService)
  private alertaService = inject(AlertaService)
  private router = inject(Router)

  metodosPago = METODOS_PAGO

  pagos = signal<Pago[]>([])
  busqueda = signal('')
  filtroMetodo = signal<MetodoPago | ''>('')

  // Busca por cliente o por numero de pedido (ej: "perez" o "12")
  pagosFiltrados = computed(() => {
    const texto = this.busqueda()
    const metodo = this.filtroMetodo()

    return this.pagos()
      .filter(pago =>
        (!metodo || pago.metodoPago === metodo) &&
        coincideBusqueda(`${pago.nombreCliente} ${pago.pedidoId}`, texto)
      )
      // Los mas nuevos primero
      .sort((a, b) => b.id - a.id)
  })

  totalFiltrado = computed(() =>
    Math.round(this.pagosFiltrados().reduce((suma, pago) => suma + pago.monto, 0) * 100) / 100
  )

  ngOnInit(): void {
    this.pagosService.getAllPagos().subscribe({
      next: (data) => this.pagos.set(data),
      error: async () => {
        await this.alertaService.error('No se pudieron cargar los pagos')
        this.router.navigate(['/'])
      }
    })
  }

  cambiarFiltroMetodo(valor: string) {
    this.filtroMetodo.set(valor as MetodoPago | '')
  }

}

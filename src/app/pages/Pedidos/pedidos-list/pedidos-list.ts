import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormatoEnumPipe } from '../../../pipes/formato-enum-pipe';
import { EstadoPago, EstadoPedido, ESTADOS_PAGO, ESTADOS_PEDIDO } from '../../../models/Enums';
import Pedido from '../../../models/Pedido';
import { PedidosService } from '../../../services/Pedidos/pedidos-service';
import { AlertaService } from '../../../services/Alerta/alerta-service';
import { coincideBusqueda } from '../../../utils/busqueda-util';

@Component({
  imports: [RouterLink, CurrencyPipe, DatePipe, FormatoEnumPipe],
  selector: 'app-pedidos-list',
  styleUrls: ['./pedidos-list.css', '../estados-pedido.css'],
  templateUrl: './pedidos-list.html',
})
export class PedidosList implements OnInit {

  private pedidosService = inject(PedidosService)
  private alertaService = inject(AlertaService)
  private router = inject(Router)

  estadosPedido = ESTADOS_PEDIDO
  // PEDIDO_CANCELADO no es un estado de pago real: el back lo pone cuando se cancela el pedido
  estadosPago = ESTADOS_PAGO.filter(estado => estado !== 'PEDIDO_CANCELADO')

  pedidos = signal<Pedido[]>([])
  busqueda = signal('')
  filtroEstado = signal<EstadoPedido | ''>('')
  filtroPago = signal<EstadoPago | ''>('')
  mostrarCancelados = signal(false)

  // Busca por cliente o por direccion (ej: "perez", "luro 1234" o "perez luro")
  pedidosFiltrados = computed(() => {
    const texto = this.busqueda()
    const estado = this.filtroEstado()
    const pago = this.filtroPago()
    // Los cancelados se ocultan salvo que se prenda el switch o se filtre justo por "Cancelado"
    const verCancelados = this.mostrarCancelados() || estado === 'CANCELADO'

    return this.pedidos()
      .filter(pedido =>
        (verCancelados || pedido.estadoPedido !== 'CANCELADO') &&
        (!estado || pedido.estadoPedido === estado) &&
        (!pago || pedido.estadoPago === pago) &&
        coincideBusqueda(`${pedido.nombreCliente} ${pedido.direccionCompleta}`, texto)
      )
      // Los mas nuevos primero
      .sort((a, b) => b.id - a.id)
  })

  ngOnInit(): void {
    this.pedidosService.getAllPedidos().subscribe({
      next: (data) => this.pedidos.set(data),
      error: async () => {
        await this.alertaService.error('No se pudieron cargar los pedidos')
        this.router.navigate(['/'])
      }
    })
  }

  cambiarFiltroEstado(valor: string) {
    this.filtroEstado.set(valor as EstadoPedido | '')
  }

  cambiarFiltroPago(valor: string) {
    this.filtroPago.set(valor as EstadoPago | '')
  }

}

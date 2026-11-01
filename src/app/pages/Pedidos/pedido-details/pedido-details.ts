import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormatoEnumPipe } from '../../../pipes/formato-enum-pipe';
import Pedido from '../../../models/Pedido';
import { EstadoPago } from '../../../models/Enums';
import { PedidosService } from '../../../services/Pedidos/pedidos-service';
import { ConfirmacionService } from '../../../services/Confirmacion/confirmacion-service';
import { AlertaService } from '../../../services/Alerta/alerta-service';
import { extraerMensajeError } from '../../../utils/error-util';

// Estados de pago en los que todavia falta cobrar algo
const PAGOS_CON_SALDO: EstadoPago[] = ['PENDIENTE', 'DEUDA', 'DEUDA_PARCIAL']

@Component({
  imports: [RouterLink, CurrencyPipe, DatePipe, FormatoEnumPipe],
  selector: 'app-pedido-details',
  styleUrls: ['./pedido-details.css', '../estados-pedido.css'],
  templateUrl: './pedido-details.html',
})
export class PedidoDetails implements OnInit {

  private pedidosService = inject(PedidosService)
  private confirmacionService = inject(ConfirmacionService)
  private alertaService = inject(AlertaService)
  private route = inject(ActivatedRoute)
  private router = inject(Router)

  pedido = signal<Pedido | null>(null)
  procesando = signal(false)

  totalPagado = computed(() =>
    this.pedido()?.pagos.reduce((suma, pago) => suma + pago.monto, 0) ?? 0
  )

  saldo = computed(() => (this.pedido()?.montoTotal ?? 0) - this.totalPagado())

  // Mismas reglas que PedidoService en el back, para no mostrar botones que van a fallar
  puedeEntregar = computed(() => this.pedido()?.estadoPedido === 'PENDIENTE')

  puedeCancelar = computed(() =>
    this.pedido()?.estadoPedido === 'PENDIENTE' && this.pedido()?.estadoPago === 'PENDIENTE'
  )

  puedeRegistrarPago = computed(() => {
    const pedido = this.pedido()
    return !!pedido && pedido.estadoPedido !== 'CANCELADO' && PAGOS_CON_SALDO.includes(pedido.estadoPago)
  })

  ngOnInit(): void {
    const id = this.route.snapshot.params['id']

    if (!id) {
      this.router.navigate(['/pedidos'])
      return
    }

    this.pedidosService.getPedidoById(id).subscribe({
      next: (data) => this.pedido.set(data),
      error: async (error) => {
        await this.alertaService.error(extraerMensajeError(error))
        this.router.navigate(['/pedidos'])
      }
    })
  }

  async entregar() {
    const pedido = this.pedido()
    if (!pedido) return

    const confirmado = await this.confirmacionService.confirmar({
      titulo: 'Entregar pedido',
      mensaje: `¿Confirmás que el pedido #${pedido.id} fue entregado?`,
      textoConfirmar: 'Marcar como entregado',
      tipo: 'info'
    })
    if (!confirmado) return

    this.procesando.set(true)
    this.pedidosService.entregarPedido(pedido.id).subscribe({
      next: (actualizado) => {
        this.pedido.set(actualizado)
        this.procesando.set(false)
        this.alertaService.exito(`Pedido #${pedido.id} marcado como entregado`)
      },
      error: (error) => {
        this.procesando.set(false)
        this.alertaService.error(extraerMensajeError(error))
      }
    })
  }

  async cancelar() {
    const pedido = this.pedido()
    if (!pedido) return

    const confirmado = await this.confirmacionService.confirmar({
      titulo: 'Cancelar pedido',
      mensaje: `¿Desea cancelar el pedido #${pedido.id}? El stock de los productos se va a devolver.`,
      textoConfirmar: 'Cancelar pedido',
      textoCancelar: 'Volver',
      tipo: 'peligro'
    })
    if (!confirmado) return

    this.procesando.set(true)
    // El DELETE no devuelve el pedido, asi que se vuelve a pedir para ver el estado nuevo
    this.pedidosService.cancelarPedido(pedido.id).subscribe({
      next: () => {
        this.pedidosService.getPedidoById(pedido.id).subscribe(actualizado => this.pedido.set(actualizado))
        this.procesando.set(false)
        this.alertaService.exito(`Pedido #${pedido.id} cancelado`)
      },
      error: (error) => {
        this.procesando.set(false)
        this.alertaService.error(extraerMensajeError(error))
      }
    })
  }

  // TODO: conectar con el CRUD de pagos (POST /api/pagos) cuando este hecho
  registrarPago() {
    this.alertaService.info('El registro de pagos todavia no esta disponible')
  }

}

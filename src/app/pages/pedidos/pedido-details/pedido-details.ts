import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormatoEnumPipe } from '../../../pipes/formato-enum-pipe';
import Pedido from '../../../models/Pedido';
import { EstadoPago, MetodoPago, METODOS_PAGO } from '../../../models/Enums';
import { PedidosService } from '../../../services/pedidos/pedidos-service';
import { PagosService } from '../../../services/pagos/pagos-service';
import { ConfirmacionService } from '../../../services/confirmacion/confirmacion-service';
import { AlertaService } from '../../../services/alerta/alerta-service';
import { extraerMensajeError } from '../../../utils/error-util';
import { digitos } from '../../../validators/producto-validators';

// Estados de pago en los que todavia falta cobrar algo
const PAGOS_CON_SALDO: EstadoPago[] = ['PENDIENTE', 'DEUDA', 'DEUDA_PARCIAL']

// Redondea a centavos, para que sumas como 0.1 + 0.2 no dejen saldos de 0.0000001
function redondear(valor: number): number {
  return Math.round(valor * 100) / 100
}

@Component({
  imports: [RouterLink, CurrencyPipe, DatePipe, FormatoEnumPipe, ReactiveFormsModule],
  selector: 'app-pedido-details',
  styleUrls: ['./pedido-details.css', '../estados-pedido.css'],
  templateUrl: './pedido-details.html',
})
export class PedidoDetails implements OnInit {

  private pedidosService = inject(PedidosService)
  private pagosService = inject(PagosService)
  private confirmacionService = inject(ConfirmacionService)
  private alertaService = inject(AlertaService)
  private route = inject(ActivatedRoute)
  private router = inject(Router)
  private fb = inject(FormBuilder)

  metodosPago = METODOS_PAGO

  pedido = signal<Pedido | null>(null)
  procesando = signal(false)

  totalPagado = computed(() =>
    redondear(this.pedido()?.pagos.reduce((suma, pago) => suma + pago.monto, 0) ?? 0)
  )

  saldo = computed(() => redondear((this.pedido()?.montoTotal ?? 0) - this.totalPagado()))

  // Mismas reglas que PedidoService en el back, para no mostrar botones que van a fallar
  puedeEntregar = computed(() => this.pedido()?.estadoPedido === 'PENDIENTE')

  // Un pedido con pagos adelantados sigue en PENDIENTE, pero el back no deja cancelarlo
  puedeCancelar = computed(() =>
    this.pedido()?.estadoPedido === 'PENDIENTE'
    && this.pedido()?.estadoPago === 'PENDIENTE'
    && this.pedido()?.pagos.length === 0
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

  ///----- Registrar pago -----

  mostrarModalPago = signal(false)
  guardandoPago = signal(false)
  mensajePago = signal('')

  formularioPago = this.fb.group({
    // Igual que PagoCreateRequestDTO, mas el tope del saldo que valida PagoService
    monto: [null as number | null, [Validators.required, Validators.min(0.01), digitos(7, 2), this.noSuperaSaldo()]],
    metodoPago: [null as MetodoPago | null, Validators.required],
  })

  private valoresPago = toSignal(this.formularioPago.valueChanges, { initialValue: this.formularioPago.value })

  // Como queda el pedido despues de este pago, con la misma regla que actualizarEstadoPago del back
  estadoDespuesDelPago = computed<EstadoPago | null>(() => {
    const pedido = this.pedido()
    const monto = Number(this.valoresPago().monto)
    if (!pedido || !monto || monto <= 0 || monto > this.saldo()) return null

    if (redondear(this.totalPagado() + monto) >= pedido.montoTotal) return 'PAGADO'
    return pedido.estadoPedido === 'ENTREGADO' ? 'DEUDA_PARCIAL' : 'PENDIENTE'
  })

  private mensajesPago: Record<string, Record<string, string>> = {
    'monto': {
      required: 'El monto no puede estar vacio',
      min: 'El monto tiene que ser mayor a 0',
      digitos: 'Maximo 7 digitos enteros y 2 decimales',
      superaSaldo: 'El monto no puede superar el saldo del pedido',
    },
    'metodoPago': { required: 'Elegí el método de pago' },
  }

  private noSuperaSaldo() {
    return (control: AbstractControl): ValidationErrors | null =>
      control.value != null && Number(control.value) > this.saldo() ? { superaSaldo: true } : null
  }

  mensajeErrorPago(campo: string): string | null {
    const control = this.formularioPago.get(campo)
    if (!control?.touched || !control.errors) return null

    const error = Object.keys(control.errors)[0]
    return this.mensajesPago[campo]?.[error] ?? 'Valor invalido'
  }

  // Arranca con el saldo completo; si el cliente paga menos se cambia el monto
  registrarPago() {
    this.formularioPago.reset({ monto: this.saldo(), metodoPago: null })
    this.mensajePago.set('')
    this.mostrarModalPago.set(true)
  }

  cerrarModalPago() {
    if (this.guardandoPago()) return
    this.mostrarModalPago.set(false)
  }

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    if (this.mostrarModalPago()) this.cerrarModalPago()
  }

  guardarPago() {
    const pedido = this.pedido()
    if (!pedido) return

    if (this.formularioPago.invalid) {
      this.formularioPago.markAllAsTouched()
      return
    }

    const valores = this.formularioPago.getRawValue()
    this.guardandoPago.set(true)
    this.mensajePago.set('')

    this.pagosService.createPago({ pedidoId: pedido.id, monto: Number(valores.monto), metodoPago: valores.metodoPago! }).subscribe({
      next: () => {
        // Se vuelve a pedir el pedido para ver el pago nuevo y el estado que calculo el back
        this.pedidosService.getPedidoById(pedido.id).subscribe(actualizado => this.pedido.set(actualizado))
        this.guardandoPago.set(false)
        this.mostrarModalPago.set(false)
        this.alertaService.exito('Pago registrado correctamente')
      },
      error: (error) => {
        this.mensajePago.set(extraerMensajeError(error))
        this.guardandoPago.set(false)
      }
    })
  }

}

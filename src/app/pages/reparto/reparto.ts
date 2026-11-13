import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import Pedido from '../../models/Pedido';
import { PedidosService } from '../../services/pedidos/pedidos-service';
import { AlertaService } from '../../services/alerta/alerta-service';
import { ConfirmacionService } from '../../services/confirmacion/confirmacion-service';
import { PesosPipe } from '../../pipes/pesos-pipe';
import { Icono } from '../../components/icono/icono';
import { ModalWhatsapp } from '../../components/modal-whatsapp/modal-whatsapp';
import { ModalProgramarEntrega } from '../../components/modal-programar-entrega/modal-programar-entrega';
import { CIUDAD_REPARTO, PUNTO_LLEGADA, PUNTO_SALIDA } from '../../config/negocio';
import { extraerMensajeError } from '../../utils/error-util';
import { getFechaLocalISO } from '../../utils/fecha-util';
import { saldoDe } from '../../utils/pedido-utils';
import { linksRecorrido } from '../../utils/recorrido-util';
import { normalizarTelefono } from '../../utils/whatsapp-util';

// La lista para salir a repartir: qué se entrega, en qué orden y qué hay que cargar
@Component({
  imports: [DatePipe, RouterLink, PesosPipe, Icono, ModalWhatsapp, ModalProgramarEntrega],
  selector: 'app-reparto',
  styleUrl: './reparto.css',
  templateUrl: './reparto.html',
})
export class Reparto implements OnInit {

  private pedidosService = inject(PedidosService)
  private alertaService = inject(AlertaService)
  private confirmacionService = inject(ConfirmacionService)

  readonly hoy = getFechaLocalISO()
  readonly manana = getFechaLocalISO(new Date(Date.now() + 86_400_000))
  readonly salida = PUNTO_SALIDA
  readonly llegada = PUNTO_LLEGADA

  fecha = signal(this.hoy)
  pedidos = signal<Pedido[]>([])
  cargando = signal(true)
  error = signal(false)
  procesando = signal(false)
  pedidoWhatsapp = signal<Pedido | null>(null)
  pedidoReprogramar = signal<Pedido | null>(null)

  // Para descartar la respuesta de un día anterior si se cambia de fecha rápido
  private consulta = 0

  totalACobrar = computed(() => this.pedidos().reduce((suma, pedido) => suma + Math.max(0, saldoDe(pedido)), 0))

  mercaderia = computed(() => {
    const porProducto = new Map<string, number>()
    for (const pedido of this.pedidos()) {
      for (const detalle of pedido.detallePedido) {
        porProducto.set(detalle.nombreProducto, (porProducto.get(detalle.nombreProducto) ?? 0) + detalle.cantidad)
      }
    }
    return [...porProducto].map(([nombre, cantidad]) => ({ nombre, cantidad })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  })

  unidades = computed(() => this.mercaderia().reduce((suma, item) => suma + item.cantidad, 0))

  recorrido = computed(() => linksRecorrido({
    origen: PUNTO_SALIDA,
    destino: PUNTO_LLEGADA,
    paradas: this.pedidos().map(pedido => pedido.direccionCompleta),
    ciudad: CIUDAD_REPARTO,
  }))

  ngOnInit(): void {
    this.cargar()
  }

  cargar() {
    const numero = ++this.consulta
    this.cargando.set(true)
    this.error.set(false)
    this.pedidosService.getReparto(this.fecha()).subscribe({
      next: (pedidos) => {
        if (numero !== this.consulta) return
        this.pedidos.set(pedidos)
        this.cargando.set(false)
      },
      error: () => {
        if (numero !== this.consulta) return
        this.error.set(true)
        this.cargando.set(false)
      }
    })
  }

  cambiarFecha(valor: string) {
    if (!valor || valor === this.fecha()) return
    this.fecha.set(valor)
    this.cargar()
  }

  saldo(pedido: Pedido): number {
    return saldoDe(pedido)
  }

  esAtrasado(pedido: Pedido): boolean {
    return !!pedido.fechaEntrega && pedido.fechaEntrega < this.hoy
  }

  telefonoLink(pedido: Pedido): string | null {
    const numero = normalizarTelefono(pedido.telefonoCliente)
    return numero ? `tel:+${numero}` : null
  }

  pisoDepto(pedido: Pedido): string | null {
    return pedido.pisoDepto && pedido.pisoDepto !== 'Sin especificar' ? pedido.pisoDepto : null
  }

  // Se ve al instante; si el back rechaza el cambio se vuelve a lo que hay guardado
  mover(indice: number, delta: number) {
    const lista = [...this.pedidos()]
    const destino = indice + delta
    if (destino < 0 || destino >= lista.length) return

    ;[lista[indice], lista[destino]] = [lista[destino], lista[indice]]
    this.pedidos.set(lista)
    this.pedidosService.guardarOrdenReparto(lista.map(pedido => pedido.id)).subscribe({
      error: (error) => {
        this.alertaService.error(extraerMensajeError(error))
        this.cargar()
      }
    })
  }

  async entregar(pedido: Pedido) {
    const confirmado = await this.confirmacionService.confirmar({
      titulo: 'Entregar pedido',
      mensaje: `¿Confirmás que el pedido #${pedido.id} de ${pedido.nombreCliente} fue entregado?`,
      textoConfirmar: 'Marcar como entregado',
      tipo: 'info'
    })
    if (!confirmado) return

    this.procesando.set(true)
    this.pedidosService.entregarPedido(pedido.id).subscribe({
      next: () => {
        this.procesando.set(false)
        this.pedidos.update(lista => lista.filter(p => p.id !== pedido.id))
        this.alertaService.exito(`Pedido #${pedido.id} entregado`)
      },
      error: (error) => {
        this.procesando.set(false)
        this.alertaService.error(extraerMensajeError(error))
      }
    })
  }

  alReprogramar() {
    this.pedidoReprogramar.set(null)
    this.cargar()
  }

  alRegistrarRecordatorio(actualizado: Pedido) {
    this.pedidos.update(lista => lista.map(p => p.id === actualizado.id ? actualizado : p))
  }
}

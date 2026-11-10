import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import Pedido from '../../models/Pedido';
import { PedidosService } from '../../services/pedidos/pedidos-service';
import { AlertaService } from '../../services/alerta/alerta-service';
import { ModalFoco } from '../../utils/modal-foco';
import { CerrarAlFondo } from '../../utils/cerrar-al-fondo';
import { Icono } from '../icono/icono';
import {
  formatearTelefono,
  haceCuanto,
  linkWhatsapp,
  mensajePara,
  normalizarTelefono,
  PlantillaWhatsapp,
  saldoPedido,
} from '../../utils/whatsapp-util';

/**
 * Vista previa del mensaje antes de abrir WhatsApp. El mensaje se puede editar;
 * recién con "Abrir WhatsApp" se abre el chat (wa.me) y el usuario lo manda desde ahí.
 */
@Component({
  imports: [DatePipe, RouterLink, ModalFoco, CerrarAlFondo, Icono],
  selector: 'app-modal-whatsapp',
  styleUrl: './modal-whatsapp.css',
  templateUrl: './modal-whatsapp.html',
  host: { '(document:keydown.escape)': 'cerrar.emit()' },
})
export class ModalWhatsapp implements OnInit {

  private pedidosService = inject(PedidosService)
  private alertaService = inject(AlertaService)

  pedido = input.required<Pedido>()
  // undefined: todavía se está buscando el cliente. null o vacío: no tiene teléfono cargado
  telefono = input<string | null | undefined>(undefined)
  plantillaInicial = input<PlantillaWhatsapp>('detalle')

  cerrar = output<void>()
  // Se emite con el pedido actualizado cuando se registra un recordatorio de saldo
  recordatorioRegistrado = output<Pedido>()

  plantilla = signal<PlantillaWhatsapp>('detalle')
  mensaje = signal('')

  tieneSaldo = computed(() => {
    const p = this.pedido()
    return p.estadoPedido !== 'CANCELADO' && saldoPedido(p) > 0
  })

  telefonoNormalizado = computed(() => normalizarTelefono(this.telefono()))
  telefonoVisible = computed(() => {
    const normalizado = this.telefonoNormalizado()
    return normalizado ? formatearTelefono(normalizado) : null
  })

  link = computed(() => {
    const numero = this.telefonoNormalizado()
    return numero && this.mensaje().trim() ? linkWhatsapp(numero, this.mensaje()) : null
  })

  ultimoRecordatorio = computed(() => this.pedido().ultimoRecordatorio)
  haceCuantoRecordatorio = computed(() => {
    const fecha = this.ultimoRecordatorio()
    return fecha ? haceCuanto(fecha) : null
  })

  ngOnInit(): void {
    const inicial = this.plantillaInicial() === 'saldo' && this.tieneSaldo() ? 'saldo' : 'detalle'
    this.elegirPlantilla(inicial)
  }

  elegirPlantilla(plantilla: PlantillaWhatsapp) {
    this.plantilla.set(plantilla)
    this.mensaje.set(mensajePara(plantilla, this.pedido()))
  }

  restaurarMensaje() {
    this.mensaje.set(mensajePara(this.plantilla(), this.pedido()))
  }

  // El link abre WhatsApp solo (target _blank); acá se registra el recordatorio y se cierra el modal
  alAbrirWhatsapp() {
    if (this.plantilla() === 'saldo') {
      this.pedidosService.registrarRecordatorio(this.pedido().id).subscribe({
        next: (actualizado) => {
          this.recordatorioRegistrado.emit(actualizado)
          this.alertaService.exito('Se guardó la fecha del recordatorio.', 'WhatsApp abierto')
        },
        // Si no se pudo guardar la fecha, el mensaje igual se abrió: solo se avisa
        error: () => this.alertaService.advertencia('Se abrió WhatsApp, pero no se pudo guardar la fecha del recordatorio.'),
      })
    }
    this.cerrar.emit()
  }
}

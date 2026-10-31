import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ConfirmacionService,
  TipoConfirmacion,
} from '../../services/Confirmacion/confirmacion-service';

@Component({
  imports: [CommonModule],
  selector: 'app-modal-confirmacion',
  styleUrl: './modal-confirmacion.css',
  templateUrl: './modal-confirmacion.html',
})
export class ModalConfirmacion {
  protected confirmacionService = inject(ConfirmacionService);

  // Inputs para uso directo en plantillas
  @Input() visible = false;
  @Input() titulo = 'Confirmar acción';
  @Input() mensaje = '';
  @Input() textoConfirmar = 'Confirmar';
  @Input() textoCancelar = 'Cancelar';
  @Input() tipo: TipoConfirmacion = 'peligro';
  @Input() icono?: string;

  // Outputs para uso directo en plantillas
  @Output() confirmar = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();

  // Determina si el modal está visible (sea por input directo o por el servicio global)
  estaVisible = computed(() => {
    return this.visible || this.confirmacionService.estado() !== null;
  });

  // Datos actuales (del servicio si está activo, o de los inputs directos)
  datosModal = computed(() => {
    const estadoServicio = this.confirmacionService.estado();
    if (estadoServicio) {
      return {
        titulo: estadoServicio.titulo,
        mensaje: estadoServicio.mensaje,
        textoConfirmar: estadoServicio.textoConfirmar,
        textoCancelar: estadoServicio.textoCancelar,
        tipo: estadoServicio.tipo,
        icono: estadoServicio.icono ?? this.iconoPorTipo(estadoServicio.tipo),
        esServicio: true,
      };
    }

    return {
      titulo: this.titulo,
      mensaje: this.mensaje,
      textoConfirmar: this.textoConfirmar,
      textoCancelar: this.textoCancelar,
      tipo: this.tipo,
      icono: this.icono ?? this.iconoPorTipo(this.tipo),
      esServicio: false,
    };
  });

  private iconoPorTipo(tipo?: TipoConfirmacion): string {
    switch (tipo) {
      case 'peligro':
        return '🗑️';
      case 'advertencia':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '❓';
    }
  }

  alConfirmar(): void {
    if (this.confirmacionService.estado()) {
      this.confirmacionService.responder(true);
    } else {
      this.confirmar.emit();
    }
  }

  alCancelar(): void {
    if (this.confirmacionService.estado()) {
      this.confirmacionService.responder(false);
    } else {
      this.cancelar.emit();
    }
  }

  @HostListener('document:keydown.escape')
  alPresionarEscape(): void {
    if (this.estaVisible()) {
      this.alCancelar();
    }
  }
}


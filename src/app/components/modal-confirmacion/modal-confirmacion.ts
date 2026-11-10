import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  computed,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import {
  ConfirmacionService,
  TipoConfirmacion,
} from '../../services/confirmacion/confirmacion-service';
import { Icono, NombreIcono } from '../icono/icono';
import { atraparFoco } from '../../utils/foco-util';
import { CerrarAlFondo } from '../../utils/cerrar-al-fondo';

@Component({
  imports: [Icono, CerrarAlFondo],
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
  @Input() icono?: NombreIcono;

  // Outputs para uso directo en plantillas
  @Output() confirmar = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();

  private tarjeta = viewChild<ElementRef<HTMLElement>>('tarjeta');
  private botonCancelar = viewChild<ElementRef<HTMLButtonElement>>('botonCancelar');
  private botonConfirmar = viewChild<ElementRef<HTMLButtonElement>>('botonConfirmar');
  // Elemento que tenía el foco antes de abrir: se le devuelve al cerrar
  private focoPrevio: HTMLElement | null = null;

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

  constructor() {
    // Al abrir: el foco entra al modal. En acciones peligrosas arranca en "Cancelar"
    effect(() => {
      const botonCancelar = this.botonCancelar();
      const botonConfirmar = this.botonConfirmar();
      if (botonCancelar && botonConfirmar) {
        this.focoPrevio ??= document.activeElement as HTMLElement | null;
        const destino = this.datosModal().tipo === 'peligro' ? botonCancelar : botonConfirmar;
        destino.nativeElement.focus();
      } else if (this.focoPrevio) {
        this.focoPrevio.focus?.();
        this.focoPrevio = null;
      }
    });
  }

  private iconoPorTipo(tipo?: TipoConfirmacion): NombreIcono {
    switch (tipo) {
      case 'peligro':
        return 'basura';
      case 'advertencia':
        return 'alerta';
      case 'info':
        return 'info';
      default:
        return 'pregunta';
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

  alTeclear(evento: KeyboardEvent): void {
    const tarjeta = this.tarjeta()?.nativeElement;
    if (tarjeta) atraparFoco(evento, tarjeta);
  }

  @HostListener('document:keydown.escape')
  alPresionarEscape(): void {
    if (this.estaVisible()) {
      this.alCancelar();
    }
  }
}

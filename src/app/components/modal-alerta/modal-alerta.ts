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
import { AlertaService, TipoAlerta } from '../../services/alerta/alerta-service';
import { Icono, NombreIcono } from '../icono/icono';
import { atraparFoco } from '../../utils/foco-util';

@Component({
  imports: [Icono],
  selector: 'app-modal-alerta',
  styleUrl: './modal-alerta.css',
  templateUrl: './modal-alerta.html',
})
export class ModalAlerta {
  protected alertaService = inject(AlertaService);

  // Inputs para uso directo en plantillas
  @Input() visible = false;
  @Input() titulo = 'Aviso';
  @Input() mensaje = '';
  @Input() tipo: TipoAlerta = 'info';
  @Input() textoBoton = 'Aceptar';
  @Input() icono?: NombreIcono;

  // Outputs para uso directo en plantillas
  @Output() cerrar = new EventEmitter<void>();

  private tarjeta = viewChild<ElementRef<HTMLElement>>('tarjeta');
  private botonAceptar = viewChild<ElementRef<HTMLButtonElement>>('botonAceptar');
  // Elemento que tenía el foco antes de abrir: se le devuelve al cerrar
  private focoPrevio: HTMLElement | null = null;

  estaVisible = computed(() => {
    return this.visible || this.alertaService.estado() !== null;
  });

  datosModal = computed(() => {
    const estadoServicio = this.alertaService.estado();
    if (estadoServicio) {
      return {
        titulo: estadoServicio.titulo ?? 'Aviso',
        mensaje: estadoServicio.mensaje,
        tipo: estadoServicio.tipo ?? 'info',
        textoBoton: estadoServicio.textoBoton ?? 'Aceptar',
        icono: estadoServicio.icono ?? this.iconoPorTipo(estadoServicio.tipo),
        esServicio: true,
      };
    }

    return {
      titulo: this.titulo,
      mensaje: this.mensaje,
      tipo: this.tipo,
      textoBoton: this.textoBoton,
      icono: this.icono ?? this.iconoPorTipo(this.tipo),
      esServicio: false,
    };
  });

  constructor() {
    // El foco entra al botón al abrir y vuelve a donde estaba al cerrar
    effect(() => {
      const boton = this.botonAceptar();
      if (boton) {
        this.focoPrevio ??= document.activeElement as HTMLElement | null;
        boton.nativeElement.focus();
      } else if (this.focoPrevio) {
        this.focoPrevio.focus?.();
        this.focoPrevio = null;
      }
    });
  }

  private iconoPorTipo(tipo?: TipoAlerta): NombreIcono {
    switch (tipo) {
      case 'exito':
        return 'check';
      case 'error':
        return 'error';
      case 'advertencia':
        return 'alerta';
      case 'info':
      default:
        return 'info';
    }
  }

  alCerrar(): void {
    if (this.alertaService.estado()) {
      this.alertaService.cerrar();
    } else {
      this.cerrar.emit();
    }
  }

  alTeclear(evento: KeyboardEvent): void {
    const tarjeta = this.tarjeta()?.nativeElement;
    if (tarjeta) atraparFoco(evento, tarjeta);
  }

  @HostListener('document:keydown.escape')
  alPresionarEscape(): void {
    if (this.estaVisible()) {
      this.alCerrar();
    } else if (this.alertaService.aviso()) {
      this.alertaService.cerrarAviso();
    }
  }
}

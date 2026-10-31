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
import { AlertaService, TipoAlerta } from '../../services/Alerta/alerta-service';

@Component({
  imports: [CommonModule],
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
  @Input() icono?: string;

  // Outputs para uso directo en plantillas
  @Output() cerrar = new EventEmitter<void>();

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

  private iconoPorTipo(tipo?: TipoAlerta): string {
    switch (tipo) {
      case 'exito':
        return '✅';
      case 'error':
        return '❌';
      case 'advertencia':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  }

  alCerrar(): void {
    if (this.alertaService.estado()) {
      this.alertaService.cerrar();
    } else {
      this.cerrar.emit();
    }
  }

  @HostListener('document:keydown.escape')
  @HostListener('document:keydown.enter')
  alPresionarTecla(): void {
    if (this.estaVisible()) {
      this.alCerrar();
    }
  }
}


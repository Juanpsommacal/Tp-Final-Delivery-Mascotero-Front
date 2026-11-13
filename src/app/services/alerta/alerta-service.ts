import { NombreIcono } from '../../components/icono/icono';
import { Injectable, signal } from '@angular/core';

export type TipoAlerta = 'exito' | 'error' | 'advertencia' | 'info';

export interface AlertaOpciones {
  titulo?: string;
  mensaje: string;
  tipo?: TipoAlerta;
  textoBoton?: string;
  icono?: NombreIcono;
}

export interface AlertaActiva extends AlertaOpciones {
  resolver: () => void;
}

export interface Aviso {
  id: number;
  titulo: string;
  mensaje: string;
}

// Lo que dura en pantalla un aviso de éxito antes de irse solo
const DURACION_AVISO_MS = 4000;

@Injectable({
  providedIn: 'root',
})
export class AlertaService {
  private estadoModal = signal<AlertaActiva | null>(null);

  readonly estado = this.estadoModal.asReadonly();

  // Los éxitos no frenan al usuario: se muestran como aviso que se va solo
  private avisoActual = signal<Aviso | null>(null);
  readonly aviso = this.avisoActual.asReadonly();
  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private proximoId = 1;

  /**
   * Muestra un modal de alerta con un mensaje personalizado.
   * Retorna una Promise que se resuelve cuando el usuario cierra o acepta el modal.
   */
  mostrar(opciones: string | AlertaOpciones): Promise<void> {
    const config: AlertaOpciones =
      typeof opciones === 'string' ? { mensaje: opciones } : opciones;

    const tipoFinal = config.tipo ?? this.inferirTipo(config.mensaje);
    const tituloFinal = config.titulo ?? this.tituloPorDefecto(tipoFinal);

    if (tipoFinal === 'exito') {
      this.mostrarAviso(tituloFinal, config.mensaje);
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.estadoModal.set({
        titulo: tituloFinal,
        mensaje: config.mensaje,
        tipo: tipoFinal,
        textoBoton: config.textoBoton ?? 'Aceptar',
        icono: config.icono,
        resolver: resolve,
      });
    });
  }

  exito(mensaje: string, titulo?: string): Promise<void> {
    return this.mostrar({ mensaje, titulo: titulo ?? 'Listo', tipo: 'exito' });
  }

  error(mensaje: string, titulo?: string): Promise<void> {
    return this.mostrar({ mensaje, titulo: titulo ?? 'Error', tipo: 'error' });
  }

  info(mensaje: string, titulo?: string): Promise<void> {
    return this.mostrar({ mensaje, titulo: titulo ?? 'Información', tipo: 'info' });
  }

  advertencia(mensaje: string, titulo?: string): Promise<void> {
    return this.mostrar({ mensaje, titulo: titulo ?? 'Atención', tipo: 'advertencia' });
  }

  cerrarAviso(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = null;
    this.avisoActual.set(null);
  }

  private mostrarAviso(titulo: string, mensaje: string): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.avisoActual.set({ id: this.proximoId++, titulo, mensaje });
    this.temporizador = setTimeout(() => this.cerrarAviso(), DURACION_AVISO_MS);
  }

  cerrar(): void {
    const actual = this.estadoModal();
    if (actual) {
      actual.resolver();
      this.estadoModal.set(null);
    }
  }

  private inferirTipo(mensaje: string): TipoAlerta {
    const min = mensaje.toLowerCase();
    if (
      min.includes('error') ||
      min.includes('no se pudo') ||
      min.includes('falló') ||
      min.includes('invalido') ||
      min.includes('inválido')
    ) {
      return 'error';
    }
    if (
      min.includes('correctamente') ||
      min.includes('éxito') ||
      min.includes('creado') ||
      min.includes('actualizado') ||
      min.includes('eliminado') ||
      min.includes('desasociado') ||
      min.includes('guardado')
    ) {
      return 'exito';
    }
    return 'info';
  }

  private tituloPorDefecto(tipo: TipoAlerta): string {
    switch (tipo) {
      case 'exito':
        return 'Listo';
      case 'error':
        return 'Algo salió mal';
      case 'advertencia':
        return 'Atención';
      case 'info':
      default:
        return 'Aviso';
    }
  }
}


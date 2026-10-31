import { Injectable, signal } from '@angular/core';

export type TipoAlerta = 'exito' | 'error' | 'advertencia' | 'info';

export interface AlertaOpciones {
  titulo?: string;
  mensaje: string;
  tipo?: TipoAlerta;
  textoBoton?: string;
  icono?: string;
}

export interface AlertaActiva extends AlertaOpciones {
  resolver: () => void;
}

@Injectable({
  providedIn: 'root',
})
export class AlertaService {
  private estadoModal = signal<AlertaActiva | null>(null);

  readonly estado = this.estadoModal.asReadonly();

  /**
   * Muestra un modal de alerta con un mensaje personalizado.
   * Retorna una Promise que se resuelve cuando el usuario cierra o acepta el modal.
   */
  mostrar(opciones: string | AlertaOpciones): Promise<void> {
    const config: AlertaOpciones =
      typeof opciones === 'string' ? { mensaje: opciones } : opciones;

    const tipoFinal = config.tipo ?? this.inferirTipo(config.mensaje);
    const tituloFinal = config.titulo ?? this.tituloPorDefecto(tipoFinal);

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
    return this.mostrar({ mensaje, titulo: titulo ?? '¡Éxito!', tipo: 'exito' });
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
        return '¡Operación exitosa!';
      case 'error':
        return 'Ha ocurrido un error';
      case 'advertencia':
        return 'Atención';
      case 'info':
      default:
        return 'Aviso';
    }
  }
}


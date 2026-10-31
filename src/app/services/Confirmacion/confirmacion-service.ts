import { Injectable, signal } from '@angular/core';

export type TipoConfirmacion = 'peligro' | 'advertencia' | 'info';

export interface ConfirmacionOpciones {
  titulo?: string;
  mensaje: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  tipo?: TipoConfirmacion;
  icono?: string;
}

export interface ConfirmacionActiva extends ConfirmacionOpciones {
  resolver: (valor: boolean) => void;
}

@Injectable({
  providedIn: 'root',
})
export class ConfirmacionService {
  private estadoModal = signal<ConfirmacionActiva | null>(null);

  readonly estado = this.estadoModal.asReadonly();

  /**
   * Abre el modal de confirmación con un mensaje personalizado y retorna una Promesa
   * que se resuelve en `true` si el usuario confirma o `false` si cancela.
   */
  confirmar(opciones: string | ConfirmacionOpciones): Promise<boolean> {
    const config: ConfirmacionOpciones =
      typeof opciones === 'string' ? { mensaje: opciones } : opciones;

    return new Promise<boolean>((resolve) => {
      this.estadoModal.set({
        titulo: config.titulo ?? 'Confirmar acción',
        mensaje: config.mensaje,
        textoConfirmar: config.textoConfirmar ?? 'Confirmar',
        textoCancelar: config.textoCancelar ?? 'Cancelar',
        tipo: config.tipo ?? 'peligro',
        icono: config.icono,
        resolver: resolve,
      });
    });
  }

  /**
   * Resuelve la confirmación activa y cierra el modal.
   */
  responder(confirmado: boolean): void {
    const actual = this.estadoModal();
    if (actual) {
      actual.resolver(confirmado);
      this.estadoModal.set(null);
    }
  }
}


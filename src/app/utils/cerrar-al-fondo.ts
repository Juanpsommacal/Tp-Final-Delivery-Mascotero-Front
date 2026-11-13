import { Directive, output } from '@angular/core';

/**
 * Para el fondo oscuro de un modal: avisa que hay que cerrar solo si el click empezó y terminó en el fondo.
 * Si se aprieta adentro y se suelta afuera (por ejemplo, al seleccionar texto), el navegador igual
 * dispara el click sobre el fondo, y sin esto el modal se cerraría.
 *
 * Los handlers no devuelven nada a propósito: si un listener devuelve false, Angular cancela
 * la acción del navegador y los campos del modal dejan de tomar el foco.
 */
@Directive({
  selector: '[appCerrarAlFondo]',
  host: {
    '(pointerdown)': 'alApretar($event)',
    '(pointerup)': 'alSoltar($event)',
    '(click)': 'alClickear($event)',
  },
})
export class CerrarAlFondo {

  appCerrarAlFondo = output<void>()

  private empezoEnFondo = false
  private terminoEnFondo = false

  private esElFondo(evento: Event): boolean {
    return evento.target === evento.currentTarget
  }

  protected alApretar(evento: PointerEvent): void {
    this.empezoEnFondo = this.esElFondo(evento)
  }

  protected alSoltar(evento: PointerEvent): void {
    this.terminoEnFondo = this.esElFondo(evento)
  }

  protected alClickear(evento: MouseEvent): void {
    if (this.esElFondo(evento) && this.empezoEnFondo && this.terminoEnFondo) this.appCerrarAlFondo.emit()
  }
}

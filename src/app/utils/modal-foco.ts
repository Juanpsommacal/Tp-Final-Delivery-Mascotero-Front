import { afterNextRender, Directive, ElementRef, inject, OnDestroy } from '@angular/core';
import { atraparFoco } from './foco-util';

/**
 * Para modales armados a mano dentro de una página (pago, agregar producto a oferta).
 * Al aparecer lleva el foco adentro (al elemento con data-foco-inicial, o al primero enfocable),
 * no deja que el Tab se escape y al cerrarse devuelve el foco a donde estaba.
 */
@Directive({
  selector: '[appModalFoco]',
  host: { '(keydown)': 'alTeclear($event)' },
})
export class ModalFoco implements OnDestroy {

  private elemento = inject<ElementRef<HTMLElement>>(ElementRef)
  private focoPrevio = document.activeElement as HTMLElement | null

  constructor() {
    afterNextRender(() => {
      const contenedor = this.elemento.nativeElement
      const inicial = contenedor.querySelector<HTMLElement>('[data-foco-inicial]')
        ?? contenedor.querySelector<HTMLElement>('input, select, textarea, button')
      inicial?.focus()
    })
  }

  alTeclear(evento: KeyboardEvent) {
    atraparFoco(evento, this.elemento.nativeElement)
  }

  ngOnDestroy(): void {
    this.focoPrevio?.focus?.()
  }
}

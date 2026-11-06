import { Component, input } from '@angular/core';

export type NombreIcono = 'basura' | 'alerta' | 'info' | 'check' | 'error' | 'cerrar' | 'pregunta' | 'mensaje' | 'telefono' | 'mapa' | 'repetir'

// Íconos de trazo (estilo Lucide) dibujados en SVG, para no depender de emojis que cambian según el sistema
@Component({
  selector: 'app-icono',
  template: `
    <svg [attr.width]="tamano()" [attr.height]="tamano()" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
      @switch (nombre()) {
        @case ('basura') {
          <path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />
        }
        @case ('alerta') {
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4" /><path d="M12 17h.01" />
        }
        @case ('info') {
          <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
        }
        @case ('check') {
          <circle cx="12" cy="12" r="10" /><path d="m8 12 3 3 5-6" />
        }
        @case ('error') {
          <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />
        }
        @case ('mensaje') {
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" /><path d="M8 12h.01" /><path d="M12 12h.01" /><path d="M16 12h.01" />
        }
        @case ('telefono') {
          <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
        }
        @case ('mapa') {
          <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" />
        }
        @case ('repetir') {
          <path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" />
        }
        @case ('cerrar') {
          <path d="M18 6 6 18" /><path d="m6 6 12 12" />
        }
        @default {
          <circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" /><path d="M12 17h.01" />
        }
      }
    </svg>
  `,
  styles: `:host { display: inline-flex; line-height: 0; }`,
})
export class Icono {
  nombre = input<NombreIcono>('info')
  tamano = input(22)
}

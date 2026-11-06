import { Component, computed, input } from '@angular/core';

// Tarjetas o filas "fantasma" mientras carga un listado. Se anuncia una sola vez al lector de pantalla.
@Component({
  selector: 'app-skeleton-lista',
  template: `
    <div class="skeleton-lista" [class.modo-tabla]="modo() === 'tabla'" role="status" aria-live="polite">
      <span class="solo-lector">{{ texto() }}</span>
      @if (modo() === 'tabla') {
        @for (fila of filas(); track fila) {
          <div class="skeleton-fila" aria-hidden="true">
            <span class="skeleton skeleton-linea corta"></span>
            <span class="skeleton skeleton-linea"></span>
            <span class="skeleton skeleton-linea larga"></span>
            <span class="skeleton skeleton-linea corta"></span>
            <span class="skeleton skeleton-linea corta"></span>
          </div>
        }
      } @else {
        @for (fila of filas(); track fila) {
          <div class="skeleton-tarjeta" aria-hidden="true">
            <span class="skeleton skeleton-linea corta"></span>
            <span class="skeleton skeleton-titulo"></span>
            <span class="skeleton skeleton-linea larga"></span>
            <span class="skeleton skeleton-monto"></span>
            <span class="skeleton skeleton-boton"></span>
          </div>
        }
      }
    </div>
  `,
  styles: `
    .skeleton-lista {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 20px;
    }

    .skeleton-lista.modo-tabla {
      display: flex;
      flex-direction: column;
      gap: 0;
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .skeleton-fila {
      display: grid;
      grid-template-columns: 0.6fr 1fr 2fr 1fr 1fr;
      gap: 24px;
      align-items: center;
      padding: 16px 18px;
      border-bottom: 1px solid var(--color-border);
    }

    .skeleton-fila:last-child {
      border-bottom: none;
    }

    .skeleton-fila .skeleton-linea {
      width: 80%;
    }
  `,
})
export class SkeletonLista {
  cantidad = input(6)
  modo = input<'tarjetas' | 'tabla'>('tarjetas')
  texto = input('Cargando…')

  protected filas = computed(() => Array.from({ length: this.cantidad() }, (_, i) => i))
}

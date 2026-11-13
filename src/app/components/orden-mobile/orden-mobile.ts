import { Component, input, output } from '@angular/core';

export interface OpcionOrden {
  // "columna-asc" o "columna-desc"
  valor: string
  etiqueta: string
}

// En el celular los encabezados de la tabla no se ven: el orden se elige con este select
@Component({
  selector: 'app-orden-mobile',
  template: `
    <label class="orden-mobile">
      Ordenar por
      <select (change)="cambio.emit($any($event.target).value)">
        @for (opcion of opciones(); track opcion.valor) {
          <option [value]="opcion.valor" [selected]="opcion.valor === valor()">{{ opcion.etiqueta }}</option>
        }
      </select>
    </label>
  `,
  styles: `
    :host { display: none; }

    @media (max-width: 720px) {
      :host { display: block; margin-bottom: 12px; }
    }

    .orden-mobile {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--color-text-muted);
    }

    select {
      flex: 1;
      min-height: 44px;
      padding: 8px 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background-color: white;
      font: inherit;
      color: var(--color-text);
    }
  `,
})
export class OrdenMobile {
  valor = input.required<string>()
  opciones = input.required<OpcionOrden[]>()
  cambio = output<string>()
}

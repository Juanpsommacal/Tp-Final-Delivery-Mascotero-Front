import { Component, computed, input, model } from '@angular/core';
import { getFechaLocalISO } from '../../utils/fecha-util';

function inicioDeSemana(fecha: Date): Date {
  const dia = fecha.getDay() // 0 = domingo; la semana arranca el lunes
  const desdeLunes = dia === 0 ? 6 : dia - 1
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() - desdeLunes)
}

/**
 * Elegir un período: atajos (Hoy, Esta semana, Este mes, Todos) o un rango a mano.
 * Se aplica al instante, sin botón "Calcular". Mismo control en Pagos y en Métricas.
 */
@Component({
  selector: 'app-selector-periodo',
  template: `
    <fieldset class="selector-periodo">
      <legend>{{ titulo() }}</legend>
      <div class="rango">
        <input type="date" aria-label="Desde" [value]="desde()" [max]="hasta() || hoy"
               (change)="desde.set($any($event.target).value)" />
        <span class="separador" aria-hidden="true">a</span>
        <input type="date" aria-label="Hasta" [value]="hasta()" [min]="desde()" [max]="hoy"
               (change)="hasta.set($any($event.target).value)" />
      </div>
      <div class="atajos">
        <button type="button" class="atajo" [class.activo]="esHoy()" [attr.aria-pressed]="esHoy()" (click)="elegir(hoy, hoy)">Hoy</button>
        <button type="button" class="atajo" [class.activo]="esSemana()" [attr.aria-pressed]="esSemana()" (click)="elegir(inicioSemana, hoy)">Esta semana</button>
        <button type="button" class="atajo" [class.activo]="esMes()" [attr.aria-pressed]="esMes()" (click)="elegir(inicioMes, hoy)">Este mes</button>
        @if (conTodos()) {
          <button type="button" class="atajo" [class.activo]="esTodos()" [attr.aria-pressed]="esTodos()" (click)="elegir('', '')">Todos</button>
        }
      </div>
    </fieldset>
  `,
  styles: `
    .selector-periodo {
      min-width: 0;
      margin: 0;
      padding: 0;
      border: none;
    }

    legend {
      padding: 0;
      margin-bottom: 6px;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--color-text);
    }

    .rango {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .rango input {
      flex: 1;
      min-width: 0;
      padding: 10px 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background-color: white;
      font: inherit;
      font-size: 0.95rem;
    }

    .separador {
      font-size: 0.88rem;
      color: var(--color-text-muted);
    }

    .atajos {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }

    .atajo {
      padding: 4px 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-full);
      background-color: white;
      font: inherit;
      font-size: 0.84rem;
      font-weight: 600;
      color: var(--color-text-muted);
      cursor: pointer;
      transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
    }

    .atajo:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .atajo.activo {
      background-color: var(--color-primary);
      border-color: var(--color-primary);
      color: white;
    }

    @media (max-width: 720px) {
      .atajo {
        min-height: 44px;
        padding: 0 14px;
      }
    }
  `,
})
export class SelectorPeriodo {
  // Vacío = sin límite de ese lado
  desde = model('')
  hasta = model('')
  titulo = input('Fecha')
  conTodos = input(true)

  readonly hoy = getFechaLocalISO()
  readonly inicioSemana = getFechaLocalISO(inicioDeSemana(new Date()))
  readonly inicioMes = this.hoy.slice(0, 8) + '01'

  esHoy = computed(() => this.desde() === this.hoy && this.hasta() === this.hoy)
  esSemana = computed(() => !this.esHoy() && this.desde() === this.inicioSemana && this.hasta() === this.hoy)
  esMes = computed(() => !this.esHoy() && !this.esSemana() && this.desde() === this.inicioMes && this.hasta() === this.hoy)
  esTodos = computed(() => !this.desde() && !this.hasta())

  elegir(desde: string, hasta: string) {
    this.desde.set(desde)
    this.hasta.set(hasta)
  }
}

// "Hoy" / "Esta semana" / "Este mes" para los textos de la página que usa el selector
export function nombrePeriodo(desde: string, hasta: string): string | null {
  const hoy = getFechaLocalISO()
  if (hasta !== hoy) return null
  if (desde === hoy) return 'Hoy'
  if (desde === getFechaLocalISO(inicioDeSemana(new Date()))) return 'Esta semana'
  if (desde === hoy.slice(0, 8) + '01') return 'Este mes'
  return null
}

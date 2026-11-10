import { Component, computed, HostListener, inject, input, OnInit, output, signal } from '@angular/core';
import Pedido from '../../models/Pedido';
import { PedidosService } from '../../services/pedidos/pedidos-service';
import { AlertaService } from '../../services/alerta/alerta-service';
import { CerrarAlFondo } from '../../utils/cerrar-al-fondo';
import { ModalFoco } from '../../utils/modal-foco';
import { extraerMensajeError } from '../../utils/error-util';
import { getFechaLocalISO } from '../../utils/fecha-util';
import { Icono } from '../icono/icono';

// Elegir o cambiar el día de entrega pactado con el cliente
@Component({
  imports: [CerrarAlFondo, ModalFoco, Icono],
  selector: 'app-modal-programar-entrega',
  template: `
    <div class="fondo" (appCerrarAlFondo)="alCerrar()">
      <div class="tarjeta" role="dialog" aria-modal="true" aria-labelledby="titulo-programar" appModalFoco>
        <div class="cabecera">
          <div>
            <h2 id="titulo-programar">{{ yaProgramado() ? 'Cambiar fecha de entrega' : 'Programar entrega' }}</h2>
            <p>Pedido #{{ pedido().id }} · {{ pedido().nombreCliente }} · {{ pedido().direccionCompleta }}</p>
          </div>
          <button type="button" class="cerrar" aria-label="Cerrar" (click)="alCerrar()"><app-icono nombre="cerrar" [tamano]="18" /></button>
        </div>

        <form (submit)="$event.preventDefault(); guardar()" novalidate>
          <label>
            Día de entrega
            <input type="date" data-foco-inicial [min]="hoy" [value]="fecha()" (change)="fecha.set($any($event.target).value)" />
          </label>

          <div class="atajos">
            <button type="button" class="atajo" [class.activo]="fecha() === hoy" (click)="fecha.set(hoy)">Hoy</button>
            <button type="button" class="atajo" [class.activo]="fecha() === manana" (click)="fecha.set(manana)">Mañana</button>
          </div>

          <p class="error" role="alert">{{ error() }}</p>

          <div class="acciones">
            <button type="button" class="boton boton-secundario" (click)="alCerrar()">Cancelar</button>
            <button type="submit" class="boton" [disabled]="guardando()">{{ guardando() ? 'Guardando…' : 'Guardar fecha' }}</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: `
    .fondo {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background-color: rgba(14, 66, 80, 0.6);
      backdrop-filter: blur(4px);
    }

    .tarjeta {
      width: 100%;
      max-width: 420px;
      max-height: 92vh;
      overflow-y: auto;
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: 0 24px 50px rgba(0, 0, 0, 0.25);
    }

    .cabecera {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      padding: 22px 22px 14px;
      border-bottom: 1px solid var(--color-border);
    }

    h2 {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--color-primary);
    }

    .cabecera p {
      margin-top: 4px;
      font-size: 0.88rem;
      color: var(--color-text-muted);
    }

    .cerrar {
      flex-shrink: 0;
      min-width: 44px;
      min-height: 44px;
      margin: -8px -8px 0 0;
      border: none;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--color-text-muted);
      cursor: pointer;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 18px 22px 22px;
    }

    label {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.9rem;
      font-weight: 600;
    }

    input {
      padding: 10px 14px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background-color: white;
      font: inherit;
    }

    .atajos {
      display: flex;
      gap: 8px;
    }

    .atajo {
      min-height: 44px;
      padding: 0 16px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-full);
      background-color: white;
      font: inherit;
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--color-text-muted);
      cursor: pointer;
    }

    .atajo.activo {
      border-color: var(--color-primary);
      background-color: var(--color-primary);
      color: white;
    }

    .error {
      min-height: 1lh;
      color: var(--color-danger);
      font-size: 0.88rem;
    }

    .acciones {
      display: flex;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: 10px;
    }
  `,
})
export class ModalProgramarEntrega implements OnInit {

  private pedidosService = inject(PedidosService)
  private alertaService = inject(AlertaService)

  pedido = input.required<Pedido>()
  cerrar = output<void>()
  guardado = output<Pedido>()

  readonly hoy = getFechaLocalISO()
  readonly manana = getFechaLocalISO(new Date(Date.now() + 86_400_000))

  fecha = signal(this.hoy)
  guardando = signal(false)
  error = signal('')
  yaProgramado = computed(() => this.pedido().estadoPedido === 'PROGRAMADO')

  ngOnInit(): void {
    // Un pedido atrasado tiene una fecha que ya no se puede elegir
    const actual = this.pedido().fechaEntrega
    if (actual && actual >= this.hoy) this.fecha.set(actual)
  }

  @HostListener('window:keydown.escape')
  alCerrar() {
    if (!this.guardando()) this.cerrar.emit()
  }

  guardar() {
    if (!this.fecha() || this.fecha() < this.hoy) {
      this.error.set('Elegí hoy o un día futuro.')
      return
    }

    this.guardando.set(true)
    this.error.set('')
    this.pedidosService.programarEntrega(this.pedido().id, this.fecha()).subscribe({
      next: (actualizado) => {
        this.guardando.set(false)
        this.alertaService.exito(`Pedido #${actualizado.id} programado`)
        this.guardado.emit(actualizado)
      },
      error: (error) => {
        this.guardando.set(false)
        this.error.set(extraerMensajeError(error))
      }
    })
  }
}

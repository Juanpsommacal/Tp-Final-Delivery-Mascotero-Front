import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormatoEnumPipe } from '../../../pipes/formato-enum-pipe';
import Compra from '../../../models/Compra';
import { ComprasService } from '../../../services/Compras/compras-service';
import { ConfirmacionService } from '../../../services/Confirmacion/confirmacion-service';
import { AlertaService } from '../../../services/Alerta/alerta-service';
import { extraerMensajeError } from '../../../utils/error-util';
import { ProductosService } from '../../../services/productos/productos-service';

@Component({
  imports: [RouterLink, CurrencyPipe, DatePipe, FormatoEnumPipe],
  selector: 'app-compra-details',
  styleUrls: ['./compra-details.css', '../estados-compra.css'],
  templateUrl: './compra-details.html',
})
export class CompraDetails implements OnInit {

  private comprasService = inject(ComprasService)
  private productosService = inject(ProductosService)
  private confirmacionService = inject(ConfirmacionService)
  private alertaService = inject(AlertaService)
  private route = inject(ActivatedRoute)
  private router = inject(Router)

  compra = signal<Compra | null>(null)
  procesando = signal(false)

  // Stock actual de cada producto, para mostrar como queda al recibir la compra
  private stockActual = signal(new Map<number, number>())

  // Mismas reglas que CompraService en el back: recibir y cancelar solo con la compra pendiente
  pendiente = computed(() => this.compra()?.estadoCompra === 'PENDIENTE')

  ngOnInit(): void {
    const id = this.route.snapshot.params['id']

    if (!id) {
      this.router.navigate(['/compras'])
      return
    }

    this.cargarCompra(id)
  }

  private cargarCompra(id: string | number) {
    this.comprasService.getCompraById(id).subscribe({
      next: (data) => this.compra.set(data),
      error: async (error) => {
        await this.alertaService.error(extraerMensajeError(error))
        this.router.navigate(['/compras'])
      }
    })

    // Si falla, la compra se ve igual pero sin la columna de stock
    this.productosService.getAllProductos().subscribe({
      next: (productos) => this.stockActual.set(new Map(productos.map(p => [p.id!, p.stock]))),
      error: () => this.stockActual.set(new Map())
    })
  }

  stockDe(productoId: number): number | undefined {
    return this.stockActual().get(productoId)
  }

  async recibir() {
    const compra = this.compra()
    if (!compra) return

    const confirmado = await this.confirmacionService.confirmar({
      titulo: 'Recibir compra',
      mensaje: `¿Confirmás que llegó la mercadería de la compra #${compra.id}? Se va a sumar al stock de cada producto.`,
      textoConfirmar: 'Marcar como recibida',
      tipo: 'info'
    })
    if (!confirmado) return

    this.procesando.set(true)
    this.comprasService.recibirCompra(compra.id).subscribe({
      next: () => {
        this.procesando.set(false)
        // Se recarga tambien el stock, que ahora ya incluye esta compra
        this.cargarCompra(compra.id)
        this.alertaService.exito(`Compra #${compra.id} recibida. El stock se actualizó`)
      },
      error: (error) => {
        this.procesando.set(false)
        this.alertaService.error(extraerMensajeError(error))
      }
    })
  }

  async cancelar() {
    const compra = this.compra()
    if (!compra) return

    const confirmado = await this.confirmacionService.confirmar({
      titulo: 'Cancelar compra',
      mensaje: `¿Desea cancelar la compra #${compra.id} a ${compra.nombreProveedor}?`,
      textoConfirmar: 'Cancelar compra',
      textoCancelar: 'Volver',
      tipo: 'peligro'
    })
    if (!confirmado) return

    this.procesando.set(true)
    this.comprasService.cancelarCompra(compra.id).subscribe({
      next: (actualizada) => {
        this.compra.set(actualizada)
        this.procesando.set(false)
        this.alertaService.exito(`Compra #${compra.id} cancelada`)
      },
      error: (error) => {
        this.procesando.set(false)
        this.alertaService.error(extraerMensajeError(error))
      }
    })
  }

}

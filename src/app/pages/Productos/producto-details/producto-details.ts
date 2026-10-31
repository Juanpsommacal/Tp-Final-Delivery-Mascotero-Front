import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { ProductoDetalle, ProductosService } from '../../../services/Productos/productos-service';
import { ConfirmacionService } from '../../../services/Confirmacion/confirmacion-service';
import { AlertaService } from '../../../services/Alerta/alerta-service';
import { AuthService } from '../../../services/Authentication/auth-service';
import { TipoProducto, tipoDesdeRuta } from '../../../models/Enums';
import Alimento from '../../../models/Alimento';
import Antipulgas from '../../../models/Antipulgas';
import { FormatoEnumPipe } from '../../../pipes/formato-enum-pipe';
import { extraerMensajeError } from '../../../utils/error-util';

@Component({
  imports: [RouterLink, CurrencyPipe, FormatoEnumPipe],
  selector: 'app-producto-details',
  styleUrl: './producto-details.css',
  templateUrl: './producto-details.html',
})
export class ProductoDetails implements OnInit {

  private productosService = inject(ProductosService)
  private confirmacionService = inject(ConfirmacionService)
  private alertaService = inject(AlertaService)
  private auth = inject(AuthService)
  private route = inject(ActivatedRoute)
  private router = inject(Router)

  esAdmin = this.auth.tieneRol('ADMIN')

  tipo = signal<TipoProducto | null>(null)
  producto = signal<ProductoDetalle | null>(null)
  eliminando = signal(false)

  alimento = computed(() => this.tipo() === 'ALIMENTO' ? this.producto() as Alimento : null)
  antipulgas = computed(() => this.tipo() === 'ANTIPULGAS' ? this.producto() as Antipulgas : null)

  ngOnInit(): void {
    const parametros = this.route.snapshot.paramMap
    const tipo = tipoDesdeRuta(parametros.get('tipo'))
    const id = Number(parametros.get('id'))

    if (!tipo || !id) {
      this.router.navigate(['/productos'])
      return
    }

    this.tipo.set(tipo)
    this.productosService.getProductoById(tipo, id).subscribe({
      next: (data) => this.producto.set(data),
      error: async () => {
        await this.alertaService.error('No se pudo cargar el producto')
        this.router.navigate(['/productos'])
      }
    })
  }

  async eliminarProducto() {
    const producto = this.producto()
    const tipo = this.tipo()
    if (!producto?.id || !tipo) return

    const confirmado = await this.confirmacionService.confirmar({
      titulo: 'Eliminar producto',
      mensaje: `¿Seguro que querés eliminar "${producto.marca} ${producto.nombre}"?`,
      textoConfirmar: 'Eliminar',
      tipo: 'peligro'
    })
    if (!confirmado) return

    this.eliminando.set(true)
    this.productosService.deleteProducto(tipo, producto.id).subscribe({
      next: async () => {
        await this.alertaService.exito('Producto eliminado correctamente')
        this.router.navigate(['/productos'])
      },
      error: (error) => {
        this.alertaService.error(extraerMensajeError(error))
        this.eliminando.set(false)
      }
    })
  }
}

import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { OfertasService } from '../../../services/Ofertas/ofertas-service';
import { ProductosService } from '../../../services/Productos/productos-service';
import { ConfirmacionService } from '../../../services/Confirmacion/confirmacion-service';
import { AlertaService } from '../../../services/Alerta/alerta-service';
import { OfertaDetalle, ProductoEnOferta } from '../../../models/Oferta';
import Producto from '../../../models/Producto';
import { extraerMensajeError } from '../../../utils/error-util';
import { getFechaLocalISO } from '../../../utils/fecha-util';
import { formatearPorcentajeVisual } from '../../../utils/oferta-util';
import { FormatoEnumPipe } from '../../../pipes/formato-enum-pipe';

@Component({
  imports: [RouterLink, DatePipe, CurrencyPipe, NgClass, FormatoEnumPipe],
  selector: 'app-oferta-details',
  styleUrl: './oferta-details.css',
  templateUrl: './oferta-details.html',
})
export class OfertaDetails implements OnInit {
  private ofertasService = inject(OfertasService);
  private productosService = inject(ProductosService);
  private confirmacionService = inject(ConfirmacionService);
  private alertaService = inject(AlertaService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  oferta = signal<OfertaDetalle | null>(null);
  cargando = signal(true);
  eliminando = signal(false);
  desasociandoId = signal<number | null>(null);

  // Estado del modal para agregar nuevo producto a la oferta
  mostrarModalAgregar = signal(false);
  cargandoProductos = signal(false);
  productosCatalogo = signal<Producto[]>([]);
  busquedaModal = signal('');
  agregandoProductoId = signal<number | null>(null);

  porcentajeVisual = computed(() => formatearPorcentajeVisual(this.oferta()?.porcentaje));

  estadoOferta = computed(() => {
    const o = this.oferta();
    if (!o) return null;

    const hoyStr = getFechaLocalISO();
    const inicioStr =
      typeof o.fechaInicio === 'string'
        ? o.fechaInicio.slice(0, 10)
        : getFechaLocalISO(new Date(o.fechaInicio));
    const finStr =
      typeof o.fechaFin === 'string'
        ? o.fechaFin.slice(0, 10)
        : getFechaLocalISO(new Date(o.fechaFin));

    if (hoyStr < inicioStr) {
      return { clase: 'estado-proxima', etiqueta: 'Próxima a iniciar' };
    } else if (hoyStr > finStr) {
      return { clase: 'estado-finalizada', etiqueta: 'Finalizada' };
    } else {
      return { clase: 'estado-vigente', etiqueta: 'Vigente ahora' };
    }
  });

  // Productos no asociados a la oferta que coinciden con el texto de búsqueda
  productosDisponibles = computed(() => {
    const idsEnOferta = new Set(this.oferta()?.productos?.map((p) => p.id) ?? []);
    const texto = this.busquedaModal().trim().toLowerCase();

    return this.productosCatalogo().filter((p) => {
      if (!p.id || idsEnOferta.has(p.id)) return false;
      if (!texto) return true;
      return (
        p.nombre.toLowerCase().includes(texto) ||
        p.marca.toLowerCase().includes(texto)
      );
    });
  });

  // Total de productos en catálogo no presentes en la oferta
  totalNoAsociados = computed(() => {
    const idsEnOferta = new Set(this.oferta()?.productos?.map((p) => p.id) ?? []);
    return this.productosCatalogo().filter((p) => p.id && !idsEnOferta.has(p.id)).length;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/ofertas']);
      return;
    }

    this.cargarOferta(id);
  }

  cargarOferta(id: string | number, silencioso = false): void {
    if (!silencioso) {
      this.cargando.set(true);
    }
    this.ofertasService.getOfertaById(id).subscribe({
      next: (data) => {
        this.oferta.set(data);
        this.cargando.set(false);
      },
      error: async (error) => {
        console.error('Error al cargar la oferta:', error);
        await this.alertaService.error(`Error al cargar la oferta: ${extraerMensajeError(error)}`);
        this.router.navigate(['/ofertas']);
      },
    });
  }

  // --- Modal para agregar productos ---
  abrirModalAgregar(): void {
    this.busquedaModal.set('');
    this.mostrarModalAgregar.set(true);
    if (this.productosCatalogo().length === 0) {
      this.cargarCatalogoProductos();
    }
  }

  cerrarModalAgregar(): void {
    if (this.agregandoProductoId() !== null) return;
    this.mostrarModalAgregar.set(false);
    this.busquedaModal.set('');
  }

  cambiarBusquedaModal(texto: string): void {
    this.busquedaModal.set(texto);
  }

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    if (this.mostrarModalAgregar()) {
      this.cerrarModalAgregar();
    }
  }

  cargarCatalogoProductos(): void {
    this.cargandoProductos.set(true);
    this.productosService.getAllProductos().subscribe({
      next: (prods) => {
        this.productosCatalogo.set(prods);
        this.cargandoProductos.set(false);
      },
      error: (error) => {
        console.error('Error al cargar catálogo de productos:', error);
        this.alertaService.error('Error al cargar el catálogo de productos');
        this.cargandoProductos.set(false);
      },
    });
  }

  agregarProducto(producto: Producto): void {
    const o = this.oferta();
    if (!o?.id || !producto?.id) return;

    this.agregandoProductoId.set(producto.id);
    this.ofertasService.agregarProductoAOferta(o.id, producto.id).subscribe({
      next: () => {
        this.alertaService.exito(
          `Producto "${producto.marca} ${producto.nombre}" agregado correctamente a la oferta`
        );
        this.agregandoProductoId.set(null);
        this.cerrarModalAgregar();
        this.cargarOferta(o.id!, true);
      },
      error: (error) => {
        console.error('Error al agregar producto a la oferta:', error);
        this.alertaService.error(`Error al agregar producto: ${extraerMensajeError(error)}`);
        this.agregandoProductoId.set(null);
      },
    });
  }

  calcularPrecioConDescuento(precioOriginal: number): number {
    const porcentaje = this.oferta()?.porcentaje || 0;
    const factor = porcentaje > 1 ? porcentaje / 100 : porcentaje;
    const precio = precioOriginal * (1 - factor);
    return Math.max(0, Math.round(precio * 100) / 100);
  }

  // --- Desasociar producto existente ---
  async desasociarProducto(producto: ProductoEnOferta): Promise<void> {
    const o = this.oferta();
    if (!o?.id || !producto?.id) return;

    const confirmado = await this.confirmacionService.confirmar({
      titulo: 'Desasociar producto',
      mensaje: `¿Estás seguro de que deseas desasociar el producto "${producto.marcaYNombre}" de esta oferta?`,
      textoConfirmar: 'Desasociar',
      tipo: 'peligro',
    });
    if (!confirmado) return;

    this.desasociandoId.set(producto.id);
    this.ofertasService.removerProductoDeOferta(o.id, producto.id).subscribe({
      next: () => {
        this.alertaService.exito('Producto desasociado correctamente de la oferta');
        this.oferta.update((actual) => {
          if (!actual) return actual;
          return {
            ...actual,
            productos: actual.productos?.filter((p) => p.id !== producto.id) || [],
          };
        });
        this.desasociandoId.set(null);
      },
      error: (error) => {
        console.error('Error al desasociar producto:', error);
        this.alertaService.error(`Error al desasociar el producto: ${extraerMensajeError(error)}`);
        this.desasociandoId.set(null);
      },
    });
  }

  async eliminarOferta(): Promise<void> {
    const o = this.oferta();
    if (!o?.id) return;

    const confirmado = await this.confirmacionService.confirmar({
      titulo: 'Eliminar oferta',
      mensaje: `¿Estás seguro de que deseas eliminar la oferta "${o.nombre}"? Esta acción no se puede deshacer.`,
      textoConfirmar: 'Eliminar oferta',
      tipo: 'peligro',
    });
    if (!confirmado) return;

    this.eliminando.set(true);
    this.ofertasService.deleteOferta(o.id).subscribe({
      next: async () => {
        await this.alertaService.exito('Oferta eliminada correctamente');
        this.router.navigate(['/ofertas']);
      },
      error: (error) => {
        this.alertaService.error(`Error al eliminar oferta: ${extraerMensajeError(error)}`);
        this.eliminando.set(false);
      },
    });
  }

  volver(): void {
    this.router.navigate(['/ofertas']);
  }
}

import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { OfertasService } from '../../../services/Ofertas/ofertas-service';
import { AlertaService } from '../../../services/Alerta/alerta-service';
import { ProductosService } from '../../../services/Productos/productos-service';
import Producto from '../../../models/Producto';
import { OfertaRequest } from '../../../models/Oferta';
import { noVacio } from '../../../validators/producto-validators';
import { extraerMensajeError } from '../../../utils/error-util';
import {
  fechaFinPosterior,
  fechaNoAnteriorAHoy,
  getFechaLocalISO,
} from '../../../utils/fecha-util';
import { formatearPorcentajeVisual } from '../../../utils/oferta-util';

@Component({
  imports: [ReactiveFormsModule, CurrencyPipe],
  selector: 'app-ofertas-form',
  styleUrl: './ofertas-form.css',
  templateUrl: './ofertas-form.html',
})
export class OfertasForm implements OnInit {
  private fb = inject(FormBuilder);
  private ofertasService = inject(OfertasService);
  private alertaService = inject(AlertaService);
  private productosService = inject(ProductosService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly fechaMinimaHoy: string = getFechaLocalISO();

  id = signal<string | number | null>(null);
  cargando = signal(false);
  guardando = signal(false);

  // IDs de productos de la oferta para sincronizar
  private idsOfertaOriginal = signal<number[]>([]);

  // Productos del catálogo
  productos = signal<Producto[]>([]);
  cargandoProductos = signal(true);
  busquedaProducto = signal('');

  // Productos seleccionados por el usuario
  productosSeleccionados = signal<Producto[]>([]);

  // Sugerencias filtradas en base a la búsqueda
  productosFiltrados = computed(() => {
    const texto = this.busquedaProducto().trim().toLowerCase();
    const todos = this.productos();
    if (!texto) {
      return todos.slice(0, 8); // Muestra hasta 8 sugerencias iniciales
    }
    return todos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(texto) ||
        p.marca.toLowerCase().includes(texto)
    );
  });

  formulario = this.fb.group(
    {
      nombre: ['', [Validators.required, noVacio(), Validators.maxLength(100)]],
      descripcion: ['', [Validators.required, noVacio(), Validators.maxLength(255)]],
      porcentaje: [
        null as number | null,
        [
          Validators.required,
          Validators.min(0.01),
          Validators.max(100),
          Validators.pattern(/^.{1,3}$/),
        ],
      ],
      fechaInicio: ['', [Validators.required]],
      fechaFin: ['', [Validators.required]],
      productosIds: this.fb.control<number[]>([], [Validators.required]),
    },
    { validators: fechaFinPosterior() }
  );

  private mensajes: Record<string, Record<string, string>> = {
    nombre: {
      required: 'El nombre no puede estar vacío',
      noVacio: 'El nombre no puede estar vacío',
      maxlength: 'El nombre no puede exceder los 100 caracteres',
    },
    descripcion: {
      required: 'La descripción no puede estar vacía',
      noVacio: 'La descripción no puede estar vacía',
      maxlength: 'La descripción no puede exceder los 255 caracteres',
    },
    porcentaje: {
      required: 'El porcentaje de descuento es obligatorio',
      min: 'El porcentaje mínimo es 0.01%',
      max: 'El porcentaje máximo es 100%',
      pattern: 'El porcentaje no puede tener más de 3 caracteres',
    },
    fechaInicio: {
      required: 'La fecha de inicio es requerida',
      fechaAnterior: 'La fecha de inicio no puede ser anterior a hoy',
    },
    fechaFin: {
      required: 'La fecha de fin es requerida',
    },
    productosIds: {
      required: 'Debes seleccionar al menos un producto para la oferta',
    },
  };

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam) {
      this.id.set(idParam);
      this.cargarOferta(idParam);
    } else {
      // Solo en modo creación validamos que no sea anterior a hoy
      this.formulario.controls.fechaInicio.addValidators(fechaNoAnteriorAHoy());
      this.formulario.controls.fechaInicio.updateValueAndValidity();
    }

    this.cargarProductos();
  }

  cargarOferta(id: string | number): void {
    this.cargando.set(true);
    this.ofertasService.getOfertaById(id).subscribe({
      next: (oferta) => {
        const porcentajeValor = formatearPorcentajeVisual(oferta.porcentaje);

        this.formulario.patchValue({
          nombre: oferta.nombre,
          descripcion: oferta.descripcion,
          porcentaje: porcentajeValor,
          fechaInicio: this.formatearFechaAString(oferta.fechaInicio),
          fechaFin: this.formatearFechaAString(oferta.fechaFin),
        });

        // Extraer los IDs de productos (compatibilidad con oferta.productos y oferta.productosIds)
        let ids: number[] = [];
        if (oferta.productos && Array.isArray(oferta.productos) && oferta.productos.length > 0) {
          ids = oferta.productos.map((p) => Number(p.id)).filter((n) => !isNaN(n));
          // Precargar los productos seleccionados para visualización inmediata
          const productosIniciales: Producto[] = oferta.productos.map((p) => ({
            id: p.id,
            nombre: p.marcaYNombre,
            marca: '',
            precio: p.precioConDescuento,
            stock: 1,
            descripcion: null,
          }));
          this.productosSeleccionados.set(productosIniciales);
        } else if (oferta.productosIds) {
          ids = this.extraerIds(oferta.productosIds);
        }

        this.idsOfertaOriginal.set(ids);
        this.formulario.controls.productosIds.setValue(ids);
        if (ids.length > 0) {
          this.formulario.controls.productosIds.setErrors(null);
        }

        this.sincronizarProductosCargados();
        this.cargando.set(false);
      },
      error: async (error) => {
        console.error('Error al cargar oferta:', error);
        await this.alertaService.error(`Error: No se pudo cargar la oferta (${extraerMensajeError(error)})`);
        this.router.navigate(['/ofertas']);
      },
    });
  }

  cargarProductos(): void {
    this.productosService.getAllProductos().subscribe({
      next: (data) => {
        this.productos.set(data);
        this.cargandoProductos.set(false);
        this.sincronizarProductosCargados();
      },
      error: () => {
        this.cargandoProductos.set(false);
      },
    });
  }

  private sincronizarProductosCargados(): void {
    const ids = this.idsOfertaOriginal();
    const catalogo = this.productos();
    if (ids.length === 0 || catalogo.length === 0) return;

    // Vincula con los productos completos del catálogo
    const encontrados = catalogo.filter((p) => p.id != null && ids.includes(Number(p.id)));
    if (encontrados.length > 0) {
      this.productosSeleccionados.set(encontrados);
      this.sincronizarIds(encontrados, false);
    }
  }

  private formatearFechaAString(fecha: string | Date | undefined): string {
    if (!fecha) return '';
    if (typeof fecha === 'string') {
      return fecha.slice(0, 10);
    }
    return getFechaLocalISO(fecha);
  }

  private extraerIds(ids: unknown): number[] {
    if (!ids) return [];
    if (Array.isArray(ids)) {
      return ids
        .map((n) => (typeof n === 'object' && n !== null && 'id' in n ? Number((n as any).id) : Number(n)))
        .filter((n) => !isNaN(n));
    }
    if (typeof ids === 'string') {
      return ids
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n));
    }
    return [];
  }

  seleccionarProducto(producto: Producto): void {
    if (producto.id == null) return;

    const actuales = this.productosSeleccionados();
    const yaExiste = actuales.some((p) => p.id === producto.id);
    if (!yaExiste) {
      const actualizados = [...actuales, producto];
      this.productosSeleccionados.set(actualizados);
      this.sincronizarIds(actualizados, true);
    }
  }

  removerProducto(productoId?: number): void {
    if (productoId == null) return;

    const actualizados = this.productosSeleccionados().filter(
      (p) => p.id !== productoId
    );
    this.productosSeleccionados.set(actualizados);
    this.sincronizarIds(actualizados, true);
  }

  limpiarSeleccionados(): void {
    this.productosSeleccionados.set([]);
    this.sincronizarIds([], true);
  }

  estaSeleccionado(productoId?: number): boolean {
    if (productoId == null) return false;
    return this.productosSeleccionados().some((p) => p.id === productoId);
  }

  private sincronizarIds(lista: Producto[], marcarTocado = true): void {
    const ids = lista
      .map((p) => p.id)
      .filter((id): id is number => id != null);

    this.formulario.controls.productosIds.setValue(ids);
    if (ids.length > 0) {
      this.formulario.controls.productosIds.setErrors(null);
    } else {
      this.formulario.controls.productosIds.setErrors({ required: true });
    }

    if (marcarTocado) {
      this.formulario.controls.productosIds.markAsTouched();
    }
  }

  mensajeError(campo: string): string | null {
    if (
      campo === 'fechaFin' &&
      this.formulario.errors?.['fechaInvalida'] &&
      this.formulario.get('fechaFin')?.touched
    ) {
      return 'La fecha de fin no puede ser anterior a la fecha de inicio';
    }

    const control = this.formulario.get(campo);
    if (!control || !control.errors) return null;

    if (control.errors['servidor']) {
      return control.errors['servidor'];
    }

    if (!control.touched) return null;

    const error = Object.keys(control.errors)[0];
    return this.mensajes[campo]?.[error] ?? 'Valor inválido';
  }

  guardar(): void {
    let productosIds = this.productosSeleccionados()
      .map((p) => p.id)
      .filter((id): id is number => id != null);

    // Fallback de seguridad si los IDs ya estaban asignados en el control
    if (productosIds.length === 0 && this.formulario.controls.productosIds.value?.length) {
      productosIds = this.formulario.controls.productosIds.value;
    }

    if (productosIds.length === 0) {
      this.formulario.controls.productosIds.setErrors({ required: true });
      this.formulario.controls.productosIds.markAsTouched();
    } else {
      this.formulario.controls.productosIds.setErrors(null);
      this.formulario.controls.productosIds.setValue(productosIds);
    }

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.guardando.set(true);

    const valores = this.formulario.getRawValue();
    const oferta: OfertaRequest = {
      nombre: valores.nombre!.trim(),
      descripcion: valores.descripcion!.trim(),
      porcentaje: Number(valores.porcentaje),
      fechaInicio: valores.fechaInicio!,
      fechaFin: valores.fechaFin!,
      productosIds: productosIds,
    };

    const id = this.id();
    const peticion = id
      ? this.ofertasService.updateOferta(id, oferta)
      : this.ofertasService.createOferta(oferta);

    peticion.subscribe({
      next: async () => {
        await this.alertaService.exito(id ? 'Oferta modificada correctamente' : 'Oferta creada correctamente');
        this.router.navigate(['/ofertas']);
      },
      error: (error) => {
        const errorMsg = extraerMensajeError(error);
        this.formulario.controls.productosIds.setErrors({ servidor: errorMsg });
        this.formulario.controls.productosIds.markAsTouched();
        this.guardando.set(false);
      },
    });
  }

  volver(): void {
    this.router.navigate(['/ofertas']);
  }
}

import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ProductosService, ProductoRequest } from '../../../services/productos/productos-service';
import { AlertaService } from '../../../services/alerta/alerta-service';
import {
  ETAPAS_VIDA, EtapaVida, TIPOS_ANIMAL, TIPOS_ANTIPULGAS, TIPOS_PRODUCTO, TipoAnimal,
  TipoAntipulgas, TipoProducto, tipoDesdeRuta, UNIDADES_MEDIDA, UnidadMedida
} from '../../../models/Enums';
import Alimento from '../../../models/Alimento';
import Antipulgas from '../../../models/Antipulgas';
import Producto from '../../../models/Producto';
import { digitos, noVacio, rangoPeso } from '../../../validators/producto-validators';
import { extraerMensajeError } from '../../../utils/error-util';
import { FormatoEnumPipe } from '../../../pipes/formato-enum-pipe';

@Component({
  imports: [ReactiveFormsModule, FormatoEnumPipe],
  selector: 'app-productos-form',
  styleUrl: './productos-form.css',
  templateUrl: './productos-form.html',
})
export class ProductosForm implements OnInit {

  private fb = inject(FormBuilder)
  private productosService = inject(ProductosService)
  private alertaService = inject(AlertaService)
  private router = inject(Router)
  private route = inject(ActivatedRoute)

  tipos = TIPOS_PRODUCTO
  tiposAnimal = TIPOS_ANIMAL
  unidadesMedida = UNIDADES_MEDIDA
  etapasVida = ETAPAS_VIDA
  tiposAntipulgas = TIPOS_ANTIPULGAS

  id = signal<number | null>(null)
  tipoSeleccionado = signal<TipoProducto | null>(null)
  guardando = signal(false)
  mensaje = signal('')

  // Mismas validaciones que los CreateRequestDTO del back
  formulario = this.fb.group({
    tipoProducto: this.fb.control<TipoProducto | null>(null, Validators.required),
    nombre: ['', [Validators.required, noVacio(), Validators.maxLength(30)]],
    descripcion: ['', [Validators.maxLength(100)]],
    precio: [null as number | null, [Validators.required, Validators.min(0), digitos(7, 2)]],
    stock: [null as number | null, [Validators.required, Validators.min(0), digitos(3, 0)]],
    marca: ['', [Validators.required, noVacio(), Validators.maxLength(20)]],

    // Un grupo por tipo de producto: solo queda habilitado el del tipo elegido
    alimento: this.fb.group({
      peso: [null as number | null, [Validators.required, Validators.min(0), digitos(3, 1)]],
      unidadMedida: this.fb.control<UnidadMedida | null>(null, Validators.required),
      etapaVida: this.fb.control<EtapaVida | null>(null, Validators.required),
      tipoAnimal: this.fb.control<TipoAnimal | null>(null, Validators.required),
    }),
    antipulgas: this.fb.group({
      tipoAnimal: this.fb.control<TipoAnimal | null>(null, Validators.required),
      kgMin: [null as number | null, [Validators.required, Validators.min(0), digitos(2, 2)]],
      kgMax: [null as number | null, [Validators.required, Validators.min(0), digitos(2, 2)]],
      tipoAntipulgas: this.fb.control<TipoAntipulgas | null>(null, Validators.required),
    }, { validators: rangoPeso() }),
  })

  private grupos = {
    ALIMENTO: this.formulario.controls.alimento,
    ANTIPULGAS: this.formulario.controls.antipulgas
  } satisfies Record<TipoProducto, unknown>

  private mensajes: Record<string, Record<string, string>> = {
    'tipoProducto': { required: 'Elegí un tipo de producto' },
    'nombre': {
      required: 'El nombre no puede estar vacío',
      noVacio: 'El nombre no puede estar vacío',
      maxlength: 'El nombre no puede exceder los 30 caracteres',
      duplicado: 'Ya existe un producto con el mismo nombre, marca, tipo y tipo de animal'
    },
    'descripcion': { maxlength: 'La descripción no puede exceder los 100 caracteres' },
    'precio': {
      required: 'El precio no puede estar vacío',
      min: 'El precio no puede ser menor a 0',
      digitos: 'Máximo 7 dígitos enteros y 2 decimales'
    },
    'stock': {
      required: 'El stock no puede estar vacío',
      min: 'El stock no puede ser menor a 0',
      digitos: 'Tiene que ser un entero de hasta 3 dígitos'
    },
    'marca': {
      required: 'La marca no puede estar vacía',
      noVacio: 'La marca no puede estar vacía',
      maxlength: 'La marca no puede exceder los 20 caracteres'
    },
    'alimento.peso': {
      required: 'El peso no puede estar vacío',
      min: 'El peso no puede ser menor a 0',
      digitos: 'Máximo 3 dígitos enteros y 1 decimal'
    },
    'alimento.unidadMedida': { required: 'La unidad de medida no puede estar vacía' },
    'alimento.etapaVida': { required: 'La etapa de vida no puede estar vacía' },
    'alimento.tipoAnimal': { required: 'El tipo de animal no puede estar vacío' },
    'antipulgas.tipoAnimal': { required: 'El tipo de animal no puede estar vacío' },
    'antipulgas.kgMin': {
      required: 'El peso mínimo no puede estar vacío',
      min: 'El peso mínimo no puede ser menor a 0',
      digitos: 'Máximo 2 dígitos enteros y 2 decimales'
    },
    'antipulgas.kgMax': {
      required: 'El peso máximo no puede estar vacío',
      min: 'El peso máximo no puede ser menor a 0',
      digitos: 'Máximo 2 dígitos enteros y 2 decimales'
    },
    'antipulgas.tipoAntipulgas': { required: 'El tipo de antipulgas no puede estar vacío' },
  }

  private productosExistentes: Producto[] = []

  constructor() {
    this.formulario.controls.alimento.disable()
    this.formulario.controls.antipulgas.disable()

    this.formulario.valueChanges.subscribe(() => {
      if (this.formulario.controls.nombre.hasError('duplicado')) {
        const errores = { ...this.formulario.controls.nombre.errors }
        delete errores['duplicado']
        this.formulario.controls.nombre.setErrors(Object.keys(errores).length ? errores : null)
      }
      if (this.mensaje()) {
        this.mensaje.set('')
      }
    })
  }

  ngOnInit(): void {
    this.cargarProductosExistentes()

    const parametros = this.route.snapshot.paramMap
    const id = parametros.get('id')
    if (!id) return

    const tipo = tipoDesdeRuta(parametros.get('tipo'))
    if (!tipo) {
      this.router.navigate(['/productos'])
      return
    }

    this.id.set(Number(id))
    this.cargarProducto(tipo, Number(id))
  }

  cargarProductosExistentes() {
    this.productosService.getAllProductos().subscribe({
      next: (productos) => { this.productosExistentes = productos },
      error: () => {}
    })
  }

  cargarProducto(tipo: TipoProducto, id: number) {
    this.productosService.getProductoById(tipo, id).subscribe({
      next: (producto) => {
        this.formulario.patchValue({
          tipoProducto: tipo,
          nombre: producto.nombre,
          descripcion: producto.descripcion ?? '',
          precio: producto.precio,
          stock: producto.stock,
          marca: producto.marca,
        })

        if (tipo === 'ALIMENTO') {
          this.formulario.controls.alimento.patchValue(producto as Alimento)
        } else {
          this.formulario.controls.antipulgas.patchValue(producto as Antipulgas)
        }

        // Un producto existente no puede cambiar de tipo
        this.formulario.controls.tipoProducto.disable()
        this.cambiarTipo()
      },
      error: async () => {
        await this.alertaService.error('No se pudo cargar el producto')
        this.router.navigate(['/productos'])
      }
    })
  }

  cambiarTipo() {
    const tipo = this.formulario.controls.tipoProducto.value
    this.tipoSeleccionado.set(tipo)

    for (const [clave, grupo] of Object.entries(this.grupos)) {
      if (clave === tipo) {
        grupo.enable()
      } else {
        grupo.disable()
      }
    }
  }

  mensajeError(ruta: string): string | null {
    const control = this.formulario.get(ruta)
    if (!control?.touched || !control.errors) return null

    const error = Object.keys(control.errors)[0]
    return this.mensajes[ruta]?.[error] ?? 'Valor inválido'
  }

  errorRangoPeso(): boolean {
    const grupo = this.formulario.controls.antipulgas
    return !!grupo.errors?.['rangoPeso'] && grupo.controls.kgMax.touched
  }

  private normalizar(texto: string | null | undefined): string {
    return (texto ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
  }

  private async verificarProductoDuplicado(
    tipo: TipoProducto,
    marca: string,
    nombre: string,
    tipoAnimal: TipoAnimal | null | undefined,
    idActual: number | null
  ): Promise<boolean> {
    if (!tipoAnimal) return false

    let productos = this.productosExistentes
    try {
      productos = await firstValueFrom(this.productosService.getAllProductos())
      this.productosExistentes = productos
    } catch {
      // Si la consulta en vivo falla, usamos los productos precargados
    }

    const marcaNorm = this.normalizar(marca)
    const nombreNorm = this.normalizar(nombre)

    const candidatos = productos.filter(p =>
      (idActual == null || p.id !== idActual) &&
      p.tipoProducto === tipo &&
      this.normalizar(p.marca) === marcaNorm &&
      this.normalizar(p.nombre) === nombreNorm
    )

    if (candidatos.length === 0) {
      return false
    }

    for (const candidato of candidatos) {
      let animalCandidato = candidato.tipoAnimal
      if (!animalCandidato && candidato.id != null) {
        try {
          const detalle = await firstValueFrom(this.productosService.getProductoById(tipo, candidato.id))
          animalCandidato = detalle.tipoAnimal
          candidato.tipoAnimal = animalCandidato
        } catch {
          // Si no se puede obtener el detalle, se evalúa el siguiente
        }
      }

      if (animalCandidato === tipoAnimal) {
        return true
      }
    }

    return false
  }

  async guardar() {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched()
      return
    }

    this.guardando.set(true)
    this.mensaje.set('')

    const valores = this.formulario.getRawValue()
    const tipo = valores.tipoProducto!
    const especificos = { ALIMENTO: valores.alimento, ANTIPULGAS: valores.antipulgas }[tipo]
    const tipoAnimal = especificos?.tipoAnimal

    try {
      const duplicado = await this.verificarProductoDuplicado(
        tipo,
        valores.marca!,
        valores.nombre!,
        tipoAnimal,
        this.id()
      )

      if (duplicado) {
        this.guardando.set(false)
        this.mensaje.set('Ya existe un producto con el mismo nombre, marca, tipo de producto y tipo de animal')
        this.formulario.controls.nombre.setErrors({ duplicado: true })
        this.formulario.controls.nombre.markAsTouched()
        return
      }
    } catch {
      // Si falla la verificación, dejamos continuar con el flujo normal
    }

    const producto = {
      nombre: valores.nombre!.trim(),
      descripcion: valores.descripcion?.trim() || null,
      precio: valores.precio!,
      stock: valores.stock!,
      marca: valores.marca!.trim(),
      ...especificos
    } as ProductoRequest

    const id = this.id()
    const peticion = id
      ? this.productosService.updateProducto(tipo, id, producto)
      : this.productosService.createProducto(tipo, producto)

    peticion.subscribe({
      next: async (guardado) => {
        await this.alertaService.exito(id ? 'Producto actualizado correctamente' : 'Producto creado correctamente')
        this.router.navigate(['/productos', tipo.toLowerCase(), guardado.id])
      },
      error: (error) => {
        this.mensaje.set(extraerMensajeError(error))
        this.guardando.set(false)
      }
    })
  }

  volver() {
    const id = this.id()
    const tipo = this.tipoSeleccionado()
    this.router.navigate(id && tipo ? ['/productos', tipo.toLowerCase(), id] : ['/productos'])
  }
}
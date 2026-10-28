import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductosService, ProductoRequest } from '../../services/productos/productos-service';
import {
  ETAPAS_VIDA, EtapaVida, TIPOS_ANIMAL, TIPOS_ANTIPULGAS, TIPOS_PRODUCTO, TipoAnimal,
  TipoAntipulgas, TipoProducto, tipoDesdeRuta, UNIDADES_MEDIDA, UnidadMedida
} from '../../models/Enums';
import Alimento from '../../models/Alimento';
import Antipulgas from '../../models/Antipulgas';
import { digitos, noVacio, rangoPeso } from '../../validators/producto-validators';
import { extraerMensajeError } from '../../utils/error-util';
import { FormatoEnumPipe } from '../../pipes/formato-enum-pipe';

@Component({
  imports: [ReactiveFormsModule, FormatoEnumPipe],
  selector: 'app-productos-form',
  styleUrl: './productos-form.css',
  templateUrl: './productos-form.html',
})
export class ProductosForm implements OnInit {

  private fb = inject(FormBuilder)
  private productosService = inject(ProductosService)
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
      peso: [null as number | null, [Validators.required, Validators.min(0), digitos(3, 0)]],
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
    'tipoProducto': { required: 'Elegi un tipo de producto' },
    'nombre': {
      required: 'El nombre no puede estar vacio',
      noVacio: 'El nombre no puede estar vacio',
      maxlength: 'El nombre no puede exceder los 30 caracteres'
    },
    'descripcion': { maxlength: 'La descripcion no puede exceder los 100 caracteres' },
    'precio': {
      required: 'El precio no puede estar vacio',
      min: 'El precio no puede ser menor a 0',
      digitos: 'Maximo 7 digitos enteros y 2 decimales'
    },
    'stock': {
      required: 'El stock no puede estar vacio',
      min: 'El stock no puede ser menor a 0',
      digitos: 'Tiene que ser un entero de hasta 3 digitos'
    },
    'marca': {
      required: 'La marca no puede estar vacia',
      noVacio: 'La marca no puede estar vacia',
      maxlength: 'La marca no puede exceder los 20 caracteres'
    },
    'alimento.peso': {
      required: 'El peso no puede estar vacio',
      min: 'El peso no puede ser menor a 0',
      digitos: 'Tiene que ser un entero de hasta 3 digitos'
    },
    'alimento.unidadMedida': { required: 'La unidad de medida no puede estar vacia' },
    'alimento.etapaVida': { required: 'La etapa de vida no puede estar vacia' },
    'alimento.tipoAnimal': { required: 'El tipo de animal no puede estar vacio' },
    'antipulgas.tipoAnimal': { required: 'El tipo de animal no puede estar vacio' },
    'antipulgas.kgMin': {
      required: 'El peso minimo no puede estar vacio',
      min: 'El peso minimo no puede ser menor a 0',
      digitos: 'Maximo 2 digitos enteros y 2 decimales'
    },
    'antipulgas.kgMax': {
      required: 'El peso maximo no puede estar vacio',
      min: 'El peso maximo no puede ser menor a 0',
      digitos: 'Maximo 2 digitos enteros y 2 decimales'
    },
    'antipulgas.tipoAntipulgas': { required: 'El tipo de antipulgas no puede estar vacio' },
  }

  constructor() {
    this.formulario.controls.alimento.disable()
    this.formulario.controls.antipulgas.disable()
  }

  ngOnInit(): void {
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
      error: () => {
        alert('Error: No se pudo cargar el producto')
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
    return this.mensajes[ruta]?.[error] ?? 'Valor invalido'
  }

  errorRangoPeso(): boolean {
    const grupo = this.formulario.controls.antipulgas
    return !!grupo.errors?.['rangoPeso'] && grupo.controls.kgMax.touched
  }

  guardar() {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched()
      return
    }

    this.guardando.set(true)
    this.mensaje.set('')

    const valores = this.formulario.getRawValue()
    const tipo = valores.tipoProducto!
    const especificos = { ALIMENTO: valores.alimento, ANTIPULGAS: valores.antipulgas }[tipo]

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
      next: (guardado) => {
        alert(id ? 'Producto actualizado correctamente' : 'Producto creado correctamente')
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

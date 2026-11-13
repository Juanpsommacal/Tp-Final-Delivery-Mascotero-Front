import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ProductosForm } from './productos-form';
import { ProductosService } from '../../../services/productos/productos-service';
import Producto from '../../../models/Producto';

describe('ProductosForm', () => {
  let component: ProductosForm;
  let fixture: ComponentFixture<ProductosForm>;
  let productosService: ProductosService;

  const productosMock: Producto[] = [
    {
      id: 1,
      nombre: 'Adulto',
      marca: 'Pedigree',
      precio: 15000,
      stock: 10,
      descripcion: null,
      tipoProducto: 'ALIMENTO',
      tipoAnimal: 'PERRO'
    },
    {
      id: 2,
      nombre: 'Gatitos',
      marca: 'Whiskas',
      precio: 12000,
      stock: 5,
      descripcion: null,
      tipoProducto: 'ALIMENTO',
      tipoAnimal: 'GATO'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductosForm],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductosForm);
    component = fixture.componentInstance;
    productosService = TestBed.inject(ProductosService);
    vi.spyOn(productosService, 'getAllProductos').mockReturnValue(of(productosMock));
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('no debería permitir crear un producto si ya existe con mismo nombre, marca, tipo y animal', async () => {
    const createSpy = vi.spyOn(productosService, 'createProducto');

    component.formulario.patchValue({
      tipoProducto: 'ALIMENTO',
      marca: 'pedigree',
      nombre: 'ADULTO',
      precio: 16000,
      stock: 20,
    });
    component.cambiarTipo();
    component.formulario.controls.alimento.patchValue({
      peso: 15,
      unidadMedida: 'KILOGRAMOS',
      etapaVida: 'ADULTO',
      tipoAnimal: 'PERRO'
    });

    await component.guardar();

    expect(createSpy).not.toHaveBeenCalled();
    expect(component.mensaje()).toBe('Ya existe un producto con el mismo nombre, marca, tipo de producto y tipo de animal');
    expect(component.formulario.controls.nombre.errors?.['duplicado']).toBe(true);
  });

  it('debería permitir crear un producto si el tipo de animal es distinto', async () => {
    const createSpy = vi.spyOn(productosService, 'createProducto').mockReturnValue(of({
      id: 3,
      nombre: 'Adulto',
      marca: 'Pedigree',
      precio: 16000,
      stock: 20,
      descripcion: null,
      tipoProducto: 'ALIMENTO',
      peso: 15,
      unidadMedida: 'KILOGRAMOS',
      etapaVida: 'ADULTO',
      tipoAnimal: 'GATO'
    }));

    component.formulario.patchValue({
      tipoProducto: 'ALIMENTO',
      marca: 'Pedigree',
      nombre: 'Adulto',
      precio: 16000,
      stock: 20,
    });
    component.cambiarTipo();
    component.formulario.controls.alimento.patchValue({
      peso: 15,
      unidadMedida: 'KILOGRAMOS',
      etapaVida: 'ADULTO',
      tipoAnimal: 'GATO'
    });

    await component.guardar();

    expect(createSpy).toHaveBeenCalled();
  });
});

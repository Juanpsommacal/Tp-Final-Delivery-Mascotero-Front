import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductosForm } from './productos-form';

describe('ProductosForm', () => {
  let component: ProductosForm;
  let fixture: ComponentFixture<ProductosForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductosForm],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductosForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ProveedoresForm } from './proveedores-form';

describe('ProveedoresForm', () => {
  let component: ProveedoresForm;
  let fixture: ComponentFixture<ProveedoresForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProveedoresForm],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ProveedoresForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

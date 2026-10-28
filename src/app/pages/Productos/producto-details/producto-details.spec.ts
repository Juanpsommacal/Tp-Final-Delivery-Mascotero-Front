import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ProductoDetails } from './producto-details';

describe('ProductoDetails', () => {
  let component: ProductoDetails;
  let fixture: ComponentFixture<ProductoDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductoDetails],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductoDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

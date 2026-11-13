import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OfertaDetails } from './oferta-details';

describe('OfertaDetails', () => {
  let component: OfertaDetails;
  let fixture: ComponentFixture<OfertaDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfertaDetails],
    }).compileComponents();

    fixture = TestBed.createComponent(OfertaDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

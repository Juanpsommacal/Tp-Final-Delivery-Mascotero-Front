import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OfertaList } from './oferta-list';

describe('OfertaList', () => {
  let component: OfertaList;
  let fixture: ComponentFixture<OfertaList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfertaList],
    }).compileComponents();

    fixture = TestBed.createComponent(OfertaList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

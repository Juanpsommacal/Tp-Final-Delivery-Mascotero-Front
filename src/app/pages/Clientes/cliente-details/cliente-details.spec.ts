import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClienteDetails } from './cliente-details';

describe('ClienteDetails', () => {
  let component: ClienteDetails;
  let fixture: ComponentFixture<ClienteDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClienteDetails],
    }).compileComponents();

    fixture = TestBed.createComponent(ClienteDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

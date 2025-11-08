import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TipoEstadoFisicoHerramientaComponent } from './tipo-estado-fisico-herramienta.component';

describe('TipoEstadoFisicoHerramientaComponent', () => {
  let component: TipoEstadoFisicoHerramientaComponent;
  let fixture: ComponentFixture<TipoEstadoFisicoHerramientaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TipoEstadoFisicoHerramientaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TipoEstadoFisicoHerramientaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

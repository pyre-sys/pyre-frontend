import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TipoFamiliaHerramientaComponent } from './tipo-familia-herramienta.component';

describe('TipoFamiliaHerramientaComponent', () => {
  let component: TipoFamiliaHerramientaComponent;
  let fixture: ComponentFixture<TipoFamiliaHerramientaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TipoFamiliaHerramientaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TipoFamiliaHerramientaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

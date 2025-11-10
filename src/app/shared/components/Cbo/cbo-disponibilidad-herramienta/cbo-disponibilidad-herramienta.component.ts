import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  forwardRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormControl,
} from '@angular/forms';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
  of,
  Subject,
} from 'rxjs';
import { DisponibilidadHerramientaService } from '../../../../services/disponibilidad-herramienta.service';

@Component({
  selector: 'app-cbo-disponibilidad-herramienta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cbo-disponibilidad-herramienta.component.html',
  styleUrls: ['./cbo-disponibilidad-herramienta.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CboDisponibilidadHerramientaComponent),
      multi: true,
    },
  ],
})
export class CboDisponibilidadHerramientaComponent
  implements OnInit, OnDestroy, ControlValueAccessor
{
  @Input() isLabel: string = '';
  @Input() isId: string = 'disponibilidad-herramienta-select';
  @Input() isDisabled: boolean = false;
  @Input() showOnlyActive: boolean = true;
  @Input() objectErrors: any = null;
  @Input() selectedDisponibilidad: any; // Nueva entrada para soportar el binding

  @Output() disponibilidadSelected = new EventEmitter<any>();
  @Output() selectedDisponibilidadChange = new EventEmitter<any>(); // Para soportar two-way binding

  // Internal state
  disponibilidades: any[] = [];
  searchControl = new FormControl('');
  isOpen = false;
  isLoading = false;
  placeholder = 'Disponibilidad';

  private destroy$ = new Subject<void>();
  private onChange = (value: any) => {};
  private onTouched = () => {};
  private isDataLoaded = false; // evita llamadas redundantes

  constructor(
    private disponibilidadService: DisponibilidadHerramientaService
  ) {}

  ngOnInit(): void {
    this.setupSearch();
    this.loadDisponibilidades();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    if (value && value !== this.selectedDisponibilidad) {
      this.selectedDisponibilidad = value;
      this.updatePlaceholder();
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  private setupSearch(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((searchTerm) => {
          if (!searchTerm || searchTerm.length < 2) {
            return of(this.disponibilidades);
          }
          this.isLoading = true;
          return this.searchDisponibilidades(searchTerm);
        })
      )
      .subscribe((disponibilidades: any) => {
        if (this.searchControl.value && this.searchControl.value.length >= 2) {
          this.disponibilidades = disponibilidades || [];
        }
        this.isLoading = false;
      });
  }

  private searchDisponibilidades(searchTerm: string) {
    return this.disponibilidadService.getDisponibilidades().pipe(
      switchMap((response) => {
        const rawList = response.data || [];

        const filteredList = rawList.filter((disp: any) => {
          const descripcion = (disp.descripcionEstado || '').toLowerCase();
          return descripcion.includes(searchTerm.toLowerCase());
        });

        return of(filteredList);
      }),
      catchError((error) => {
        console.error('Error searching disponibilidades:', error);
        return of([]);
      })
    );
  }

  private loadDisponibilidades(): void {
    if (this.isDataLoaded) return;

    this.isLoading = true;
    this.disponibilidadService
      .getDisponibilidades()
      .pipe(
        catchError((error) => {
          console.error('Error loading disponibilidades:', error);
          return of({ data: [] });
        })
      )
      .subscribe((response: any) => {
        this.disponibilidades = response.data || [];
        this.isLoading = false;
        this.isDataLoaded = true;
      });
  }

  onMainInputClick(): void {
    if (!this.isDisabled) {
      this.openDropdown();
    }
  }

  onMainInputFocus(): void {
    if (!this.isDisabled && !this.isOpen) {
      this.isOpen = true;
      this.loadDisponibilidades();
    }
  }

  onMainInputBlur(): void {
    setTimeout(() => {
      if (this.isOpen) {
        this.isOpen = false;
        this.updatePlaceholder();
      }
    }, 200);
  }

  onMainInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchControl.setValue(target.value);
  }

  private openDropdown(): void {
    if (!this.isDataLoaded) {
      this.loadDisponibilidades();
    }
    this.isOpen = true;
  }

  private closeDropdown(): void {
    this.isOpen = false;
    this.updatePlaceholder();
  }

  toggleDropdown(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (this.isDisabled) return;

    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.loadDisponibilidades();
    } else {
      this.updatePlaceholder();
    }
  }

  onOptionClick(disponibilidad: any): void {
    this.selectedDisponibilidad = disponibilidad;
    this.selectedDisponibilidadChange.emit(disponibilidad); // Emitir el cambio
    this.isOpen = false;
    this.updatePlaceholder();

    this.disponibilidadSelected.emit(disponibilidad);
    this.onChange(disponibilidad);
    this.onTouched();
  }

  clearSelection(): void {
    this.selectedDisponibilidad = null;
    this.selectedDisponibilidadChange.emit(null); // Emitir el cambio
    this.searchControl.setValue('');
    this.updatePlaceholder();

    this.disponibilidadSelected.emit(null);
    this.onChange(null);
    this.onTouched();
  }

  private updatePlaceholder(): void {
    if (this.selectedDisponibilidad) {
      this.placeholder =
        this.selectedDisponibilidad.descripcionEstado ||
        'Disponibilidad seleccionada';
    } else {
      this.placeholder = 'Disponibilidad';
    }
  }

  trackByDisponibilidad(index: number, disponibilidad: any): any {
    return disponibilidad.idEstadoDisponibilidad || index;
  }

  hasErrors(): boolean {
    return this.objectErrors && Object.keys(this.objectErrors).length > 0;
  }

  getErrorMessage(): string {
    if (!this.hasErrors()) return '';

    const errors = this.objectErrors;
    if (errors.required) return 'Este campo es requerido';
    if (errors.invalid) return 'Selección inválida';

    return 'Error en la selección';
  }
}

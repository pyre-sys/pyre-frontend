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
  ReactiveFormsModule,
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
  map,
} from 'rxjs';
import { DisponibilidadHerramientaService } from '../../../../services/disponibilidad-herramienta.service';

@Component({
  selector: 'app-cbo-disponibilidad-herramienta',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
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
  implements OnInit, OnDestroy, ControlValueAccessor {
  @Input() isLabel: string = '';
  @Input() isId: string = 'disponibilidad-herramienta-select';
  @Input() isDisabled: boolean = false;
  @Input() placeholder: string = 'Disponibilidad';
  @Input() showOnlyActive: boolean = true;
  @Input() objectErrors: any = null;
  @Input() isTouched: boolean = false;

  @Output() isEmiterTouched = new EventEmitter<boolean>();
  @Output() disponibilidadSelected = new EventEmitter<any>();

  // State
  disponibilidades: any[] = [];
  filteredDisponibilidades: any[] = []; // Add filtered list
  selectedDisponibilidadId: number | null = null;
  searchControl = new FormControl('');
  isOpen = false;
  isLoading = false;
  private destroy$ = new Subject<void>();

  // ControlValueAccessor callbacks
  private onChange = (value: any) => { };
  private onTouched = () => { };

  constructor(
    private disponibilidadService: DisponibilidadHerramientaService
  ) { }

  ngOnInit(): void {
    this.setupSearch();
    this.loadDisponibilidades();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch(): void {
    this.searchControl.valueChanges
      .pipe(
        map((v: string | null) => (v ?? '') as string),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term: string) => {
          if (!term || term.length < 2) {
            this.filteredDisponibilidades = [...this.disponibilidades];
            return of(this.disponibilidades);
          }
          this.isLoading = true;
          const filtered = this.disponibilidades.filter((d) =>
            (d.descripcionEstado || '').toLowerCase().includes(term.toLowerCase())
          );
          this.filteredDisponibilidades = filtered;
          return of(filtered);
        }),
        catchError((err) => {
          console.error('Error searching disponibilidades', err);
          this.filteredDisponibilidades = [...this.disponibilidades];
          return of(this.disponibilidades);
        })
      )
      .subscribe(() => {
        this.isLoading = false;
      });
  }

  private loadDisponibilidades(): void {
    this.isLoading = true;
    this.disponibilidadService.getDisponibilidades().subscribe({
      next: (resp: any) => {
        const data = resp?.data ?? [];
        this.disponibilidades = Array.isArray(data) ? data : [];
        this.filteredDisponibilidades = [...this.disponibilidades]; // Initialize filtered list
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading disponibilidades', err);
        this.disponibilidades = [];
        this.filteredDisponibilidades = [];
        this.isLoading = false;
      },
    });
  }

  // UI helpers
  selectedDisponibilidadName(): string | null {
    const d = this.disponibilidades.find((x) => x.idEstadoDisponibilidad === this.selectedDisponibilidadId);
    return d ? d.descripcionEstado : null;
  }

  trackByDisponibilidad(index: number, disponibilidad: any): any {
    return disponibilidad.idEstadoDisponibilidad ?? index;
  }

  // Interaction
  onMainInputClick(): void {
    if (!this.isDisabled) this.openDropdown();
  }

  onMainInputFocus(): void {
    if (!this.isDisabled && !this.isOpen) this.isOpen = true;
  }

  onMainInputBlur(): void {
    setTimeout(() => {
      if (this.isOpen) {
        this.isOpen = false;
        this.emitTouched();
      }
    }, 150);
  }

  onMainInputChange(event: Event): void {
    const v = (event.target as HTMLInputElement).value;
    this.searchControl.setValue(v);
  }

  openDropdown(): void {
    if (!this.isOpen) {
      this.loadDisponibilidades();
      this.isOpen = true;
    }
  }

  toggleDropdown(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (this.isDisabled) return;
    this.isOpen = !this.isOpen;
    if (this.isOpen) this.loadDisponibilidades();
  }

  onOptionClick(disponibilidad: any): void {
    console.log('Option clicked:', disponibilidad); // Debug log
    this.selectedDisponibilidadId = disponibilidad.idEstadoDisponibilidad ?? null;
    this.isOpen = false;
    this.onChange(this.selectedDisponibilidadId);
    this.onTouched();
    this.isEmiterTouched.emit(true);
    this.disponibilidadSelected.emit(disponibilidad); // This should trigger the parent method
  }

  clearSelection(): void {
    this.selectedDisponibilidadId = null;
    this.searchControl.setValue('');
    this.onChange(null);
    this.onTouched();
    this.isEmiterTouched.emit(true);
    this.disponibilidadSelected.emit(null);
  }

  // ControlValueAccessor
  writeValue(value: any): void {
    this.selectedDisponibilidadId =
      value !== undefined && value !== null ? Number(value) : null;
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

  private emitTouched(): void {
    this.onTouched();
    this.isEmiterTouched.emit(true);
  }

  // Validation helpers
  hasErrors(): boolean {
    return !!(
      this.objectErrors &&
      (this.isTouched || this.selectedDisponibilidadId !== null)
    );
  }

  getErrorMessage(): string {
    if (!this.hasErrors()) return '';
    if (this.objectErrors?.required) return `${this.isLabel} es requerido`;
    return typeof this.objectErrors === 'string'
      ? this.objectErrors
      : 'Campo inválido';
  }
}

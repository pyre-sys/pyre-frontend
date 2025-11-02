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
import { FamiliaHerramientaService } from '../../../../services/familia-herramienta.service';

@Component({
  selector: 'app-cbo-familia-herramienta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cbo-familia-herramienta.component.html',
  styleUrls: ['./cbo-familia-herramienta.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CboFamiliaHerramientaComponent),
      multi: true,
    },
  ],
})
export class CboFamiliaHerramientaComponent
  implements OnInit, OnDestroy, ControlValueAccessor
{
  @Input() isLabel: string = '';
  @Input() isId: string = 'familia-herramienta-select';
  @Input() isDisabled: boolean = false;
  @Input() showOnlyActive: boolean = true;
  @Input() objectErrors: any = null;

  @Output() familiaSelected = new EventEmitter<any>();

  // Internal state
  familias: any[] = [];
  selectedFamilia: any = null;
  searchControl = new FormControl('');
  isOpen = false; // Start collapsed
  isLoading = false;
  placeholder = 'Seleccionar familia...';

  private destroy$ = new Subject<void>();
  private onChange = (value: any) => {};
  private onTouched = () => {};
  private isDataLoaded = false; // Nueva bandera para evitar llamadas redundantes

  constructor(private familiaService: FamiliaHerramientaService) {}

  ngOnInit(): void {
    this.setupSearch();
    this.loadFamilias();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    if (value && value !== this.selectedFamilia) {
      this.selectedFamilia = value;
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
            return of(this.familias);
          }
          this.isLoading = true;
          return this.searchFamilias(searchTerm);
        })
      )
      .subscribe((familias: any) => {
        if (!this.searchControl.value || this.searchControl.value.length < 2) {
          // Don't update if it's just the initial load
        } else {
          this.familias = familias || [];
        }
        this.isLoading = false;
      });
  }

  private searchFamilias(searchTerm: string) {
    return this.familiaService.getFamilias().pipe(
      switchMap((response) => {
        const rawList = response.data || [];

        // Filter client-side by search term
        const filteredList = rawList.filter((familia: any) => {
          const nombre = (familia.nombreFamilia || '').toLowerCase();
          const searchLower = searchTerm.toLowerCase();
          return nombre.includes(searchLower);
        });

        return of(filteredList);
      }),
      catchError((error) => {
        console.error('Error searching familias:', error);
        return of([]);
      })
    );
  }

  private loadFamilias(): void {
    if (this.isDataLoaded) return; // Evitar llamadas si los datos ya están cargados

    this.isLoading = true;
    this.familiaService
      .getFamilias()
      .pipe(
        catchError((error) => {
          console.error('Error loading familias:', error);
          return of({ data: [] });
        })
      )
      .subscribe((response: any) => {
        this.familias = response.data || [];
        this.isLoading = false;
        this.isDataLoaded = true; // Marcar como cargado
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
      this.loadFamilias(); // Solo se llama si los datos no están cargados
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
      this.loadFamilias(); // Solo se llama si los datos no están cargados
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
      this.loadFamilias();
    } else {
      this.updatePlaceholder();
    }
  }

  onOptionClick(familia: any): void {
    this.selectedFamilia = familia;
    this.isOpen = false;
    this.updatePlaceholder();

    // Emit events
    this.familiaSelected.emit(familia);
    this.onChange(familia);
    this.onTouched();
  }

  clearSelection(): void {
    this.selectedFamilia = null;
    this.searchControl.setValue('');
    this.updatePlaceholder();

    // Emit events
    this.familiaSelected.emit(null);
    this.onChange(null);
    this.onTouched();
  }

  private updatePlaceholder(): void {
    if (this.selectedFamilia) {
      this.placeholder =
        this.selectedFamilia.nombreFamilia || 'Familia seleccionada';
    } else {
      this.placeholder = 'Seleccionar familia...';
    }
  }

  trackByFamilia(index: number, familia: any): any {
    return familia.idFamilia || index;
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

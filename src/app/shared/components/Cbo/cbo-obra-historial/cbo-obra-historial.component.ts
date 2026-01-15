import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  forwardRef,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormControl,
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';
import {
  debounceTime,
  distinctUntilChanged,
  Subscription,
  switchMap,
  of,
  catchError,
} from 'rxjs';
import { ObrasService } from '../../../../services/obras.service';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

export interface ObraHistorialOption {
  idObra: number;
  codigo: string;
  nombreObra: string;
  clienteNombre?: string;
  displayText: string;
}

@Component({
  selector: 'app-cbo-obra-historial',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgbTooltipModule],
  templateUrl: './cbo-obra-historial.component.html',
  styleUrls: [
    '../cbo.component.css',
    '../cbo-movimientos.css',
    './cbo-obra-historial.component.css',
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CboObraHistorialComponent),
      multi: true,
    },
  ],
})
export class CboObraHistorialComponent
  implements OnInit, OnDestroy, ControlValueAccessor
{
  // Internal FormControl for search
  searchControl = new FormControl('');
  selectedControl = new FormControl<ObraHistorialOption | null>(null);

  // Subscriptions for cleanup
  private subscriptions: Subscription[] = [];

  // ControlValueAccessor callbacks
  private onChange = (value: any) => {};
  private onTouched = () => {};

  // Component inputs
  @Input() isLabel: string = '';
  @Input() isId: string = '';
  @Input() isDisabled: boolean = false;
  @Input() placeholder: string = 'Seleccionar obra...';
  @Input() labelClass: string = '';
  @Input() showOnlyActive: boolean = true;

  // Output events
  @Output() obraSelected = new EventEmitter<ObraHistorialOption | null>();

  // Component state
  obras: ObraHistorialOption[] = [];
  isLoading = false;
  isOpen = false;
  selectedObra: ObraHistorialOption | null = null;

  constructor(private obrasService: ObrasService) {}

  ngOnInit(): void {
    this.setupSearchSubscription();
    this.loadInitialObras();
    this.updateDisabledState();
    this.updatePlaceholderText();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  private setupSearchSubscription(): void {
    const searchSub = this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          const searchTerm = (term || '').toString().trim();

          if (searchTerm.length >= 2) {
            return this.searchObras(searchTerm);
          } else {
            // No cargar datos hasta que el usuario escriba al menos 2 caracteres
            this.isLoading = false;
            return of([]);
          }
        })
      )
      .subscribe((obras) => {
        this.obras = obras;
      });

    this.subscriptions.push(searchSub);
  }

  private loadInitialObras(): void {
    // Solo limpiar la lista, no cargar datos automáticamente
    this.obras = [];
    this.isLoading = false;
  }

  private loadInitialData() {
    // No cargar datos inicialmente - esperar a que el usuario escriba
    this.isLoading = false;
    return of([]);
  }

  private searchObras(searchTerm: string) {
    this.isLoading = true;

    // Buscar en todas las obras sin filtrar por cliente
    return this.obrasService.getObrasCombo(undefined, searchTerm, 1000).pipe(
      switchMap((response) => {
        if (response.success && response.data) {
          const obras = this.mapObrasToOptions(response.data);
          this.isLoading = false;
          return of(obras);
        } else {
          this.isLoading = false;
          return of([]);
        }
      }),
      catchError((error) => {
        console.error('Error searching obras historial combo:', error);
        this.isLoading = false;
        return of([]);
      })
    );
  }

  private mapObrasToOptions(obras: any[]): ObraHistorialOption[] {
    return obras.map((o) => ({
      idObra: o.idObra || o.id,
      codigo: o.codigo || '',
      nombreObra: o.nombreObra || o.nombre || '',
      clienteNombre: o.clienteNombre || '',
      displayText: this.buildDisplayText(o),
    }));
  }

  private buildDisplayText(obra: any): string {
    const codigo = obra.codigo || 'S/C';
    const nombre = obra.nombreObra || obra.nombre || '';
    const cliente = obra.clienteNombre || '';

    if (cliente) {
      return `[${codigo}] ${nombre} - Cliente: ${cliente}`;
    }
    return `[${codigo}] ${nombre}`;
  }

  trackByObra(index: number, item: ObraHistorialOption): number {
    return item.idObra;
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    if (value === null || value === undefined || value === '') {
      this.selectedObra = null;
      this.selectedControl.setValue(null, { emitEvent: false });
      this.updatePlaceholderText();
      return;
    }

    // Si recibimos un ID, buscar la obra correspondiente
    if (typeof value === 'number' || typeof value === 'string') {
      const obraId = Number(value);
      const existingObra = this.obras.find((o) => o.idObra === obraId);
      if (existingObra) {
        this.selectedObra = existingObra;
        this.selectedControl.setValue(existingObra, { emitEvent: false });
      }
    } else if (value && typeof value === 'object') {
      this.selectedObra = value;
      this.selectedControl.setValue(value, { emitEvent: false });
    }

    this.updatePlaceholderText();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
    this.updateDisabledState();
  }

  // UI Event handlers
  onMainInputClick(): void {
    if (!this.isDisabled) {
      this.openDropdown();
    }
  }

  onMainInputFocus(): void {
    if (!this.isDisabled) {
      this.openDropdown();
    }
  }

  onMainInputBlur(): void {
    this.onTouched();
    // Delay para permitir clicks en opciones
    setTimeout(() => {
      if (!this.isOpen) return;
      this.closeDropdown();
    }, 200);
  }

  onMainInputChange(event: any): void {
    if (this.isOpen) {
      this.searchControl.setValue(event.target.value, { emitEvent: true });
    }
  }

  toggleDropdown(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.isDisabled) return;

    if (this.isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  private openDropdown(): void {
    this.isOpen = true;
    // No cargar datos automáticamente al abrir
    this.obras = [];

    if (!this.selectedObra) {
      this.searchControl.setValue('', { emitEvent: false });
    }
  }

  private closeDropdown(): void {
    this.isOpen = false;
    this.updatePlaceholderText();
  }

  onOptionClick(obra: ObraHistorialOption): void {
    this.selectObra(obra);
    this.closeDropdown();
  }

  private selectObra(obra: ObraHistorialOption | null): void {
    this.selectedObra = obra;
    this.selectedControl.setValue(obra);

    if (obra) {
      this.onChange(obra.idObra);
    } else {
      this.onChange(null);
    }

    this.obraSelected.emit(obra);
    this.updatePlaceholderText();
  }

  clearSelection(): void {
    this.selectObra(null);
    this.searchControl.setValue('', { emitEvent: false });
    // No cargar datos automáticamente después de limpiar
    this.obras = [];
  }

  private updateDisabledState(): void {
    if (this.isDisabled) {
      this.searchControl.disable({ emitEvent: false });
    } else {
      this.searchControl.enable({ emitEvent: false });
    }
  }

  private updatePlaceholderText(): void {
    if (this.selectedObra) {
      this.placeholder = this.selectedObra.displayText;
    } else {
      this.placeholder = 'Seleccionar obra...';
    }
  }

  hasErrors(): boolean {
    return false; // Implementar validación si es necesaria
  }
}

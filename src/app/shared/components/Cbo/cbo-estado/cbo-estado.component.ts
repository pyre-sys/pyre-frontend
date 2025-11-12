import {
  Component,
  Input,
  Output,
  EventEmitter,
  forwardRef,
  OnInit,
  ElementRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';

@Component({
  selector: 'app-cbo-estado',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cbo-estado.component.html',
  styleUrls: ['./cbo-estado.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CboEstadoComponent),
      multi: true,
    },
  ],
})
export class CboEstadoComponent implements ControlValueAccessor, OnInit {
  // Component inputs
  @Input() isLabel: string = '';
  @Input() isId: string = '';
  @Input() isDisabled: boolean = false;
  @Input() placeholder: string = 'Estados';
  @Input() objectErrors: any = null;
  @Input() isTouched: boolean = false;

  // Output events
  @Output() isEmiterTouched = new EventEmitter<boolean>();
  @Output() estadoSelected = new EventEmitter<string | null>();

  // Component state
  selectedEstado: string = '';
  isOpen: boolean = false;
  isLoading: boolean = false;

  // Opciones fijas
  opciones = [
    { value: 'activo', label: 'Activo' },
    { value: 'inactivo', label: 'Inactivo' },
  ];

  // ControlValueAccessor callbacks
  private onChange = (value: any) => {};
  private onTouched = () => {};

  // Añadir constructor para ElementRef
  constructor(private elementRef: ElementRef) {}

  ngOnInit(): void {
    // nada extra por ahora
  }

  // Helpers para template
  displayLabel(value: string | null): string {
    if (!value) return '';
    const item = this.opciones.find((o) => o.value === value);
    return item ? item.label : String(value);
  }

  trackByOption(index: number, item: any): any {
    return item.value ?? index;
  }

  // Apertura / cierre del dropdown
  onMainInputClick(): void {
    // Abrir (no toggle) para evitar abrir y cerrar rápidamente si el blur se dispara
    if (!this.isDisabled) {
      this.isOpen = true;
    }
  }

  onMainInputFocus(): void {
    if (!this.isDisabled && !this.isOpen) this.isOpen = true;
  }

  onMainInputBlur(): void {
    // No cerrar aquí para evitar "pestañeo" al hacer click dentro del componente.
    // Solo marcar como touched (emitido), el cierre se maneja con click fuera.
    this.emitTouched();
  }

  toggleDropdown(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (this.isDisabled) return;
    this.isOpen = !this.isOpen;
  }

  // Cerrar si se hace click fuera del componente
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (this.isDisabled) return;
    const target = event.target as Node;
    if (!this.elementRef.nativeElement.contains(target)) {
      if (this.isOpen) {
        this.isOpen = false;
        this.emitTouched();
      }
    }
  }

  onOptionClick(opt: { value: string; label: string }): void {
    this.selectedEstado = opt.value;
    this.isOpen = false;

    // Notificar ControlValueAccessor (ngModel)
    this.onChange(this.selectedEstado);
    this.onTouched();

    // Outputs
    this.isEmiterTouched.emit(true);
    this.estadoSelected.emit(this.selectedEstado);
  }

  clearSelection(): void {
    this.selectedEstado = '';
    this.onChange(this.selectedEstado);
    this.onTouched();
    this.isEmiterTouched.emit(true);
    this.estadoSelected.emit(null);
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    this.selectedEstado = value !== undefined && value !== null ? value : '';
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

  // Validaciones / mensajes
  hasErrors(): boolean {
    return !!(
      this.objectErrors &&
      (this.isTouched || this.selectedEstado !== null)
    );
  }

  getErrorMessage(): string {
    if (!this.hasErrors()) return '';

    if (this.objectErrors?.required) {
      return `${this.isLabel} es requerido`;
    }

    if (typeof this.objectErrors === 'string') {
      return this.objectErrors;
    }

    return 'Campo inválido';
  }
}

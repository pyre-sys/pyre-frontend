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
import { ClienteService } from '../../../../services/cliente.service';

export interface ClienteOption {
  idCliente: number;
  nombre: string;
  displayText: string;
  activo?: boolean;
}

@Component({
  selector: 'app-cbo-cliente',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cbo-cliente.component.html',
  styleUrls: ['../cbo.component.css', '../cbo-movimientos.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CboClienteComponent),
      multi: true,
    },
  ],
})
export class CboClienteComponent
  implements OnInit, OnDestroy, ControlValueAccessor
{
  // Controls
  searchControl = new FormControl('');
  selectedControl = new FormControl<ClienteOption | null>(null);

  private subscriptions: Subscription[] = [];

  // ControlValueAccessor
  private onChange = (value: any) => {};
  private onTouched = () => {};

  // Inputs
  @Input() isLabel: string = '';
  @Input() isId: string = '';
  @Input() isDisabled: boolean = false;
  @Input() placeholder: string = 'Seleccionar cliente...';
  @Input() showOnlyActive: boolean = true;
  @Input() objectErrors: any = null;
  @Input() isTouched: boolean = false;

  // Outputs
  @Output() isEmiterTouched = new EventEmitter<boolean>();
  @Output() clienteSelected = new EventEmitter<ClienteOption | null>();

  // State
  clientes: ClienteOption[] = [];
  isLoading = false;
  isOpen = false;
  selectedCliente: ClienteOption | null = null;

  constructor(private clienteService: ClienteService) {}

  ngOnInit(): void {
    this.setupSearchSubscription();
    this.loadInitialClientes();
    this.updateDisabledState();
    this.updatePlaceholderText();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  private setupSearchSubscription(): void {
    const sub = this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          if (!this.isOpen) return of([]);
          const searchTerm = (term || '').trim();
          if (searchTerm.length >= 3) {
            return this.searchClientes(searchTerm);
          } else if (searchTerm.length === 0) {
            return this.loadInitialData();
          } else {
            return of([]);
          }
        })
      )
      .subscribe((clientes) => {
        this.clientes = clientes;
      });

    this.subscriptions.push(sub);
  }

  private loadInitialClientes(): void {
    this.loadInitialData().subscribe((list) => (this.clientes = list));
  }

  private loadInitialData() {
    this.isLoading = true;
    const activoFilter = this.showOnlyActive ? true : undefined;

    return this.clienteService.getClientesCombo(undefined, activoFilter).pipe(
      switchMap((resp) => {
        const raw = resp?.data ?? [];
        const list = this.mapClientesToOptions(raw);
        this.isLoading = false;
        return of(list);
      }),
      catchError((err) => {
        console.error('Error loading clientes combo:', err);
        this.isLoading = false;
        return of([]);
      })
    );
  }

  private searchClientes(searchTerm: string) {
    this.isLoading = true;
    const activoFilter = this.showOnlyActive ? true : undefined;

    return this.clienteService.getClientesCombo(searchTerm, activoFilter).pipe(
      switchMap((resp) => {
        const raw = resp?.data ?? [];
        const list = this.mapClientesToOptions(raw);
        this.isLoading = false;
        return of(list);
      }),
      catchError((err) => {
        console.error('Error searching clientes:', err);
        this.isLoading = false;
        return of([]);
      })
    );
  }

  private mapClientesToOptions(list: any[]): ClienteOption[] {
    return list.map((c) => ({
      idCliente: Number(c?.idCliente ?? c?.id ?? 0),
      nombre: String(c?.nombre ?? c?.Nombre ?? ''),
      displayText: `${c?.idCliente ?? ''} - ${c?.nombre ?? c?.Nombre ?? ''}`,
      activo: c?.activo ?? true,
    }));
  }

  // UI interactions
  onMainInputClick(): void {
    if (this.isDisabled) return;
    if (!this.isOpen) this.openDropdown();
  }

  onMainInputFocus(): void {
    if (this.isDisabled) return;
    if (!this.isOpen) this.openDropdown();
  }

  onMainInputBlur(): void {
    setTimeout(() => {
      if (this.isOpen) this.closeDropdown();
      this.onTouched();
      this.isEmiterTouched.emit(true);
    }, 150);
  }

  onMainInputChange(event: Event): void {
    if (!this.isOpen) return;
    const target = event.target as HTMLInputElement;
    this.searchControl.setValue(target.value, { emitEvent: true });
  }

  toggleDropdown(event?: Event): void {
    if (event) event.stopPropagation();
    if (this.isDisabled) return;
    this.isOpen ? this.closeDropdown() : this.openDropdown();
  }

  private openDropdown(): void {
    this.isOpen = true;
    this.loadInitialData().subscribe((clientes) => (this.clientes = clientes));
    if (!this.selectedCliente)
      this.searchControl.setValue('', { emitEvent: false });
  }

  private closeDropdown(): void {
    this.isOpen = false;
    this.updatePlaceholderText();
  }

  onOptionClick(cliente: ClienteOption): void {
    this.selectCliente(cliente);
    this.closeDropdown();
  }

  private selectCliente(cliente: ClienteOption | null): void {
    this.selectedCliente = cliente;
    this.selectedControl.setValue(cliente);

    if (cliente) this.onChange(cliente.idCliente);
    else this.onChange(null);

    this.clienteSelected.emit(cliente);
    this.updatePlaceholderText();
  }

  clearSelection(): void {
    this.selectCliente(null);
    this.searchControl.setValue('', { emitEvent: false });
    this.loadInitialClientes();
  }

  private updateDisabledState(): void {
    if (this.isDisabled) {
      this.searchControl.disable({ emitEvent: false });
      this.selectedControl.disable({ emitEvent: false });
    } else {
      this.searchControl.enable({ emitEvent: false });
      this.selectedControl.enable({ emitEvent: false });
    }
  }

  private updatePlaceholderText(): void {
    if (this.selectedCliente)
      this.placeholder = this.selectedCliente.displayText;
    else this.placeholder = 'Seleccionar cliente...';
  }

  // ***************
  //   FIX PRINCIPAL
  // ***************
  writeValue(value: any): void {
    if (!value) {
      this.selectCliente(null);
      return;
    }

    const id = typeof value === 'number' ? value : value.idCliente;

    // Si aún no cargó la lista, cargar primero y luego seleccionar
    if (this.clientes.length === 0) {
      this.loadInitialData().subscribe((list) => {
        this.clientes = list;
        this.findClienteById(id);
      });
      return;
    }

    this.findClienteById(id);
  }

  private findClienteById(id: number): void {
    const found = this.clientes.find((c) => c.idCliente === id);

    if (found) {
      this.selectCliente(found);
      return;
    }

    // Fallback: buscar por ID remoto, pero NO tomar raw[0]
    this.clienteService.getClientesCombo(String(id), undefined).subscribe({
      next: (resp) => {
        const raw = resp?.data ?? [];
        const list = this.mapClientesToOptions(raw);
        const cliente = list.find((c) => c.idCliente === id);
        if (cliente) this.selectCliente(cliente);
      },
      error: () => {},
    });
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

  // Template helpers
  hasErrors(): boolean {
    return !!(
      this.objectErrors &&
      (this.isTouched || this.selectedControl.touched)
    );
  }

  getErrorMessage(): string {
    if (!this.hasErrors()) return '';
    if (this.objectErrors?.required) return `${this.isLabel} es requerido`;
    if (typeof this.objectErrors === 'string') return this.objectErrors;
    return 'Campo inválido';
  }

  trackByCliente(index: number, cliente: ClienteOption): number {
    return cliente.idCliente;
  }
}

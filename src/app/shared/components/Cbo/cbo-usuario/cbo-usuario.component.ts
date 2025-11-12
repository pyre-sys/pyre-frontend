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
import { UsuarioService } from '../../../../services/usuario.service';

export interface UsuarioOption {
  id: number;
  legajo: string;
  nombre: string;
  apellido: string;
  dni: string;
  rolNombre: string;
  activo: boolean;
  displayText: string;
}

@Component({
  selector: 'app-cbo-usuario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cbo-usuario.component.html',
  styleUrls: ['../cbo.component.css', '../cbo-movimientos.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CboUsuarioComponent),
      multi: true,
    },
  ],
})
export class CboUsuarioComponent
  implements OnInit, OnDestroy, ControlValueAccessor
{
  // Internal FormControl for search
  searchControl = new FormControl('');
  selectedControl = new FormControl<UsuarioOption | null>(null);

  // Subscriptions for cleanup
  private subscriptions: Subscription[] = [];

  // ControlValueAccessor callbacks
  private onChange = (value: any) => {};
  private onTouched = () => {};

  // Component inputs
  @Input() isLabel: string = '';
  @Input() isId: string = '';
  @Input() isDisabled: boolean = false;
  @Input() placeholder: string = 'Seleccionar usuario...';
  @Input() showOnlyActive: boolean = true;
  @Input() objectErrors: any = null;
  @Input() isTouched: boolean = false;

  // Output events
  @Output() isEmiterTouched = new EventEmitter<boolean>();
  @Output() usuarioSelected = new EventEmitter<UsuarioOption | null>();

  // Component state
  usuarios: UsuarioOption[] = [];
  isLoading = false;
  isOpen = false; // Start collapsed
  selectedUsuario: UsuarioOption | null = null;

  constructor(private usuarioService: UsuarioService) {}

  ngOnInit(): void {
    this.setupSearchSubscription();
    this.loadInitialUsuarios();
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
          // Only search when dropdown is open
          if (!this.isOpen) {
            return of([]);
          }

          const searchTerm = (term || '').toString().trim();

          if (searchTerm.length >= 3) {
            return this.searchUsuarios(searchTerm);
          } else if (searchTerm.length === 0) {
            return this.loadInitialData();
          } else {
            return of([]);
          }
        })
      )
      .subscribe((usuarios) => {
        this.usuarios = usuarios;
      });

    this.subscriptions.push(searchSub);
  }

  private loadInitialUsuarios(): void {
    this.loadInitialData().subscribe((usuarios) => {
      this.usuarios = usuarios;
    });
  }

  private loadInitialData() {
    this.isLoading = true;
    const filters = this.showOnlyActive ? { estado: true } : {};

    return this.usuarioService.getUsers(1, 10, filters).pipe(
      switchMap((response) => {
        const rawList = response.data || [];
        const usuarios = this.mapUsuariosToOptions(rawList);
        this.isLoading = false;
        return of(usuarios);
      }),
      catchError((error) => {
        console.error('Error loading usuarios:', error);
        this.isLoading = false;
        return of([]);
      })
    );
  }

  private searchUsuarios(searchTerm: string) {
    this.isLoading = true;
    const filters: any = {};

    if (this.showOnlyActive) {
      filters.estado = true;
    }

    // Determine search type - could be legajo, nombre, or apellido
    if (/^\d+$/.test(searchTerm)) {
      // Numeric search - likely legajo or DNI
      filters.legajo = searchTerm;
    } else {
      // Text search - try nombre first
      filters.nombre = searchTerm;
    }

    return this.usuarioService.getUsers(1, 20, filters).pipe(
      switchMap((response) => {
        let rawList = response.data || [];

        // If no results with nombre, try apellido
        if (rawList.length === 0 && !filters.legajo) {
          delete filters.nombre;
          filters.apellido = searchTerm;

          return this.usuarioService.getUsers(1, 20, filters).pipe(
            switchMap((secondResponse) => {
              rawList = secondResponse.data || [];
              const usuarios = this.mapUsuariosToOptions(rawList);
              this.isLoading = false;
              return of(usuarios);
            }),
            catchError((error) => {
              console.error('Error searching usuarios by apellido:', error);
              this.isLoading = false;
              return of([]);
            })
          );
        }

        const usuarios = this.mapUsuariosToOptions(rawList);
        this.isLoading = false;
        return of(usuarios);
      }),
      catchError((error) => {
        console.error('Error searching usuarios:', error);
        this.isLoading = false;
        return of([]);
      })
    );
  }

  private mapUsuariosToOptions(usuarios: any[]): UsuarioOption[] {
    return usuarios.map((u) => ({
      id: u.id || u.idUsuario,
      legajo: u.legajo || '',
      nombre: u.nombre || u.firstName || '',
      apellido: u.apellido || u.lastName || '',
      dni: u.dni || '',
      rolNombre: u.rolNombre || u.rol || '',
      activo: u.activo !== undefined ? u.activo : true,
      displayText: this.buildDisplayText(u),
    }));
  }

  private buildDisplayText(usuario: any): string {
    const legajo = usuario.legajo || usuario.id;
    const nombre = usuario.nombre || usuario.firstName;
    const apellido = usuario.apellido || usuario.lastName;
    const rol = usuario.rolNombre || usuario.rol;

    let text = `${legajo} - ${nombre} ${apellido}`;
    if (rol) {
      text += ` (${rol})`;
    }
    return text;
  }

  // New methods for handling input interactions (igual que herramientas)
  onMainInputClick(): void {
    if (this.isDisabled) return;

    if (!this.isOpen) {
      this.openDropdown();
    }
  }

  onMainInputFocus(): void {
    if (this.isDisabled) return;

    if (!this.isOpen) {
      this.openDropdown();
    }
  }

  onMainInputBlur(): void {
    // Delay to allow option clicks
    setTimeout(() => {
      if (this.isOpen) {
        this.closeDropdown();
      }
      this.onTouched();
      this.isEmiterTouched.emit(true);
    }, 150);
  }

  onMainInputChange(event: Event): void {
    if (!this.isOpen) return;

    const target = event.target as HTMLInputElement;
    const value = target.value;
    this.searchControl.setValue(value, { emitEvent: true });
  }

  toggleDropdown(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    if (this.isDisabled) return;

    if (this.isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  private openDropdown(): void {
    this.isOpen = true;

    // Load initial data when opening
    this.loadInitialData().subscribe((usuarios) => {
      this.usuarios = usuarios;
    });

    // Clear search when opening if no selection
    if (!this.selectedUsuario) {
      this.searchControl.setValue('', { emitEvent: false });
    }
  }

  private closeDropdown(): void {
    this.isOpen = false;
    this.updatePlaceholderText();
  }

  onOptionClick(usuario: UsuarioOption): void {
    this.selectUsuario(usuario);
    this.closeDropdown();
  }

  private selectUsuario(usuario: UsuarioOption | null): void {
    this.selectedUsuario = usuario;
    this.selectedControl.setValue(usuario);

    if (usuario) {
      this.onChange(usuario.id);
    } else {
      this.onChange(null);
    }

    this.usuarioSelected.emit(usuario);
    this.updatePlaceholderText();
  }

  clearSelection(): void {
    this.selectUsuario(null);
    this.searchControl.setValue('', { emitEvent: false });
    this.loadInitialUsuarios();
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
    if (this.selectedUsuario) {
      this.placeholder = this.selectedUsuario.displayText;
    } else {
      this.placeholder = 'Seleccionar usuario...';
    }
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    if (value && typeof value === 'number') {
      this.findUsuarioById(value);
    } else if (value && typeof value === 'object') {
      this.selectUsuario(value);
    } else {
      this.selectUsuario(null);
    }
  }

  private findUsuarioById(id: number): void {
    // First check if it's in current list
    const found = this.usuarios.find((u) => u.id === id);
    if (found) {
      this.selectUsuario(found);
      return;
    }

    // If not found, make a specific request
    this.usuarioService.getUserById(id).subscribe({
      next: (response) => {
        const userData = response.data || response;
        if (userData) {
          const usuario = this.mapUsuariosToOptions([userData])[0];
          this.selectUsuario(usuario);
        }
      },
      error: () => {
        // If request fails, just set the ID
        this.onChange(id);
      },
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

  // Helper methods for template
  hasErrors(): boolean {
    return !!(
      this.objectErrors &&
      (this.isTouched || this.selectedControl.touched)
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

  trackByUsuario(index: number, usuario: UsuarioOption): number {
    return usuario.id;
  }
}

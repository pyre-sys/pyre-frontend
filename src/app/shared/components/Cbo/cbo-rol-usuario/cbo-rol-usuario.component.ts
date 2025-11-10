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
  FormsModule,
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormControl,
} from '@angular/forms';
import {
  RolUsuarioService,
  RolDto,
} from '../../../../services/rol-usuario.service';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
  of,
  Subject,
  map,
} from 'rxjs';

@Component({
  selector: 'app-cbo-rol-usuario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cbo-rol-usuario.component.html',
  styleUrls: ['./cbo-rol-usuario.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CboRolUsuarioComponent),
      multi: true,
    },
  ],
})
export class CboRolUsuarioComponent
  implements OnInit, OnDestroy, ControlValueAccessor
{
  // Inputs / outputs
  @Input() isLabel: string = '';
  @Input() isId: string = '';
  @Input() isDisabled: boolean = false;
  @Input() placeholder: string = 'Rol';
  @Input() showOnlyActive: boolean = true;
  @Input() objectErrors: any = null;
  @Input() isTouched: boolean = false;

  @Output() isEmiterTouched = new EventEmitter<boolean>();
  @Output() rolSelected = new EventEmitter<RolDto | null>();

  // State
  roles: RolDto[] = [];
  selectedRolId: number | null = null;
  isOpen = false;
  isLoading = false;
  searchControl = new FormControl('');
  private destroy$ = new Subject<void>();

  // ControlValueAccessor callbacks
  private onChange = (value: any) => {};
  private onTouched = () => {};

  constructor(private rolService: RolUsuarioService) {}

  ngOnInit(): void {
    this.setupSearch();
    this.loadRoles();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch(): void {
    this.searchControl.valueChanges
      .pipe(
        // normalizar a string para evitar problema de tipos (string | null)
        map((v: string | null) => (v ?? '') as string),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term: string) => {
          if (!term || term.length < 2) {
            return of(this.roles);
          }
          this.isLoading = true;
          const filtered = this.roles.filter((r) =>
            (r.nombreRol || '').toLowerCase().includes(term.toLowerCase())
          );
          return of(filtered);
        }),
        catchError((err) => {
          console.error('Error searching roles', err);
          return of([]);
        })
      )
      .subscribe((list: RolDto[]) => {
        this.roles = list || [];
        this.isLoading = false;
      });
  }

  private loadRoles(): void {
    this.isLoading = true;
    this.rolService.getRoles().subscribe({
      next: (resp: any) => {
        const data = resp?.data ?? [];
        this.roles = Array.isArray(data) ? data : [];
        if (this.showOnlyActive) {
          this.roles = this.roles.filter((r) => r.activo !== false);
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading roles', err);
        this.roles = [];
        this.isLoading = false;
      },
    });
  }

  // UI helpers
  selectedRolName(): string | null {
    const r = this.roles.find((x) => x.idRol === this.selectedRolId);
    return r ? r.nombreRol : null;
  }

  trackByRol(index: number, rol: RolDto): any {
    return rol.idRol ?? index;
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
      this.loadRoles();
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
    if (this.isOpen) this.loadRoles();
  }

  onOptionClick(rol: RolDto): void {
    this.selectedRolId = rol.idRol ?? null;
    this.isOpen = false;
    this.onChange(this.selectedRolId);
    this.onTouched();
    this.isEmiterTouched.emit(true);
    this.rolSelected.emit(rol);
  }

  clearSelection(): void {
    this.selectedRolId = null;
    this.searchControl.setValue('');
    this.onChange(null);
    this.onTouched();
    this.isEmiterTouched.emit(true);
    this.rolSelected.emit(null);
  }

  // ControlValueAccessor
  writeValue(value: any): void {
    this.selectedRolId =
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
      (this.isTouched || this.selectedRolId !== null)
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

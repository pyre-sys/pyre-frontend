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
import { EstadoFisicoHerramientaService } from '../../../../services/estado-fisico-herramienta.service';

@Component({
  selector: 'app-cbo-estado-fisico-herramienta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cbo-estado-fisico-herramienta.component.html',
  styleUrls: ['./cbo-estado-fisico-herramienta.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CboEstadoFisicoHerramientaComponent),
      multi: true,
    },
  ],
})
export class CboEstadoFisicoHerramientaComponent
  implements OnInit, OnDestroy, ControlValueAccessor
{
  @Input() isLabel: string = '';
  @Input() isId: string = 'estado-fisico-select';
  @Input() isDisabled: boolean = false;
  @Input() showOnlyActive: boolean = true;
  @Input() objectErrors: any = null;

  @Output() estadoFisicoSelected = new EventEmitter<any>();

  // Internal state
  estadosFisicos: any[] = [];
  // Lista maestra para mantener los datos originales al filtrar
  allEstadosFisicos: any[] = [];
  selectedEstadoFisico: any = null;
  searchControl = new FormControl('');
  isOpen = false; // Start collapsed
  isLoading = false;
  placeholder = 'Seleccionar estado físico...';

  private destroy$ = new Subject<void>();
  private onChange = (value: any) => {};
  private onTouched = () => {};

  constructor(private estadoFisicoService: EstadoFisicoHerramientaService) {}

  ngOnInit(): void {
    this.setupSearch();
    this.loadEstadosFisicos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    // Aceptar id (number) o objeto; comparar por id para evitar problemas de referencia
    if (!value) {
      this.selectedEstadoFisico = null;
      this.updatePlaceholder();
      return;
    }

    const incomingId = value?.idEstadoFisico ?? value?.id ?? value;
    const currentId =
      this.selectedEstadoFisico?.idEstadoFisico ??
      this.selectedEstadoFisico?.id ??
      null;

    if (incomingId === currentId) {
      return; // nada que cambiar
    }

    // Intentar encontrar el objeto en la lista maestra
    const found =
      this.allEstadosFisicos.find(
        (e) => (e.idEstadoFisico ?? e.id) === incomingId
      ) ?? null;

    if (found) {
      this.selectedEstadoFisico = found;
    } else {
      // Si no lo encontramos, crear un objeto mínimo para mostrar algo razonable
      this.selectedEstadoFisico = {
        idEstadoFisico: incomingId,
        descripcionEstado:
          value?.descripcionEstado ?? value?.nombre ?? value?.descripcion ?? '',
      };
    }

    this.updatePlaceholder();
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
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((searchTerm) => {
        if (!searchTerm || searchTerm.length < 2) {
          // Restaurar lista maestra si hay menos de 2 caracteres
          this.isLoading = false;
          this.estadosFisicos = [...this.allEstadosFisicos];
          return;
        }
        this.isLoading = true;
        const lower = searchTerm.toLowerCase();
        this.estadosFisicos = this.allEstadosFisicos.filter((estado) => {
          const desc = (
            estado.descripcionEstado ??
            estado.nombre ??
            estado.descripcion ??
            ''
          )
            .toString()
            .toLowerCase();
          return desc.includes(lower);
        });
        this.isLoading = false;
      });
  }

  private searchEstadosFisicos(searchTerm: string) {
    return this.estadoFisicoService.getEstadosFisicos().pipe(
      switchMap((response) => {
        const rawList = response.data || [];

        // Normalizar cada elemento a la forma esperada por el componente
        const normalized = (rawList as any[]).map((e) => ({
          // Priorizar propiedades ya existentes, luego caer en variantes comunes
          idEstadoFisico: e.idEstadoFisico ?? e.id ?? e.idEstado ?? null,
          descripcionEstado:
            e.descripcionEstado ?? e.nombre ?? e.descripcion ?? '',
          activo: e.activo ?? e.isActive ?? true,
          // Mantener todo lo demás por si se necesita
          ...e,
        }));

        // Filter client-side by search term
        const filteredList = normalized.filter((estadoFisico: any) => {
          const descripcion = (
            estadoFisico.descripcionEstado || ''
          ).toLowerCase();
          const searchLower = searchTerm.toLowerCase();
          return descripcion.includes(searchLower);
        });

        return of(filteredList);
      }),
      catchError((error) => {
        console.error('Error searching estados físicos:', error);
        return of([]);
      })
    );
  }

  private loadEstadosFisicos(): void {
    this.isLoading = true;
    this.estadoFisicoService
      .getEstadosFisicos()
      .pipe(
        catchError((error) => {
          console.error('Error loading estados físicos:', error);
          return of({ data: [] });
        })
      )
      .subscribe((response: any) => {
        const raw = response.data || [];
        // Normalizar y guardar lista maestra
        this.allEstadosFisicos = (raw as any[]).map((e) => ({
          idEstadoFisico: e.idEstadoFisico ?? e.id ?? e.idEstado ?? null,
          descripcionEstado:
            e.descripcionEstado ?? e.nombre ?? e.descripcion ?? '',
          activo: e.activo ?? e.isActive ?? true,
          ...e,
        }));
        // Aplicar filtro showOnlyActive si corresponde
        this.estadosFisicos = this.showOnlyActive
          ? this.allEstadosFisicos.filter((e) => e.activo !== false)
          : [...this.allEstadosFisicos];

        this.isLoading = false;
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
      this.loadEstadosFisicos();
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
    this.isOpen = true;
    this.loadEstadosFisicos();
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
      this.loadEstadosFisicos();
    } else {
      this.updatePlaceholder();
    }
  }

  onOptionClick(estadoFisico: any): void {
    // Asegurarse de usar el objeto normalizado (está en estadosFisicos)
    this.selectedEstadoFisico = estadoFisico;
    this.isOpen = false;
    this.updatePlaceholder();

    // Emit events: emitir objeto completo con idEstadoFisico y descripcion
    this.estadoFisicoSelected.emit(estadoFisico);
    // Notificar a Angular forms con el id o el objeto según preferencia (usamos objeto completo)
    this.onChange(estadoFisico);
    this.onTouched();
  }

  clearSelection(): void {
    this.selectedEstadoFisico = null;
    this.searchControl.setValue('');
    // Restaurar lista maestra
    this.estadosFisicos = [...this.allEstadosFisicos];
    this.updatePlaceholder();

    // Emit events
    this.estadoFisicoSelected.emit(null);
    this.onChange(null);
    this.onTouched();
  }

  private updatePlaceholder(): void {
    if (this.selectedEstadoFisico) {
      this.placeholder =
        this.selectedEstadoFisico.descripcionEstado ||
        this.selectedEstadoFisico.nombre ||
        'Estado físico seleccionado';
    } else {
      this.placeholder = 'Seleccionar estado físico...';
    }
  }

  trackByEstadoFisico(index: number, estadoFisico: any): any {
    return estadoFisico.idEstadoFisico ?? estadoFisico.id ?? index;
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

import {
  Component,
  EventEmitter,
  Output,
  OnInit,
  Input,
  OnChanges,
  SimpleChanges,
  HostListener,
  ElementRef,
  ViewChild,
  OnDestroy,
} from '@angular/core';
import { Subscription, debounceTime } from 'rxjs';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup,
} from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { AlertaService } from '../../../../services/alerta.service';

@Component({
  selector: 'app-obra-edit-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgbTooltipModule],
  templateUrl: './modal-obras.component.html',
  styleUrls: ['../../../../../styles/modal-style.css'], // Corregir la ruta relativa
})
export class ObraEditModalComponent implements OnInit, OnChanges {
  @Output() submit = new EventEmitter<{
    mode: 'create' | 'edit';
    data: any;
    onSuccess: () => void;
    onError: (error: any) => void;
  }>();
  @Output() close = new EventEmitter<void>();

  @Input() initialData: any | null = null;
  @Input() mode: 'create' | 'edit' = 'create';

  visible = true;
  form!: FormGroup;
  // Mensajes devueltos por el servidor para campos
  serverErrors: { [key: string]: string } = {};
  // Subscriptions guardadas para limpiar en ngOnDestroy
  private subscriptions: Subscription[] = [];
  // Controla si los campos están habilitados para edición en modo 'edit'
  editingEnabled: boolean = true;

  // Guardar el ID de la obra para edición
  private obraId: number | null = null;

  @ViewChild('firstInput') firstInput!: ElementRef;

  constructor(
    private fb: FormBuilder,
    private elementRef: ElementRef,
    private alertService: AlertaService
  ) {}

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    this.onCancel();
  }

  ngOnInit(): void {
    this.buildForm();
    if (this.initialData) this.patchForm(this.initialData);

    // Inicializar estado de edición: en modo 'edit' comienza deshabilitado, en 'create' habilitado
    this.editingEnabled = this.mode !== 'edit';
    this.setControlsDisabled(!this.editingEnabled);

    // Focus management
    setTimeout(() => {
      const firstInput = this.elementRef.nativeElement.querySelector(
        'input:not([style*="display:none"])'
      );
      if (firstInput) {
        firstInput.focus();
      }
    }, 150);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialData'] && !changes['initialData'].firstChange) {
      this.patchForm(this.initialData);
    }
    if (changes['mode'] && !changes['mode'].firstChange) {
      this.mode = changes['mode'].currentValue || 'create';
      this.editingEnabled = this.mode !== 'edit';
      this.setControlsDisabled(!this.editingEnabled);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.subscriptions = [];
  }

  // Activa la edición de los campos en modo 'edit'
  enableEditing(): void {
    this.editingEnabled = true;
    this.setControlsDisabled(false);
    setTimeout(() => {
      const firstInput = this.elementRef.nativeElement.querySelector(
        'input:not([disabled])'
      );
      if (firstInput) firstInput.focus();
    }, 50);
  }

  // Alterna entre modo lectura y edición desde el header
  toggleEditing(): void {
    this.editingEnabled = !this.editingEnabled;
    this.setControlsDisabled(!this.editingEnabled);
    if (this.editingEnabled) {
      setTimeout(() => {
        const firstInput = this.elementRef.nativeElement.querySelector(
          'input:not([style*="display:none"])'
        );
        if (firstInput) {
          firstInput.focus();
        }
      }, 50);
    }
  }

  private setControlsDisabled(disabled: boolean) {
    if (!this.form) return;
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      if (!control) return;

      if (disabled) {
        control.disable({ emitEvent: false });
      } else {
        control.enable({ emitEvent: false });
      }
    });
  }

  private buildForm() {
    this.form = this.fb.group({
      NombreObra: ['', [Validators.required, Validators.maxLength(150)]],
      Codigo: ['', [Validators.required, Validators.maxLength(20)]],
      Descripcion: ['', [Validators.maxLength(500)]],
      FechaInicio: [''],
      FechaFin: [''],
      Estado: ['Activo', [Validators.required]],
      Presupuesto: ['', [Validators.min(0)]],
      ResponsableTecnico: ['', [Validators.maxLength(100)]],
      Observaciones: ['', [Validators.maxLength(1000)]],
    });
  }

  private patchForm(data: any) {
    if (!this.form) this.buildForm();

    console.log('🔍 Patching form with data:', data);

    // Guardar el ID de la obra para edición
    this.obraId = data?.idObra ?? null;
    console.log('💾 Obra ID saved:', this.obraId);

    const mapped = {
      NombreObra: data?.nombreObra ?? '',
      Codigo: data?.codigo ?? data?.Codigo ?? '',
      Descripcion: data?.descripcion ?? data?.Descripcion ?? '',
      Direccion: data?.direccion ?? data?.Direccion ?? '',
      Ciudad: data?.ciudad ?? data?.Ciudad ?? '',
      Provincia: data?.provincia ?? data?.Provincia ?? '',
      FechaInicio: data?.fechaInicio ?? data?.FechaInicio ?? '',
      FechaFin: data?.fechaFin ?? '',
      Estado: data?.estado ?? data?.Estado ?? 'Activo',
      Presupuesto: data?.presupuesto ?? data?.Presupuesto ?? '',
      ResponsableTecnico:
        data?.responsableTecnico ?? data?.ResponsableTecnico ?? '',
      Observaciones: data?.observaciones ?? data?.Observaciones ?? '',
    };

    console.log('✅ Mapped data for form:', mapped);
    this.form.patchValue(mapped);
  }

  // Manejar errores devueltos por el backend
  private handleServerErrors(error: any) {
    try {
      this.serverErrors = {};
      const payload = error?.error ?? error;

      if (payload?.errors && typeof payload.errors === 'object') {
        Object.keys(payload.errors).forEach((k: string) => {
          const val = payload.errors[k];
          this.serverErrors[k] = Array.isArray(val)
            ? String(val[0])
            : String(val);
          const control = this.form.get(k) || this.form.get(this.toFormKey(k));
          if (control) {
            control.setErrors({ server: true });
            control.markAsTouched();
          }
        });
        return;
      }

      const msg = payload?.message || payload?.detail || payload?.error;
      if (msg && typeof msg === 'string') {
        if (/codigo/i.test(msg)) {
          this.serverErrors['Codigo'] = msg;
          this.form.get('Codigo')?.setErrors({ server: true });
          this.form.get('Codigo')?.markAsTouched();
        } else if (/nombre/i.test(msg)) {
          // mapear mensajes de "nombre" al control NombreObra
          this.serverErrors['NombreObra'] = msg;
          this.form.get('NombreObra')?.setErrors({ server: true });
          this.form.get('NombreObra')?.markAsTouched();
        } else {
          this.alertService.error(msg);
        }
      }
    } catch (e) {
      console.warn('handleServerErrors parse failed', e, error);
      this.alertService.error(
        'Ocurrió un error al procesar la respuesta del servidor'
      );
    }
  }

  private toFormKey(serverKey: string): string {
    const map: any = {
      codigo: 'Codigo',
      nombre: 'NombreObra',
      descripcion: 'Descripcion',
      direccion: 'Direccion',
    };
    return map[serverKey] ?? serverKey;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = { ...this.form.value };

    // En modo edición, incluir el ID de la obra como IdObra (backend espera IdObra)
    if (this.mode === 'edit' && this.obraId) {
      // Aseguramos el nombre de campo IdObra; mantenemos Id por compatibilidad si fuera necesario
      (value as any).IdObra = this.obraId;
      (value as any).Id = this.obraId;
      console.log('🔄 Including obra ID in update (IdObra):', this.obraId);
    }

    console.log('📤 Final data being sent:', value);

    this.submit.emit({
      mode: this.mode,
      data: value,
      onSuccess: () => {
        this.alertService.success(
          `La obra ha sido ${
            this.mode === 'create' ? 'creada' : 'actualizada'
          } exitosamente`,
          `¡Obra ${this.mode === 'create' ? 'Creada' : 'Actualizada'}!`
        );
        this.resetModal();
        this.visible = false;
        this.close.emit();
      },
      onError: (error: any) => {
        const errorMessage =
          error?.error?.message ||
          error?.message ||
          'Ocurrió un error inesperado';
        this.alertService.error(
          `Error al ${
            this.mode === 'create' ? 'crear' : 'actualizar'
          } la obra: ${errorMessage}`,
          `Error al ${this.mode === 'create' ? 'Crear' : 'Actualizar'} Obra`
        );
        this.handleServerErrors(error);
      },
    });
  }

  onCancel(): void {
    this.resetModal();
    this.close.emit();
    this.visible = false;
  }

  private resetModal(): void {
    this.obraId = null;
    this.form?.reset();
    this.serverErrors = {};
  }
}

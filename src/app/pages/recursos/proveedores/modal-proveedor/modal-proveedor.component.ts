import {
  Component,
  EventEmitter,
  Output,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  HostListener,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup,
} from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { AlertaService } from '../../../../services/alerta.service';

export interface ProveedorDto {
  idProveedor: number;
  nombreProveedor: string;
  contacto: string;
  cuit?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  descripcion?: string;
  activo: boolean;
}

@Component({
  selector: 'app-modal-proveedor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgbTooltipModule],
  templateUrl: './modal-proveedor.component.html',
  styleUrls: ['../../../../../styles/modal-style.css'],
})
export class ModalProveedorComponent implements OnInit, OnChanges {
  @Output() submit = new EventEmitter<{
    mode: 'create' | 'edit';
    data: any;
    onSuccess: () => void;
    onError: (error: any) => void;
  }>();
  @Output() close = new EventEmitter<void>();

  @Input() initialData: ProveedorDto | null = null;
  @Input() mode: 'create' | 'edit' = 'create';

  visible = true;
  form!: FormGroup;
  editingEnabled: boolean = true;
  serverErrors: { [key: string]: string } = {};
  private proveedorId: number | null = null;

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

  toggleEditing(): void {
    this.editingEnabled = !this.editingEnabled;
    this.setControlsDisabled(!this.editingEnabled);
    if (this.editingEnabled) {
      setTimeout(() => {
        const firstInput = this.elementRef.nativeElement.querySelector(
          'input:not([disabled])'
        );
        if (firstInput) firstInput.focus();
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
      nombreProveedor: ['', [Validators.required, Validators.maxLength(100)]],
      contacto: ['', [Validators.required, Validators.maxLength(100)]],
      cuit: ['', [Validators.maxLength(20)]],
      telefono: ['', [Validators.maxLength(50)]],
      email: ['', [Validators.email, Validators.maxLength(150)]],
      direccion: ['', [Validators.maxLength(200)]],
      descripcion: ['', [Validators.maxLength(1000)]],
      activo: [true, [Validators.required]],
    });
  }

  private patchForm(data: any) {
    if (!this.form) this.buildForm();

    console.log('🔍 Patching form with proveedor data:', data);

    this.proveedorId = data?.idProveedor ?? null;
    console.log('💾 Proveedor ID saved:', this.proveedorId);

    const mapped = {
      nombreProveedor: data?.nombreProveedor ?? '',
      contacto: data?.contacto ?? '',
      cuit: data?.cuit ?? '',
      telefono: data?.telefono ?? '',
      email: data?.email ?? '',
      direccion: data?.direccion ?? '',
      descripcion: data?.descripcion ?? '',
      activo: data?.activo ?? true,
    };

    console.log('✅ Mapped data for form:', mapped);
    this.form.patchValue(mapped);
  }

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
        this.alertService.error(msg);
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
      nombreProveedor: 'nombreProveedor',
      contacto: 'contacto',
      cuit: 'cuit',
      email: 'email',
    };
    return map[serverKey] ?? serverKey;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = { ...this.form.value };

    if (this.mode === 'edit' && this.proveedorId) {
      value.idProveedor = this.proveedorId;
      console.log('🔄 Including proveedor ID in update:', this.proveedorId);
    }

    console.log('📤 Final data being sent:', value);

    this.submit.emit({
      mode: this.mode,
      data: value,
      onSuccess: () => {
        this.alertService.success(
          `El proveedor ha sido ${
            this.mode === 'create' ? 'creado' : 'actualizado'
          } exitosamente`,
          `¡Proveedor ${this.mode === 'create' ? 'Creado' : 'Actualizado'}!`
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
          } el proveedor: ${errorMessage}`,
          `Error al ${
            this.mode === 'create' ? 'Crear' : 'Actualizar'
          } Proveedor`
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
    this.proveedorId = null;
    this.form?.reset();
    this.serverErrors = {};
  }
}

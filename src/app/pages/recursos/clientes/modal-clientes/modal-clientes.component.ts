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
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-modal-clientes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgbTooltipModule],
  templateUrl: './modal-clientes.component.html',
  styleUrls: ['../../../../../styles/modal-style.css'],
})
export class ModalClientesComponent implements OnInit, OnChanges, OnDestroy {
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
  serverErrors: { [key: string]: string } = {};
  private subscriptions: Subscription[] = [];

  // Nueva flag para controlar si los inputs están en modo edición o solo lectura
  editingEnabled: boolean = true;
  isEditorRole: boolean = false; // Nueva flag para roles con permiso de edición

  @ViewChild('firstInput') firstInput!: ElementRef;

  constructor(
    private fb: FormBuilder,
    private elementRef: ElementRef,
    private alertService: AlertaService,
    private authService: AuthService // Inyectar AuthService
  ) {}

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    this.onCancel();
  }

  ngOnInit(): void {
    this.buildForm();
    if (this.initialData) this.patchForm(this.initialData);
    this.editingEnabled = this.mode !== 'edit';
    this.setControlsDisabled(!this.editingEnabled);

    // Determinar si el usuario puede editar (roles 1 o 2)
    const user = this.authService.getUser?.() ?? null;
    const roleId = Number(user?.id_rol ?? user?.idRol ?? user?.id_acceso ?? 0);
    this.isEditorRole = roleId === 1 || roleId === 2;

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
      // sincronizar estado de edición cuando cambie el modo
      this.editingEnabled = this.mode !== 'edit';
      this.setControlsDisabled(!this.editingEnabled);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.subscriptions = [];
  }

  private buildForm() {
    this.form = this.fb.group({
      cuit: ['', [Validators.maxLength(11)]],
      nombre: ['', [Validators.required, Validators.maxLength(200)]],
      telefono: ['', [Validators.maxLength(50)]],
      email: ['', [Validators.email, Validators.maxLength(150)]],
      direccion: ['', [Validators.maxLength(255)]],
      // NOTA: eliminamos el control 'activo' — todos los clientes se crean activos por defecto en backend.
    });
  }

  private patchForm(data: any) {
    if (!this.form) this.buildForm();
    const mapped = {
      cuit: data?.cuit ?? data?.Cuit ?? '',
      nombre: data?.nombre ?? data?.Nombre ?? '',
      telefono: data?.telefono ?? data?.Telefono ?? '',
      email: data?.email ?? data?.Email ?? '',
      direccion: data?.direccion ?? data?.Direccion ?? '',
      // No mapear 'activo' aquí: lo maneja el backend
    };
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
        // intentar mapear mensajes comunes a campos
        if (/cuit/i.test(msg)) {
          this.serverErrors['cuit'] = msg;
          this.form.get('cuit')?.setErrors({ server: true });
          this.form.get('cuit')?.markAsTouched();
        } else if (/nombre/i.test(msg)) {
          this.serverErrors['nombre'] = msg;
          this.form.get('nombre')?.setErrors({ server: true });
          this.form.get('nombre')?.markAsTouched();
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
      Cuit: 'cuit',
      Nombre: 'nombre',
      Telefono: 'telefono',
      Email: 'email',
      Direccion: 'direccion',
    };
    return map[serverKey] ?? serverKey;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = { ...this.form.value };

    // Normalizar: eliminar keys vacías opcionales para no enviar datos extra
    if (!value.cuit) delete value.cuit;
    if (!value.telefono) delete value.telefono;
    if (!value.email) delete value.email;
    if (!value.direccion) delete value.direccion;

    // No enviar 'activo': el servidor asignará el valor por defecto (activo = true)
    if ('activo' in value) delete value.activo;

    // Si estamos en modo edición, asegurarnos de incluir el Id en el payload
    if (this.mode === 'edit') {
      // Buscar id en initialData por distintas claves posibles
      const existingId =
        this.initialData?.id ??
        this.initialData?.idCliente ??
        this.initialData?.clienteId ??
        this.initialData?.Id ??
        this.initialData?.IdCliente ??
        null;
      if (existingId != null) {
        // Normalizar a la clave esperada por el backend
        value.idCliente = Number(existingId);
      }
    }

    this.submit.emit({
      mode: this.mode,
      data: value,
      onSuccess: () => {
        this.alertService.success(
          `El cliente ha sido ${
            this.mode === 'create' ? 'creado' : 'actualizado'
          } exitosamente`,
          `¡Cliente ${this.mode === 'create' ? 'Creado' : 'Actualizado'}!`
        );
        this.resetModal();
        this.visible = false;
        this.close.emit();
      },
      onError: (error: any) => {
        this.handleServerErrors(error);
        const errorMessage =
          error?.error?.message ||
          error?.message ||
          'Ocurrió un error inesperado';
        this.alertService.error(
          `Error al ${
            this.mode === 'create' ? 'crear' : 'actualizar'
          } el cliente: ${errorMessage}`,
          `Error al ${this.mode === 'create' ? 'Crear' : 'Actualizar'} Cliente`
        );
      },
    });
  }

  onCancel(): void {
    this.resetModal();
    this.close.emit();
    this.visible = false;
  }

  // Habilita/deshabilita todos los controles del formulario (excluye none)
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

  // Toggle desde el header para pasar entre lectura/edición
  toggleEditing(): void {
    // Protección cliente: solo roles 1 y 2 pueden alternar edición
    if (!this.isEditorRole) return;

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

  private resetModal(): void {
    this.form?.reset();
    this.serverErrors = {};
    // revertir modo edición al cerrar: por defecto create = editable, edit = lectura
    this.editingEnabled = this.mode !== 'edit';
    this.setControlsDisabled(!this.editingEnabled);
  }
}

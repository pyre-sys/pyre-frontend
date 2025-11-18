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
import { Roles } from '../../../../shared/enums/roles';
import { AlertaService } from '../../../../services/alerta.service';

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
  rolesList: Array<{ id: number; label: string }> = [];
  showPassword = false;
  showConfirm = false;
  passwordsMatch: boolean | null = null;
  passwordFeedback: string = '';
  confirmFeedback: string = '';
  serverErrors: { [key: string]: string } = {};
  private subscriptions: Subscription[] = [];
  editingEnabled: boolean = true;
  private userId: number | null = null;

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
    this.updatePasswordValidators();
    if (this.initialData) this.patchForm(this.initialData);
    this.initRoles();

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
      if (key === 'PasswordConfirm') {
        return;
      }
      if (disabled) {
        control.disable({ emitEvent: false });
      } else {
        control.enable({ emitEvent: false });
      }
    });
  }

  private buildForm() {
    this.form = this.fb.group({
      Nombre: ['', [Validators.required, Validators.maxLength(100)]],
      Apellido: ['', [Validators.required, Validators.maxLength(100)]],
      Legajo: ['', [Validators.required, Validators.maxLength(5)]],
      Dni: ['', [Validators.required, Validators.maxLength(20)]],
      Email: ['', [Validators.email, Validators.maxLength(150)]],
      Telefono: ['', [Validators.maxLength(50)]],
      RolId: ['', [Validators.required]],
      AccedeAlSistema: [false],
      Avatar: ['', [Validators.maxLength(45)]],
      Password: ['', [Validators.minLength(6)]],
      PasswordConfirm: ['', [Validators.minLength(6)]],
    });
    this.form.get('PasswordConfirm')?.disable({ emitEvent: false });
  }

  private updatePasswordValidators() {
    const passwordControl = this.form.get('Password');
    const passwordConfirmControl = this.form.get('PasswordConfirm');

    if (this.mode === 'edit') {
      passwordControl?.setValidators([Validators.minLength(6)]);
      passwordConfirmControl?.setValidators([Validators.minLength(6)]);
    } else {
      passwordControl?.setValidators([Validators.minLength(6)]);
      passwordConfirmControl?.setValidators([Validators.minLength(6)]);
    }

    passwordControl?.updateValueAndValidity();
    passwordConfirmControl?.updateValueAndValidity();

    if (passwordConfirmControl && !passwordConfirmControl.disabled) {
      passwordConfirmControl.disable({ emitEvent: false });
    }

    this.subscribePasswordChanges();
  }

  private subscribePasswordChanges() {
    if (!this.form) return;

    const pw = this.form.get('Password');
    const pwc = this.form.get('PasswordConfirm');

    if (!pw || !pwc) return;

    this.subscriptions.forEach((s) => s.unsubscribe());
    this.subscriptions = [];

    const sub1 = pw.valueChanges
      .pipe(debounceTime(1500))
      .subscribe((val: any) => {
        const len = (val || '').length;
        if (len >= 6) {
          if (pwc.disabled) {
            if (this.mode === 'edit') {
              pwc.setValidators([Validators.minLength(6)]);
            } else {
              pwc.setValidators([Validators.required, Validators.minLength(6)]);
            }
            pwc.updateValueAndValidity({ emitEvent: false });
            pwc.enable({ emitEvent: false });
          }
          this.passwordsMatch = null;
          this.passwordFeedback = '';
          this.confirmFeedback = '';
          this.clearPasswordErrors();
        } else if (len > 0) {
          this.passwordsMatch = null;
          this.passwordFeedback =
            'La contraseña debe tener al menos 6 caracteres';
          this.confirmFeedback = '';
          this.form.get('Password')?.setErrors({ minlength: true });
          if (!pwc.disabled) {
            pwc.disable({ emitEvent: false });
            pwc.setValue('', { emitEvent: false });
          }
        } else {
          this.passwordsMatch = null;
          this.passwordFeedback = '';
          this.confirmFeedback = '';
          this.clearPasswordErrors();
          if (!pwc.disabled) {
            pwc.disable({ emitEvent: false });
            pwc.setValue('', { emitEvent: false });
          }
        }

        if (len >= 6 && (pwc.value || '').length >= 6) {
          this.checkPasswordsMatch();
        }
      });

    const sub2 = pwc.valueChanges
      .pipe(debounceTime(300))
      .subscribe((val: any) => {
        const pwLen = (pw.value || '').length;
        const pwcLen = (val || '').length;

        if (pwcLen === 0) {
          this.passwordsMatch = null;
          this.confirmFeedback = '';
          this.clearPasswordErrors();
        } else if (pwcLen > 0 && pwcLen < 6) {
          this.passwordsMatch = null;
          this.confirmFeedback =
            'La confirmación debe tener al menos 6 caracteres';
          this.form.get('PasswordConfirm')?.setErrors({ minlength: true });
        } else if (pwLen >= 6 && pwcLen >= 6) {
          this.checkPasswordsMatch();
        }
      });

    this.subscriptions.push(sub1, sub2);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.subscriptions = [];
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
        if (/dni/i.test(msg)) {
          this.serverErrors['Dni'] = msg;
          this.form.get('Dni')?.setErrors({ server: true });
          this.form.get('Dni')?.markAsTouched();
        } else if (/legaj/i.test(msg)) {
          this.serverErrors['Legajo'] = msg;
          this.form.get('Legajo')?.setErrors({ server: true });
          this.form.get('Legajo')?.markAsTouched();
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
      legajo: 'Legajo',
      dni: 'Dni',
      Nombre: 'Nombre',
      apellido: 'Apellido',
    };
    return map[serverKey] ?? serverKey;
  }

  private checkPasswordsMatch() {
    if (!this.form) return;
    const pw = this.form.get('Password')?.value || '';
    const pwc = this.form.get('PasswordConfirm')?.value || '';

    if (!pw && !pwc) {
      this.passwordsMatch = null;
      this.confirmFeedback = '';
      this.clearPasswordErrors();
      return;
    }

    if (pw === pwc) {
      this.passwordsMatch = true;
      this.confirmFeedback = 'Las contraseñas coinciden';
      this.clearPasswordErrors();
    } else {
      this.passwordsMatch = false;
      this.confirmFeedback = 'Las contraseñas no coinciden';
      this.form.get('Password')?.setErrors({ mismatch: true });
      this.form.get('PasswordConfirm')?.setErrors({ mismatch: true });
    }
  }

  private clearPasswordErrors() {
    const pwControl = this.form.get('Password');
    const pwcControl = this.form.get('PasswordConfirm');
    if (pwControl) {
      const errs = pwControl.errors;
      if (errs) {
        const { mismatch, minlength, ...rest } = errs as any;
        const remaining = Object.keys(rest).length ? rest : null;
        pwControl.setErrors(remaining);
      }
    }
    if (pwcControl) {
      const errs2 = pwcControl.errors;
      if (errs2) {
        const { mismatch, minlength, ...rest2 } = errs2 as any;
        const remaining2 = Object.keys(rest2).length ? rest2 : null;
        pwcControl.setErrors(remaining2);
      }
    }
  }

  private initRoles() {
    this.rolesList = Object.keys(Roles)
      .filter((k) => Number.isNaN(Number(k)))
      .map((name) => ({ id: (Roles as any)[name] as number, label: name }));
  }

  private patchForm(data: any) {
    if (!this.form) this.buildForm();

    this.userId =
      data?.id ?? data?.Id ?? data?.cliente_id ?? data?.clienteId ?? null;

    const mapped = {
      Nombre: data?.nombre ?? data?.Nombre ?? '',
      Apellido: data?.apellido ?? data?.Apellido ?? '',
      Legajo: data?.legajo ?? data?.Legajo ?? '',
      Dni: data?.dni ?? data?.Dni ?? '',
      Email: data?.email ?? data?.Email ?? '',
      Telefono: data?.telefono ?? data?.Telefono ?? '',
      RolId:
        this.getRolIdFromRolNombre(data?.rolNombre) ??
        data?.RolId ??
        data?.rolId ??
        '',
      AccedeAlSistema: data?.accedeAlSistema ?? data?.AccedeAlSistema ?? true,
      Password: '',
      PasswordConfirm: '',
    };

    this.form.patchValue(mapped);
    this.updatePasswordValidators();
  }

  private getRolIdFromRolNombre(rolNombre: string): number | null {
    if (!rolNombre) return null;
    const normalize = (s: string) =>
      s
        .toString()
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '');
    const key = normalize(rolNombre);

    const roleMapNorm: { [key: string]: number } = {
      superadmin: Roles.SuperAdmin,
      'super-admin': Roles.SuperAdmin,
      'super admin': Roles.SuperAdmin,
      administrativo: Roles.Administrativo,
      administrador: Roles.Administrativo,
      admin: Roles.Administrativo,
      supervisor: Roles.Supervisor,
      operario: Roles.Operario,
      operador: Roles.Operario,
    };

    return roleMapNorm[key] ?? null;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const pw = this.form.get('Password')?.value;
    const pwc = this.form.get('PasswordConfirm')?.value;

    if (pw || pwc) {
      if (pw !== pwc) {
        this.form.get('Password')?.setErrors({ mismatch: true });
        this.form.get('PasswordConfirm')?.setErrors({ mismatch: true });
        this.form.get('Password')?.markAsTouched();
        this.form.get('PasswordConfirm')?.markAsTouched();
        return;
      }
    }

    const { PasswordConfirm, ...formData } = this.form.value;
    const value = { ...formData };
    if (this.mode === 'edit' && !pw) {
      delete value.Password;
    }

    if (this.mode === 'edit' && this.userId) {
      value.Id = this.userId;
    } else if (this.mode === 'create') {
      // creating
    } else {
      this.alertService.error(
        'Error: No se pudo identificar el cliente a editar'
      );
      return;
    }

    this.submit.emit({
      mode: this.mode,
      data: value,
      onSuccess: () => {
        this.alertService.success(
          `El usuario ha sido ${
            this.mode === 'create' ? 'creado' : 'actualizado'
          } exitosamente`,
          `¡Usuario ${this.mode === 'create' ? 'Creado' : 'Actualizado'}!`
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
          } el usuario: ${errorMessage}`,
          `Error al ${this.mode === 'create' ? 'Crear' : 'Actualizar'} Usuario`
        );
      },
    });
  }

  onCancel(): void {
    this.resetModal();
    this.close.emit();
    this.visible = false;
  }

  private resetModal(): void {
    this.userId = null;
    this.form?.reset();
  }
}

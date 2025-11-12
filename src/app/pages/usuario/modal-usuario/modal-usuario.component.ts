import { Component, EventEmitter, Output, OnInit, Input, OnChanges, SimpleChanges, HostListener, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { Subscription, debounceTime } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { Roles } from '../../../shared/enums/roles';
import { AlertaService } from '../../../services/alerta.service';

@Component({
  selector: 'app-usuarios-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgbTooltipModule],
  templateUrl: './modal-usuario.component.html',
  styleUrls: ['./modal-usuario.component.css']
})
export class UsuariosModalComponent implements OnInit, OnChanges {
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
  // Flag para indicar si las contraseñas coinciden
  passwordsMatch: boolean | null = null;
  // Mensajes específicos para cada campo
  passwordFeedback: string = '';
  confirmFeedback: string = '';
  // Mensajes devueltos por el servidor para campos (p.ej. "Dni ya existe")
  serverErrors: { [key: string]: string } = {};
  // Subscriptions guardadas para limpiar en ngOnDestroy
  private subscriptions: Subscription[] = [];
  // Controla si los campos están habilitados para edición en modo 'edit'
  editingEnabled: boolean = true;

  // ✅ Guardar el ID del usuario para edición
  private userId: number | null = null;

  @ViewChild('firstInput') firstInput!: ElementRef;

  constructor(
    private fb: FormBuilder,
    private elementRef: ElementRef,
    private alertService: AlertaService
  ) { }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent) {
    this.onCancel();
  }

  ngOnInit(): void {
    this.buildForm();
    this.updatePasswordValidators(); // ✅ Configurar validaciones iniciales
    if (this.initialData) this.patchForm(this.initialData);
    this.initRoles();

    // Inicializar estado de edición según modo
    this.editingEnabled = this.mode !== 'edit';
    this.setControlsDisabled(!this.editingEnabled);

    // Focus management - focus the first input after view initialization
    setTimeout(() => {
      const firstInput = this.elementRef.nativeElement.querySelector('input:not([style*="display:none"])');
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
      // actualizar estado de edición cuando cambie el modo
      this.editingEnabled = this.mode !== 'edit';
      this.setControlsDisabled(!this.editingEnabled);
    }
  }

  // Activa la edición de los campos en modo 'edit'
  enableEditing(): void {
    this.editingEnabled = true;
    this.setControlsDisabled(false);
    // poner foco en el primer input editable
    setTimeout(() => {
      const firstInput = this.elementRef.nativeElement.querySelector('input:not([disabled])');
      if (firstInput) firstInput.focus();
    }, 50);
  }

  // Alterna entre modo lectura y edición desde el header
  toggleEditing(): void {
    this.editingEnabled = !this.editingEnabled;
    this.setControlsDisabled(!this.editingEnabled);
    if (this.editingEnabled) {
      // focus al primer input editable
      setTimeout(() => {
        const firstInput = this.elementRef.nativeElement.querySelector('input:not([disabled])');
        if (firstInput) firstInput.focus();
      }, 50);
    }
  }

  private setControlsDisabled(disabled: boolean) {
    if (!this.form) return;
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      if (!control) return;

      // PasswordConfirm tiene lógica especial: solo se habilita cuando Password >= 6 chars
      if (key === 'PasswordConfirm') {
        // No modificar PasswordConfirm aquí, se maneja en subscribePasswordChanges
        return;
      }

      if (disabled) {
        control.disable({ emitEvent: false });
      } else {
        control.enable({ emitEvent: false });
      }
    });
    // En modo edit, las contraseñas siguen vacías y opcionales hasta que el usuario las ingrese
    if (this.mode === 'edit' && disabled) {
      // dejar Password y PasswordConfirm deshabilitados visualmente
    }
  }

  private buildForm() {
    this.form = this.fb.group({
      Nombre: ['', [Validators.required, Validators.maxLength(100)]],
      Apellido: ['', [Validators.required, Validators.maxLength(100)]],
      Legajo: ['', [Validators.required, Validators.maxLength(5)]],
      Dni: ['', [Validators.required, Validators.maxLength(20)]],
      Email: ['', [Validators.email, Validators.maxLength(150)]],
      Telefono: ['', [Validators.maxLength(50)]],
      // Inicialmente vacío para forzar la selección por parte del usuario
      RolId: ['', [Validators.required]],
      AccedeAlSistema: [false],
      Avatar: ['', [Validators.maxLength(45)]],
      Password: ['', [Validators.minLength(6)]],
      PasswordConfirm: ['', [Validators.minLength(6)]]
    });
    // Inicialmente deshabilitamos el campo Confirm hasta que Password tenga al menos 6 chars
    this.form.get('PasswordConfirm')?.disable({ emitEvent: false });
  }

  private updatePasswordValidators() {
    const passwordControl = this.form.get('Password');
    const passwordConfirmControl = this.form.get('PasswordConfirm');

    if (this.mode === 'edit') {
      // En modo edición: contraseña opcional
      passwordControl?.setValidators([Validators.minLength(6)]);
      passwordConfirmControl?.setValidators([Validators.minLength(6)]);
    } else {
      // En modo creación: contraseña opcional según DTO, pero UI puede exigir 6 chars si se proporciona
      // Mantendremos la validación mínima en cliente pero no obligatoria para permitir workflows con creación sin password si lo desea el backend
      passwordControl?.setValidators([Validators.minLength(6)]);
      passwordConfirmControl?.setValidators([Validators.minLength(6)]);
    }

    passwordControl?.updateValueAndValidity();
    passwordConfirmControl?.updateValueAndValidity();

    // Asegurar que PasswordConfirm esté deshabilitado inicialmente
    if (passwordConfirmControl && !passwordConfirmControl.disabled) {
      passwordConfirmControl.disable({ emitEvent: false });
    }

    // Suscribir cambios para validación en tiempo real
    this.subscribePasswordChanges();
  }

  private subscribePasswordChanges() {
    if (!this.form) return;

    const pw = this.form.get('Password');
    const pwc = this.form.get('PasswordConfirm');

    if (!pw || !pwc) return;

    // Limpiar subs previas para evitar duplicados
    this.subscriptions.forEach(s => s.unsubscribe());
    this.subscriptions = [];

    // Debounce más largo para el primer campo (1.5 segundos) para mostrar mensaje de longitud
    const sub1 = pw.valueChanges.pipe(debounceTime(1500)).subscribe((val: any) => {
      const len = (val || '').length;
      if (len >= 6) {
        // habilitar confirm si está deshabilitado
        if (pwc.disabled) {
          // establecer validadores según modo
          if (this.mode === 'edit') {
            pwc.setValidators([Validators.minLength(6)]);
          } else {
            pwc.setValidators([Validators.required, Validators.minLength(6)]);
          }
          pwc.updateValueAndValidity({ emitEvent: false });
          pwc.enable({ emitEvent: false });
        }
        // limpiar mensajes de ambos campos al habilitar confirm
        this.passwordsMatch = null;
        this.passwordFeedback = '';
        this.confirmFeedback = '';
        this.clearPasswordErrors();
      } else if (len > 0) {
        // si tiene contenido pero menos de 6, mostrar mensaje después del debounce SOLO en el primer campo
        this.passwordsMatch = null;
        this.passwordFeedback = 'La contraseña debe tener al menos 6 caracteres';
        this.confirmFeedback = '';
        this.form.get('Password')?.setErrors({ minlength: true });
        // mantener confirm deshabilitado
        if (!pwc.disabled) {
          pwc.disable({ emitEvent: false });
          pwc.setValue('', { emitEvent: false });
        }
      } else {
        // campo vacío, limpiar estado
        this.passwordsMatch = null;
        this.passwordFeedback = '';
        this.confirmFeedback = '';
        this.clearPasswordErrors();
        if (!pwc.disabled) {
          pwc.disable({ emitEvent: false });
          pwc.setValue('', { emitEvent: false });
        }
      }

      // Si ambos cumplen longitud, comprobar coincidencia
      if (len >= 6 && (pwc.value || '').length >= 6) {
        this.checkPasswordsMatch();
      }
    });

    const sub2 = pwc.valueChanges.pipe(debounceTime(300)).subscribe((val: any) => {
      const pwLen = (pw.value || '').length;
      const pwcLen = (val || '').length;

      if (pwcLen === 0) {
        // limpiar estado si el usuario borró confirm
        this.passwordsMatch = null;
        this.confirmFeedback = '';
        this.clearPasswordErrors();
      } else if (pwcLen > 0 && pwcLen < 6) {
        // validación individual del segundo campo: mínimo 6 caracteres - mostrar SOLO en el segundo campo
        this.passwordsMatch = null;
        this.confirmFeedback = 'La confirmación debe tener al menos 6 caracteres';
        this.form.get('PasswordConfirm')?.setErrors({ minlength: true });
      } else if (pwLen >= 6 && pwcLen >= 6) {
        // ambos tienen al menos 6, comparar coincidencia - mostrar resultado en el segundo campo
        this.checkPasswordsMatch();
      }
    });

    this.subscriptions.push(sub1, sub2);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
    this.subscriptions = [];
  }

  // Manejar errores devueltos por el backend (p.ej. Dni o Legajo duplicados)
  private handleServerErrors(error: any) {
    try {
      this.serverErrors = {};
      const payload = error?.error ?? error;
      // Estructura posible: { errors: { Dni: ['...'], Legajo: ['...'] } }
      if (payload?.errors && typeof payload.errors === 'object') {
        Object.keys(payload.errors).forEach((k: string) => {
          const val = payload.errors[k];
          // val puede ser array o string
          this.serverErrors[k] = Array.isArray(val) ? String(val[0]) : String(val);
          const control = this.form.get(k) || this.form.get(this.toFormKey(k));
          if (control) {
            control.setErrors({ server: true });
            control.markAsTouched();
          }
        });
        return;
      }

      // Estructura alternativa: { message: 'Detalle: Dni ya existe' }
      const msg = payload?.message || payload?.detail || payload?.error;
      if (msg && typeof msg === 'string') {
        // Intentar detectar campo en el mensaje
        if (/dni/i.test(msg)) {
          this.serverErrors['Dni'] = msg;
          this.form.get('Dni')?.setErrors({ server: true });
          this.form.get('Dni')?.markAsTouched();
        } else if (/legaj/i.test(msg)) {
          this.serverErrors['Legajo'] = msg;
          this.form.get('Legajo')?.setErrors({ server: true });
          this.form.get('Legajo')?.markAsTouched();
        } else {
          // fallback: mostrar error general
          this.alertService.error(msg);
        }
      }
    } catch (e) {
      console.warn('handleServerErrors parse failed', e, error);
      this.alertService.error('Ocurrió un error al procesar la respuesta del servidor');
    }
  }

  private toFormKey(serverKey: string): string {
    // Mapear posibles claves del servidor a nombres de formulario si difieren
    const map: any = {
      'legajo': 'Legajo',
      'dni': 'Dni',
      'Nombre': 'Nombre',
      'apellido': 'Apellido'
    };
    return map[serverKey] ?? serverKey;
  }

  private checkPasswordsMatch() {
    if (!this.form) return;
    const pw = this.form.get('Password')?.value || '';
    const pwc = this.form.get('PasswordConfirm')?.value || '';

    // Si ambos campos vacíos consideramos que no hay un estado de coincidencia
    if (!pw && !pwc) {
      this.passwordsMatch = null;
      this.confirmFeedback = '';
      this.clearPasswordErrors();
      return;
    }

    // Ambos campos ya tienen al menos 6 caracteres, validar coincidencia
    if (pw === pwc) {
      this.passwordsMatch = true;
      this.confirmFeedback = 'Las contraseñas coinciden';
      this.clearPasswordErrors();
    } else {
      // No coinciden - mostrar mensaje en el segundo campo
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
    // Build roles list from enum (exclude reverse numeric keys)
    this.rolesList = Object.keys(Roles)
      .filter(k => Number.isNaN(Number(k)))
      .map(name => ({ id: (Roles as any)[name] as number, label: name }));
  }

  private patchForm(data: any) {
    if (!this.form) this.buildForm();

    console.log('🔍 Patching form with data:', data); // Debug log

    // ✅ Guardar el ID del usuario para edición
    this.userId = data?.id ?? data?.Id ?? data?.usuario_id ?? null;
    console.log('💾 User ID saved:', this.userId);

    const mapped = {
      // ✅ Mapeo actualizado según respuesta del backend
      Nombre: data?.nombre ?? data?.Nombre ?? '',
      Apellido: data?.apellido ?? data?.Apellido ?? '',
      Legajo: data?.legajo ?? data?.Legajo ?? '',
      Dni: data?.dni ?? data?.Dni ?? '',
      Email: data?.email ?? data?.Email ?? '',
      Telefono: data?.telefono ?? data?.Telefono ?? '',
      // Para RolId necesitamos mapear desde rolNombre o crear un mapeo
      // Si no viene rol, dejamos el control vacío para que el usuario deba seleccionar uno
      RolId: this.getRolIdFromRolNombre(data?.rolNombre) ?? data?.RolId ?? data?.rolId ?? '',
      AccedeAlSistema: data?.accedeAlSistema ?? data?.AccedeAlSistema ?? true,
      Password: '', // Siempre vacío para seguridad
      PasswordConfirm: '' // Siempre vacío para seguridad
    };

    console.log('✅ Mapped data for form:', mapped); // Debug log
    this.form.patchValue(mapped);

    // ✅ Actualizar validaciones después de patchear
    this.updatePasswordValidators();
  }

  private getRolIdFromRolNombre(rolNombre: string): number | null {
    if (!rolNombre) return null;
    // Normalizar string: quitar espacios, lowercase y reemplazar caracteres acentuados
    const normalize = (s: string) => s.toString().trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const key = normalize(rolNombre);

    const roleMapNorm: { [key: string]: number } = {
      'superadmin': Roles.SuperAdmin,
      'super-admin': Roles.SuperAdmin,
      'super admin': Roles.SuperAdmin,
      'administrativo': Roles.Administrativo,
      'administrador': Roles.Administrativo,
      'admin': Roles.Administrativo,
      'supervisor': Roles.Supervisor,
      'operario': Roles.Operario,
      'operador': Roles.Operario
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

    // ✅ Validar contraseñas solo si se proporcionaron
    if (pw || pwc) {
      if (pw !== pwc) {
        // marcar errores simples en los controles
        this.form.get('Password')?.setErrors({ mismatch: true });
        this.form.get('PasswordConfirm')?.setErrors({ mismatch: true });
        this.form.get('Password')?.markAsTouched();
        this.form.get('PasswordConfirm')?.markAsTouched();
        return;
      }
    }

    // Preparar datos para envío
    const { PasswordConfirm, ...formData } = this.form.value;

    // ✅ En modo edición, solo incluir Password si tiene valor
    const value = { ...formData };
    if (this.mode === 'edit' && !pw) {
      delete value.Password; // No enviar campo Password vacío
    }

    // ✅ En modo edición, incluir el ID del usuario
    if (this.mode === 'edit' && this.userId) {
      value.Id = this.userId; // ⚠️ Incluir ID para validación del backend
      console.log('🔄 Including user ID in update:', this.userId);
    }

    console.log('📤 Final data being sent:', value); // Debug: ver datos finales

    this.submit.emit({
      mode: this.mode,
      data: value,
      onSuccess: () => {
        this.alertService.success(
          `El usuario ha sido ${this.mode === 'create' ? 'creado' : 'actualizado'} exitosamente`,
          `¡Usuario ${this.mode === 'create' ? 'Creado' : 'Actualizado'}!`
        );
        this.resetModal(); // ✅ Limpiar estado al completar
        this.visible = false;
        this.close.emit();
      },
      onError: (error: any) => {
        const errorMessage = error?.error?.message || error?.message || 'Ocurrió un error inesperado';
        this.alertService.error(
          `Error al ${this.mode === 'create' ? 'crear' : 'actualizar'} el usuario: ${errorMessage}`,
          `Error al ${this.mode === 'create' ? 'Crear' : 'Actualizar'} Usuario`
        );
      }
    });
  }

  onCancel(): void {
    this.resetModal();
    this.close.emit();
    this.visible = false;
  }

  private resetModal(): void {
    this.userId = null; // ✅ Limpiar ID al cerrar
    this.form?.reset();
  }
}

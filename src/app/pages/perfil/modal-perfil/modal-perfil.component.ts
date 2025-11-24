import {
  Component,
  Output,
  EventEmitter,
  Input,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-modal-perfil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgbTooltipModule],
  templateUrl: './modal-perfil.component.html',
  styleUrls: ['../../../../styles/modal-style.css'],
})
export class ModalPerfilComponent implements OnInit, OnDestroy {
  @Input() user: any | null = null;
  @Output() save = new EventEmitter<{
    currentPassword: string;
    newPassword: string;
  }>();
  @Output() close = new EventEmitter<void>();

  form: FormGroup;

  // UI / validation helpers (copiados de modal-usuario)
  showNewPassword = false;
  showConfirm = false;
  passwordsMatch: boolean | null = null;
  passwordFeedback: string = '';
  confirmFeedback: string = '';

  // Nuevo: control para delay antes de habilitar el botón Cambiar
  allowSubmit: boolean = false;
  private submitDelayMs = 400; // retraso en ms antes de permitir submit
  private submitDelayTimer: any = null;

  private subscriptions: Subscription[] = [];

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      currentPassword: ['', [Validators.required, Validators.minLength(3)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(6)]],
    });

    // inicialmente deshabilitar confirm (se habilita cuando newPassword >= 6)
    this.form.get('confirmPassword')?.disable({ emitEvent: false });
  }

  ngOnInit(): void {
    this.subscribePasswordChanges();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.subscriptions = [];
    this.clearSubmitDelayTimer();
  }

  // Suscripciones y lógica de validación en tiempo real
  private subscribePasswordChanges(): void {
    const pw = this.form.get('newPassword');
    const pwc = this.form.get('confirmPassword');
    if (!pw || !pwc) return;

    // limpiar subs previas
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.subscriptions = [];

    // Debounce para newPassword
    const s1 = pw.valueChanges.pipe(debounceTime(700)).subscribe((val: any) => {
      const len = (val || '').length;
      if (len >= 6) {
        // habilitar confirm si estaba deshabilitado
        if (pwc.disabled) {
          pwc.setValidators([Validators.required, Validators.minLength(6)]);
          pwc.updateValueAndValidity({ emitEvent: false });
          pwc.enable({ emitEvent: false });
        }
        this.passwordFeedback = '';
        // si confirm ya tiene valor, comprobar coincidencia
        if ((pwc.value || '').length >= 6) {
          this.checkPasswordsMatch();
        } else {
          this.passwordsMatch = null;
          this.confirmFeedback = '';
        }
      } else if (len > 0) {
        // longitud insuficiente
        this.passwordFeedback =
          'La contraseña debe tener al menos 6 caracteres';
        this.passwordsMatch = null;
        this.confirmFeedback = '';
        this.form.get('newPassword')?.setErrors({ minlength: true });
        if (!pwc.disabled) {
          pwc.disable({ emitEvent: false });
          pwc.setValue('', { emitEvent: false });
        }
      } else {
        // vaciado
        this.passwordFeedback = '';
        this.confirmFeedback = '';
        this.passwordsMatch = null;
        this.clearPasswordErrors();
        if (!pwc.disabled) {
          pwc.disable({ emitEvent: false });
          pwc.setValue('', { emitEvent: false });
        }
      }
    });

    // Debounce para confirmPassword
    const s2 = pwc.valueChanges
      .pipe(debounceTime(300))
      .subscribe((val: any) => {
        const pwVal = (pw.value || '').length;
        const pwcLen = (val || '').length;

        if (pwcLen === 0) {
          this.passwordsMatch = null;
          this.confirmFeedback = '';
          this.clearPasswordErrors();
        } else if (pwcLen > 0 && pwcLen < 6) {
          this.passwordsMatch = null;
          this.confirmFeedback =
            'La confirmación debe tener al menos 6 caracteres';
          this.form.get('confirmPassword')?.setErrors({ minlength: true });
        } else if (pwVal >= 6 && pwcLen >= 6) {
          this.checkPasswordsMatch();
        }
      });

    this.subscriptions.push(s1, s2);
  }

  private checkPasswordsMatch(): void {
    const pw = this.form.get('newPassword')?.value || '';
    const pwc = this.form.get('confirmPassword')?.value || '';
    if (!pw && !pwc) {
      this.passwordsMatch = null;
      this.confirmFeedback = '';
      this.clearPasswordErrors();
      this.clearSubmitDelayTimer();
      this.allowSubmit = false;
      return;
    }

    if (pw === pwc) {
      this.passwordsMatch = true;
      this.confirmFeedback = 'Las contraseñas coinciden';
      this.clearPasswordErrors();

      // Programar habilitación del botón con delay solo si el form es válido
      this.scheduleAllowSubmit();
    } else {
      this.passwordsMatch = false;
      this.confirmFeedback = 'Las contraseñas no coinciden';
      this.form.get('newPassword')?.setErrors({ mismatch: true });
      this.form.get('confirmPassword')?.setErrors({ mismatch: true });

      // Cancelar cualquier timer y bloquear submit
      this.clearSubmitDelayTimer();
      this.allowSubmit = false;
    }
  }

  private scheduleAllowSubmit(): void {
    this.clearSubmitDelayTimer();
    if (this.form.invalid) {
      this.allowSubmit = false;
      return;
    }
    this.submitDelayTimer = window.setTimeout(() => {
      if (!this.form.invalid && this.passwordsMatch === true)
        this.allowSubmit = true;
      else this.allowSubmit = false;
      this.submitDelayTimer = null;
    }, this.submitDelayMs);
  }

  private clearSubmitDelayTimer(): void {
    if (this.submitDelayTimer != null) {
      clearTimeout(this.submitDelayTimer);
      this.submitDelayTimer = null;
    }
  }

  private clearPasswordErrors(): void {
    const pwControl = this.form.get('newPassword');
    const pwcControl = this.form.get('confirmPassword');

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

  onSubmit() {
    if (
      this.form.invalid ||
      this.passwordsMatch === false ||
      !this.allowSubmit
    ) {
      this.form.markAllAsTouched();
      return;
    }
    const currentPassword = this.form.value.currentPassword;
    const newPassword = this.form.value.newPassword;
    this.save.emit({ currentPassword, newPassword });
  }

  onClose() {
    this.close.emit();
  }
}

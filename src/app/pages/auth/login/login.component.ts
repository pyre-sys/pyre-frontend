import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { LoginService } from '../../../services/login.service';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component'; // nuevo import
import { ToastModalComponent } from '../../../shared/components/toast-modal/toast-modal.component'; // nuevo import

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    CommonModule,
    NgbTooltipModule,
    SpinnerComponent,
    ToastModalComponent, // registrar ToastModalComponent
  ], // registrar SpinnerComponent y ToastModalComponent
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage: string | null = null;
  isDarkMode: boolean = true;
  showPassword: boolean = false;

  // Nueva bandera usada por el spinner
  isLoading: boolean = false;

  // Mantener visible el spinner al menos 3000 ms
  private readonly ARTIFICIAL_DELAY_MS = 3000;

  // Tiempo de inicio del intento de login
  private loginStartTime: number | null = null;

  // Nuevo: control para el toast-modal
  toastMessage: string = '';
  toastVisible: boolean = false;
  toastType: string = 'error'; // 'success' | 'error' | 'warning' etc.

  constructor(
    private fb: FormBuilder,
    private loginService: LoginService,
    private router: Router,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      legajo: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    // Check if already logged in and redirect only if coming from login
    if (this.authService.isLoggedIn()) {
      // Solo redirigir al dashboard si el usuario ya está autenticado
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit(): void {
    // Validar campos antes de enviar
    if (!this.validateForm()) {
      // Asegurar spinner apagado si la validación falla
      this.isLoading = false;
      return;
    }

    if (this.loginForm.valid) {
      const { legajo, password } = this.loginForm.value;

      // Mostrar spinner inmediatamente al intentar loguear
      this.isLoading = true;
      this.loginStartTime = Date.now();

      this.loginService.login(legajo, password).subscribe({
        next: (response) => {
          // Calcula cuánto tiempo ha pasado desde que se mostró el spinner
          const now = Date.now();
          const elapsed = this.loginStartTime ? now - this.loginStartTime : 0;
          const remaining = Math.max(0, this.ARTIFICIAL_DELAY_MS - elapsed);

          // Esperar el tiempo restante para asegurar que el spinner haya estado visible 3s
          setTimeout(() => {
            // Usar directamente la estructura del usuario que viene en la respuesta
            const userData = response.usuario;

            // Save token and user data
            this.authService.saveAuthData(response.token, userData);

            // Apagar spinner y navegar
            this.isLoading = false;
            this.loginStartTime = null;
            this.router.navigate(['/dashboard']);
          }, remaining);
        },
        error: (error) => {
          console.error('Login error:', error);

          // Normalizar mensaje amigable
          const normalizedMessage = this.normalizeError(error);

          // Si es 401 (contraseña/usuario incorrecto) mantener spinner hasta completar el retardo mínimo
          if (this.isUnauthorized(error)) {
            const now = Date.now();
            const elapsed = this.loginStartTime ? now - this.loginStartTime : 0;
            const remaining = Math.max(0, this.ARTIFICIAL_DELAY_MS - elapsed);

            setTimeout(() => {
              this.isLoading = false;
              this.loginStartTime = null;

              // Usar mensaje normalizado (preferir backend si lo había)
              const errorMessage =
                normalizedMessage || 'Legajo o contraseña incorrectos.';

              this.loginForm.patchValue({ password: '' });
              this.showErrorToast(errorMessage);

              setTimeout(() => {
                const legajoElement = document.getElementById(
                  'legajo'
                ) as HTMLInputElement;
                if (legajoElement) legajoElement.focus();
              }, 100);

              this.errorMessage = null;
            }, remaining);
          } else {
            // Otros errores: ocultar spinner y mostrar mensaje amigable inmediatamente
            this.isLoading = false;
            this.loginStartTime = null;

            const errorMessage =
              normalizedMessage ||
              'Hubo un problema al intentar iniciar sesión. Por favor, intente nuevamente.';
            this.showErrorToast(errorMessage);
            this.errorMessage = null;
          }
        },
      });
    }
  }

  validateForm(): boolean {
    const legajoControl = this.loginForm.get('legajo');
    const passwordControl = this.loginForm.get('password');

    // Validar legajo
    if (!legajoControl?.value || legajoControl?.value.trim() === '') {
      this.showValidationToast('El número de legajo es requerido', 'legajo');
      // Asegurar spinner apagado por si acaso
      this.isLoading = false;
      return false;
    }

    // Validar que el legajo solo contenga números
    if (!/^\d+$/.test(legajoControl.value)) {
      this.showValidationToast(
        'El legajo debe contener solo números',
        'legajo'
      );
      this.isLoading = false;
      return false;
    }

    // Validar contraseña
    if (!passwordControl?.value || passwordControl?.value.trim() === '') {
      this.showValidationToast('La contraseña es requerida', 'password');
      this.isLoading = false;
      return false;
    }

    return true;
  }

  // Reemplazo de SweetAlert por toast-modal interno
  showValidationToast(message: string, field: string): void {
    this.isLoading = false;

    this.toastMessage = message;
    this.toastType = 'warning';
    this.toastVisible = true;

    // Ocultar automáticamente y enfocar campo después
    setTimeout(() => {
      this.toastVisible = false;
      const element = document.getElementById(field) as HTMLInputElement;
      if (element) {
        element.focus();
      }
    }, 3000); // 3s
  }

  showErrorToast(message: string): void {
    this.toastMessage = message;
    this.toastType = 'error';
    this.toastVisible = true;

    // Ocultar automáticamente
    setTimeout(() => {
      this.toastVisible = false;
    }, 4000); // 4s
  }

  isFieldInvalid(field: string): boolean {
    const control = this.loginForm.get(field);
    return control?.invalid && control?.touched ? true : false;
  }

  // Métodos para mostrar/ocultar contraseña
  onMouseDownPassword(): void {
    this.showPassword = true;
  }

  onMouseUpPassword(): void {
    this.showPassword = false;
  }

  onMouseLeavePassword(): void {
    this.showPassword = false;
  }

  // Para dispositivos táctiles
  onTouchStartPassword(event: TouchEvent): void {
    event.preventDefault();
    this.showPassword = true;
  }

  onTouchEndPassword(event: TouchEvent): void {
    event.preventDefault();
    this.showPassword = false;
  }

  // Nuevo: normaliza distintos tipos de error a mensajes amigables (incluye "Failed to fetch")
  private normalizeError(err: any): string {
    try {
      // Si no hay conexión de red
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return 'No hay conexión a Internet. Verifica tu red.';
      }

      // Si es Error nativo (por ejemplo fetch lanza TypeError con "Failed to fetch")
      if (err instanceof Error) {
        const msg = err.message || '';
        const lower = msg.toLowerCase();
        if (
          lower.includes('failed to fetch') ||
          lower.includes('networkrequestfailed') ||
          lower.includes('networkerror') ||
          lower.includes('network request failed')
        ) {
          return 'No se pudo conectar con el servidor. Verifica tu conexión o intenta más tarde.';
        }
        return msg || '';
      }

      // Si es HttpErrorResponse-like (objeto con status)
      if (err && typeof err === 'object') {
        if ('status' in err) {
          const status = Number((err as any).status);
          if (status === 0) {
            return 'No se pudo conectar con el servidor. Verifica tu conexión o intenta más tarde.';
          }
          // Si backend envía mensaje amigable en err.error.message o err.error
          const backendMsg =
            err.error?.message ||
            (typeof err.error === 'string' ? err.error : null);
          if (backendMsg) return backendMsg;
          if (status === 401) return 'Legajo o contraseña incorrectos.';
          return `Error ${status}: ${
            err.statusText || 'Error en la comunicación con el servidor'
          }`;
        }

        // Fallback: si viene { error: '...' } o { message: '...' }
        if (err.error && typeof err.error === 'string') return err.error;
        if (err.message && typeof err.message === 'string') return err.message;
      }

      return '';
    } catch {
      return 'Ocurrió un error inesperado. Intente nuevamente.';
    }
  }

  // Nuevo: determina si el error representa un 401
  private isUnauthorized(err: any): boolean {
    if (!err) return false;
    if (err instanceof Error) return false; // Error genérico no incluye status
    if (err && typeof err === 'object' && 'status' in err) {
      return Number((err as any).status) === 401;
    }
    return false;
  }
}

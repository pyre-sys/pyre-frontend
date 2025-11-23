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
          let errorMessage =
            'Hubo un problema al intentar iniciar sesión. Por favor, intente nuevamente.';

          // Si es 401 (contraseña/usuario incorrecto) mantener spinner hasta completar el retardo mínimo
          if (error.status === 401) {
            const now = Date.now();
            const elapsed = this.loginStartTime ? now - this.loginStartTime : 0;
            const remaining = Math.max(0, this.ARTIFICIAL_DELAY_MS - elapsed);

            // Esperar el tiempo restante antes de ocultar spinner y mostrar el error
            setTimeout(() => {
              // Asegurarse de limpiar estado
              this.isLoading = false;
              this.loginStartTime = null;

              // Mensaje específico
              errorMessage =
                error.error?.message || 'Legajo o contraseña incorrectos.';
              // Limpiar el campo de contraseña para que el usuario pueda reintentar
              this.loginForm.patchValue({ password: '' });

              // Mostrar toast-modal de error
              this.showErrorToast(errorMessage);

              // Focus en el campo de legajo para facilitar el reintento
              setTimeout(() => {
                const legajoElement = document.getElementById(
                  'legajo'
                ) as HTMLInputElement;
                if (legajoElement) {
                  legajoElement.focus();
                }
              }, 100);

              // Resetear cualquier estado de error previo
              this.errorMessage = null;
            }, remaining);
          } else {
            // Para otros errores, comportarse como antes (ocultar spinner inmediatamente y mostrar toast)
            this.isLoading = false;
            this.loginStartTime = null;

            if (error.error?.message) {
              errorMessage = error.error.message;
            }
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
}

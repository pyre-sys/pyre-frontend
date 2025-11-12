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
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, NgbTooltipModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage: string | null = null;
  isDarkMode: boolean = true;
  showPassword: boolean = false;
  // Use global toast service instead of local toast element

  constructor(
    private fb: FormBuilder,
    private loginService: LoginService,
    private router: Router,
    private authService: AuthService,
    private toastService: ToastService
  ) {
    this.loginForm = this.fb.group({
      legajo: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    // Check if already logged in
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }

    // Asegurar que estamos en la URL correcta
    const currentUrl = this.router.url;
    if (currentUrl === '/login' || currentUrl === '/login/') {
      // Mantener la URL actual sin redirigir
      // No hacer navigate aquí para evitar bucles
    }
  }

  onSubmit(): void {
    // Validar campos antes de enviar
    if (!this.validateForm()) {
      return;
    }

    if (this.loginForm.valid) {
      const { legajo, password } = this.loginForm.value;

      this.loginService.login(legajo, password).subscribe({
        next: (response) => {
          console.log('Login response:', response);

          // La respuesta viene con esta estructura:
          // { status: 200, message: "...", token: "...", usuario: { id, nombre, email, etc. } }

          // Usar directamente la estructura del usuario que viene en la respuesta
          const userData = response.usuario;

          console.log('User data from response:', userData);

          // Save token and user data - usar los datos tal como vienen
          this.authService.saveAuthData(response.token, userData);

          // Redirect to dashboard where sidebar and topbar are always visible
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          console.error('Login error:', error);

          // ⚠️ NO hacer navegación aquí - mantener en la misma página
          // this.router.navigate(['/login']); // <- REMOVER si existe

          let errorMessage =
            'Hubo un problema al intentar iniciar sesión. Por favor, intente nuevamente.';

          if (error.status === 401) {
            errorMessage =
              'Credenciales incorrectas. Verifique su legajo y contraseña.';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }

          this.showErrorToast(errorMessage);

          // Limpiar el formulario de contraseña pero mantener legajo
          this.loginForm.get('password')?.setValue('');
          this.loginForm.get('password')?.markAsUntouched();
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
      return false;
    }

    // Validar que el legajo solo contenga números
    if (!/^\d+$/.test(legajoControl.value)) {
      this.showValidationToast(
        'El legajo debe contener solo números',
        'legajo'
      );
      return false;
    }

    // Validar contraseña
    if (!passwordControl?.value || passwordControl?.value.trim() === '') {
      this.showValidationToast('La contraseña es requerida', 'password');
      return false;
    }

    return true;
  }

  showValidationToast(message: string, field: string): void {
    // Mostrar toast (tipo error) y enfocar el campo cuando desaparezca
    this.toastService.show('Campo requerido: ' + message, 'error', 3000);

    const element = document.getElementById(field) as HTMLInputElement | null;
    if (element) {
      // Enfocar después de que el toast se oculte para evitar cambios visuales bruscos
      setTimeout(() => {
        try {
          element.focus();
        } catch (e) {
          /* ignore */
        }
      }, 3200);
    }
  }

  showErrorToast(message: string): void {
    // Mostrar toast de error con duración más larga
    this.toastService.show('Error de autenticación: ' + message, 'error', 4000);
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

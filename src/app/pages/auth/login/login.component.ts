import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { LoginService } from '../../../services/login.service';

declare var Swal: any;

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule, NgbTooltipModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  loginForm: FormGroup;
  errorMessage: string | null = null;
  isDarkMode: boolean = true;
  showPassword: boolean = false;

  constructor(
    private fb: FormBuilder,
    private loginService: LoginService,
    private router: Router,
    private authService: AuthService,
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
      return;
    }

    if (this.loginForm.valid) {
      const { legajo, password } = this.loginForm.value;

      this.loginService.login(legajo, password).subscribe({
        next: (response) => {
          // console.log('Login response:', response);

          // La respuesta viene con esta estructura:
          // { status: 200, message: "...", token: "...", usuario: { id, nombre, email, etc. } }

          // Usar directamente la estructura del usuario que viene en la respuesta
          const userData = response.usuario;

          // console.log('User data from response:', userData);

          // Save token and user data - usar los datos tal como vienen
          this.authService.saveAuthData(response.token, userData);

          // Redirect to dashboard where sidebar and topbar are always visible
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          console.error('Login error:', error);
          let errorMessage = 'Hubo un problema al intentar iniciar sesión. Por favor, intente nuevamente.';

          if (error.status === 401) {
            // Manejo específico para error 401 Unauthorized
            errorMessage = error.error?.message || 'Legajo o contraseña incorrectos.';
            
            // Limpiar el campo de contraseña para que el usuario pueda reintentar
            this.loginForm.patchValue({ password: '' });
            
            // Mostrar modal de error y mantener al usuario en la pantalla de login
            this.showErrorToast(errorMessage);
            
            // Focus en el campo de legajo para facilitar el reintento
            setTimeout(() => {
              const legajoElement = document.getElementById('legajo') as HTMLInputElement;
              if (legajoElement) {
                legajoElement.focus();
              }
            }, 100);
            
          } else if (error.error?.message) {
            errorMessage = error.error.message;
            this.showErrorToast(errorMessage);
          } else {
            this.showErrorToast(errorMessage);
          }

          // Resetear cualquier estado de error previo
          this.errorMessage = null;
        }
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
      this.showValidationToast('El legajo debe contener solo números', 'legajo');
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
    Swal.fire({
      icon: 'warning',
      title: 'Campo requerido',
      text: message,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      customClass: {
        popup: 'swal-validation-toast'
      }
    }).then(() => {
      // Focus en el campo con error
      const element = document.getElementById(field) as HTMLInputElement;
      if (element) {
        element.focus();
      }
    });
  }

  showErrorToast(message: string): void {
    Swal.fire({
      icon: 'error',
      title: 'Error de autenticación',
      text: message,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 4000,
      timerProgressBar: true,
      customClass: {
        popup: 'swal-error-toast'
      }
    });
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

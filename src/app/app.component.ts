import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { ToastModalComponent } from './shared/components/toast-modal/toast-modal.component';
import { ToastService } from './services/toast.service';
import { Subscription } from 'rxjs';
import { AuthService } from './services/auth.service';
import { SidebarService } from './services/sidebar.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SidebarComponent, CommonModule, ToastModalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'pyre';

  selectedObjetivo: string = '';
  currentRoute: string = '';
  selectedFecha: string = '';
  selectedEstado: string = '';

  isLoggedIn: boolean = false; // Variable que guardará el estado de login
  isSidebarVisible: boolean = true; // Controla si el sidebar está visible (desde SidebarService)
  private loggedInSubscription!: Subscription; // Usamos '!' para decirle a TypeScript que esta propiedad será inicializada más tarde
  private sidebarSubscription!: Subscription;
  private toastSubscription!: Subscription;

  // Toast state bound to global toast component
  toastMessage: string = '';
  toastVisible: boolean = false;
  toastType: 'success' | 'error' = 'success';

  constructor(
    public router: Router,
    public activatedRoute: ActivatedRoute,
    public authService: AuthService,
    private sidebarService: SidebarService,
    private toastService: ToastService
  ) {
    // Inicializar el estado desde el inicio
    this.isLoggedIn = this.authService.isLoggedIn();
  }

  ngOnInit(): void {
    // Nos suscribimos al observable del servicio de autenticación para obtener el estado de login
    this.loggedInSubscription = this.authService.loggedIn$.subscribe(
      (loggedInStatus) => {
        this.isLoggedIn = loggedInStatus;
        // Cuando el usuario está logueado, aplicamos una clase al body para
        // mostrar el efecto 'más blanqueado' del fondo. Al desloguear, la quitamos.
        try {
          if (loggedInStatus) {
            document.body.classList.add('bg-blanch');
          } else {
            document.body.classList.remove('bg-blanch');
          }
        } catch (e) {
          // En entornos donde document no está disponible (SSR/tests), evitamos fallos
          // console.warn('No se pudo modificar body class:', e);
        }
      }
    );

    // Suscribirse al estado del sidebar
    this.sidebarSubscription = this.sidebarService.visible$.subscribe((v) => {
      this.isSidebarVisible = v;
    });

    // Suscribir a toasts globales
    this.toastSubscription = this.toastService.getVisible().subscribe((v) => {
      this.toastVisible = v;
    });
    this.toastService.getMessage().subscribe((m) => (this.toastMessage = m));
    this.toastService.getType().subscribe((t) => (this.toastType = t));
  }

  ngOnDestroy(): void {
    // Limpiamos la suscripción al destruir el componente
    if (this.loggedInSubscription) {
      this.loggedInSubscription.unsubscribe();
    }
    if (this.sidebarSubscription) {
      this.sidebarSubscription.unsubscribe();
    }
    if (this.toastSubscription) {
      this.toastSubscription.unsubscribe();
    }
  }

  // <!-- Topbar -->
  // <app-topbar
  //   [isLoggedIn]="isLoggedIn"
  //   [isSmallScreen]="isSmallScreen"
  //   [userEmail]="userEmail"
  //   [displayEmail]="displayEmail"
  //   [userLegajo]="userLegajo"
  //   [displayLegajo]="displayLegajo"
  //   [userRole]="userRole"
  //   [displayRole]="displayRole"
  //   [userLabel]="userLabel"
  //   (perfilModalToggled)="onPerfilModalToggled($event)"
  //   (homeNavigation)="onHomeNavigation()"
  //   (logoutRequested)="onLogoutRequested()"
  //   (sidebarToggled)="onSidebarToggled()">
  // </app-topbar>
}

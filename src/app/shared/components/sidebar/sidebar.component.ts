import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  HostListener,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router'; // agregué NavigationEnd
import { filter } from 'rxjs/operators'; // nuevo import
import { AuthService } from '../../../services/auth.service';
import { AlertaService } from '../../../services/alerta.service';
import { Roles } from '../../enums/roles';
import { Subscription } from 'rxjs';
import { TopbarComponent } from '../topbar/topbar.component';
import { SidebarService } from '../../../services/sidebar.service';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap'; // Asegurar la importación

interface MenuItem {
  id: number;
  descripcion: string;
  icono: string;
  link: string;
  grupo: string;
  principal: boolean;
  orden: number;
  estado: boolean;
  expanded?: boolean;
  requiredAccess: number[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, TopbarComponent, NgbTooltipModule], // Asegurarse de incluir TopbarComponent
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent implements OnInit, OnDestroy {
  // Estados del componente
  isSidebarVisible = false;
  isLoggedIn = false;
  id_acceso = 0;
  isSmallScreen = window.innerWidth < 992;
  isPerfilModalVisible = false;

  // Propiedades de usuario
  nombreCompleto = '';
  userEmail: string = '';
  displayEmail: string = '';
  userLegajo: string = '';
  displayLegajo: string = '';
  displayRole: string = '';
  displayUserLabel: string = ''; // Agregar la propiedad que falta

  // Tooltip dinámico para el legajo y rol
  get pillTooltip(): string {
    const leg = this.userLegajo || this.displayLegajo || '';
    const role = this.displayRole || '';
    return role ? `${leg} — ${role}` : leg;
  }

  // Nuevo: título dinámico para topbar
  pageTitle: string = 'Sistema de Gestión';

  private subscription = new Subscription();

  // Menú refactorizado según nueva estructura
  private readonly allMenuItems: MenuItem[] = [
    // 1. Listado de Herramientas
    {
      id: 1,
      descripcion: 'Herramientas', // Cambiado a un nombre más conciso
      icono: 'bi bi-tools', // Cambiado a un icono más representativo
      link: '/herramienta/list',
      grupo: 'GM01',
      principal: true,
      orden: 1,
      estado: true,
      requiredAccess: [
        Roles.SuperAdmin,
        Roles.Operario,
        Roles.Supervisor,
        Roles.Administrador,
      ],
    },

    // 2. Lista de Usuarios
    {
      id: 2,
      descripcion: 'Usuarios', // Cambiado a un nombre más conciso
      icono: 'bi bi-people', // Cambiado a un icono más representativo
      link: '/user/list',
      grupo: 'GM02',
      principal: true,
      orden: 2,
      estado: true,
      requiredAccess: [
        Roles.SuperAdmin,
        // Roles.Operario,
        // Roles.Supervisor,
        // Roles.Administrador,
      ],
    },

    {
      id: 3,
      descripcion: 'Proveedores',
      icono: 'bi bi-truck',
      link: '/recursos/proveedores',
      grupo: 'GM03',
      principal: true,
      orden: 3,
      estado: true,
      requiredAccess: [
        Roles.SuperAdmin,
        Roles.Operario,
        Roles.Supervisor,
        Roles.Administrador,
      ],
    },

    {
      id: 4,
      descripcion: 'Clientes',
      icono: 'bi bi-people-fill',
      link: '/recursos/clientes',
      grupo: 'GM03',
      principal: true,
      orden: 4,
      estado: true,
      requiredAccess: [
        Roles.SuperAdmin,
        Roles.Operario,
        Roles.Supervisor,
        Roles.Administrador,
      ],
    },

    {
      id: 5,
      descripcion: 'Obras',
      icono: 'bi bi-card-list',
      link: '/recursos/obras',
      grupo: 'GM04',
      principal: true,
      orden: 5,
      estado: true,
      requiredAccess: [
        Roles.SuperAdmin,
        Roles.Operario,
        Roles.Supervisor,
        Roles.Administrador,
      ],
    },

    // 6. Movimientos (principal con submenús)
    {
      id: 6,
      descripcion: 'Movimientos',
      icono: 'bi bi-arrow-left-right',
      link: '/movimientos',
      grupo: 'GM05',
      principal: true,
      orden: 6,
      estado: true,
      requiredAccess: [
        Roles.SuperAdmin,
        Roles.Operario,
        Roles.Supervisor,
        Roles.Administrador,
      ],
    },
    {
      id: 51,
      descripcion: 'Registrar Préstamo',
      icono: 'bi bi-box-arrow-in-right',
      link: '/movimientos/prestamo',
      grupo: 'GM05',
      principal: false,
      orden: 1,
      estado: true,
      requiredAccess: [
        Roles.SuperAdmin,
        Roles.Operario,
        Roles.Supervisor,
        Roles.Administrador,
      ],
    },
    {
      id: 52,
      descripcion: 'Registrar Devolución',
      icono: 'bi bi-box-arrow-in-left',
      link: '/movimientos/devolucion',
      grupo: 'GM05',
      principal: false,
      orden: 2,
      estado: true,
      requiredAccess: [
        Roles.SuperAdmin,
        Roles.Operario,
        Roles.Supervisor,
        Roles.Administrador,
      ],
    },
    {
      id: 53,
      descripcion: 'Registrar Reparación',
      icono: 'bi bi-tools',
      link: '/movimientos/reparacion',
      grupo: 'GM05',
      principal: false,
      orden: 3,
      estado: true,
      requiredAccess: [
        Roles.SuperAdmin,
        Roles.Operario,
        Roles.Supervisor,
        Roles.Administrador,
      ],
    },
    {
      id: 54,
      descripcion: 'Historial de Movimientos',
      icono: 'bi bi-clock-history',
      link: '/movimientos/historial',
      grupo: 'GM05',
      principal: false,
      orden: 4,
      estado: true,
      requiredAccess: [
        Roles.SuperAdmin,
        Roles.Operario,
        Roles.Supervisor,
        Roles.Administrador,
      ],
    },

    // 7. Reportes (principal con submenús)
    {
      id: 8, // cambiado de 6 a 8 para evitar duplicado con Movimientos
      descripcion: 'Reportes',
      icono: 'bi bi-bar-chart',
      link: '/reportes',
      grupo: 'GM06',
      principal: true,
      orden: 7, // ajustado para mantener orden único entre principales
      estado: true,
      requiredAccess: [
        Roles.SuperAdmin,
        Roles.Operario,
        Roles.Supervisor,
        Roles.Administrador,
      ],
    },
    {
      id: 61,
      descripcion: 'Herramientas por Estado',
      icono: 'bi bi-clipboard-data',
      link: '/reportes/estado',
      grupo: 'GM06',
      principal: false,
      orden: 1,
      estado: true,
      requiredAccess: [
        Roles.SuperAdmin,
        Roles.Operario,
        Roles.Supervisor,
        Roles.Administrador,
      ],
    },
    {
      id: 62,
      descripcion: 'Stock Valorizado',
      icono: 'bi bi-cash-coin',
      link: '/reportes/valorizacion',
      grupo: 'GM06',
      principal: false,
      orden: 2,
      estado: true,
      requiredAccess: [
        Roles.SuperAdmin,
        Roles.Operario,
        Roles.Supervisor,
        Roles.Administrador,
      ],
    },
    {
      id: 64,
      descripcion: 'Disponibilidad de Herramientas',
      icono: 'bi bi-calendar-range',
      link: '/reportes/disponibilidad',
      grupo: 'GM06',
      principal: false,
      orden: 4,
      estado: true,
      requiredAccess: [
        Roles.SuperAdmin,
        Roles.Operario,
        Roles.Supervisor,
        Roles.Administrador,
      ],
    },
    {
      id: 65,
      descripcion: 'Herramientas por usuario',
      icono: 'bi bi-calendar-range',
      link: '/reportes/herramientas-usuario',
      grupo: 'GM06',
      principal: false,
      orden: 5,
      estado: true,
      requiredAccess: [
        Roles.SuperAdmin,
        Roles.Operario,
        Roles.Supervisor,
        Roles.Administrador,
      ],
    },

    // 8. Configuración (solo SuperAdmin, con submenús)
    {
      id: 7,
      descripcion: 'Configuración',
      icono: 'bi bi-gear',
      link: '/configuracion',
      grupo: 'GM07',
      principal: true,
      orden: 8, // cambiado de 7 a 8 para evitar duplicidad con Reportes/Movimientos
      estado: false,
      requiredAccess: [Roles.SuperAdmin],
    },
    {
      id: 71,
      descripcion: 'Parámetros Generales',
      icono: 'bi bi-sliders',
      link: '/configuracion/parametros',
      grupo: 'GM07',
      principal: false,
      orden: 1,
      estado: true,
      requiredAccess: [Roles.SuperAdmin],
    },
    {
      id: 72,
      descripcion: 'Tipos de Estado',
      icono: 'bi bi-tags',
      link: '/configuracion/estados',
      grupo: 'GM07',
      principal: false,
      orden: 2,
      estado: true,
      requiredAccess: [Roles.SuperAdmin],
    },
    {
      id: 73,
      descripcion: 'Alertas y Notificaciones',
      icono: 'bi bi-bell-fill',
      link: '/configuracion/alertas',
      grupo: 'GM07',
      principal: false,
      orden: 3,
      estado: true,
      requiredAccess: [Roles.SuperAdmin],
    },
  ];

  // Servicios inyectados
  private authService = inject(AuthService);
  private alertaService = inject(AlertaService);
  private router = inject(Router);
  private el = inject(ElementRef);
  private sidebarService = inject(SidebarService);

  // Mapeo de roles a IDs
  private roleMapping = {
    SuperAdmin: Roles.SuperAdmin,
    Administrador: Roles.Administrador,
    Supervisor: Roles.Supervisor,
    Operario: Roles.Operario,
  };

  @HostListener('window:resize')
  onResize() {
    const previousState = this.isSmallScreen;
    this.isSmallScreen = window.innerWidth < 992;

    if (this.isSmallScreen !== previousState) {
      if (this.isSmallScreen) {
        this.isSidebarVisible = false;
        // sincronizar con el servicio para que otros componentes (topbar) reciban el cambio
        this.sidebarService.hide();
      } else {
        this.isSidebarVisible = this.isLoggedIn;
        // sincronizar con el servicio
        if (this.isLoggedIn) {
          this.sidebarService.show();
        } else {
          this.sidebarService.hide();
        }
      }
    }
  }

  ngOnInit() {
    this.loadUserData();

    // Suscribir al router para actualizar el título de la página
    this.subscription.add(
      this.router.events
        .pipe(filter((e) => e instanceof NavigationEnd))
        .subscribe((nav) => {
          const navEnd = nav as NavigationEnd;
          const path = navEnd.urlAfterRedirects || navEnd.url;

          // Determinar título específico según la ruta - ser más conciso
          if (path && path.startsWith('/perfil')) {
            this.pageTitle = 'Mi Perfil';
          } else if (path && path.startsWith('/herramienta')) {
            this.pageTitle = 'Herramientas';
          } else if (path && path.startsWith('/user')) {
            this.pageTitle = 'Usuarios';
          } else if (path && path.startsWith('/recursos/proveedores')) {
            this.pageTitle = 'Proveedores';
          } else if (path && path.startsWith('/recursos/clientes')) {
            this.pageTitle = 'Clientes';
          } else if (path && path.startsWith('/recursos/obras')) {
            this.pageTitle = 'Obras';
          } else if (path && path.startsWith('/movimientos')) {
            // Rutas específicas dentro de /movimientos
            const segments = path.split('/').filter((s) => s.length > 0);
            const sub = (segments[1] ?? '').toLowerCase();
            switch (sub) {
              case 'prestamo':
                this.pageTitle = 'Registrar Préstamo';
                break;
              case 'devolucion':
                this.pageTitle = 'Registrar Devolución';
                break;
              case 'reparacion':
                this.pageTitle = 'Registrar Reparación';
                break;
              case 'historial':
                this.pageTitle = 'Historial de Movimientos';
                break;
              default:
                this.pageTitle = 'Movimientos';
            }
          } else if (path && path.startsWith('/reportes')) {
            // Rutas específicas dentro de /reportes
            const segments = path.split('/').filter((s) => s.length > 0);
            const sub = (segments[1] ?? '').toLowerCase();
            switch (sub) {
              case 'estado':
                this.pageTitle = 'Herramientas por Estado';
                break;
              case 'valorizacion':
              case 'valorización':
                this.pageTitle = 'Stock Valorizado';
                break;
              case 'disponibilidad':
                this.pageTitle = 'Disponibilidad de Herramientas';
                break;
              default:
                this.pageTitle = 'Reportes';
            }
          } else if (path && path.startsWith('/configuracion')) {
            this.pageTitle = 'Configuración';
          } else if (
            path &&
            (path.startsWith('/dashboard') ||
              path === '/inicio' ||
              path === '/')
          ) {
            this.pageTitle = 'Inicio';
          } else {
            // Para rutas no reconocidas, usar un título neutro específico
            this.pageTitle = 'Navegación';
          }
        })
    );

    this.subscription.add(
      this.authService.loggedIn$.subscribe((isLoggedIn: boolean) => {
        this.isLoggedIn = isLoggedIn;
        if (isLoggedIn) {
          if (this.isSmallScreen) {
            this.sidebarService.hide();
          } else {
            this.sidebarService.show();
          }
          this.loadUserData();
        } else {
          this.sidebarService.hide();
        }
      })
    );

    this.subscription.add(
      this.sidebarService.visible$.subscribe((v) => {
        this.isSidebarVisible = v;
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private loadUserData() {
    const user = this.authService.getUser();
    if (user) {
      console.log('Cargando datos del usuario en SidebarComponent:', user);

      // Mapear el rol string a número
      const roleName = user.rolNombre ?? user.role ?? user.rol ?? '';
      const mappedRoleId =
        this.roleMapping[roleName as keyof typeof this.roleMapping];

      this.id_acceso =
        mappedRoleId != null
          ? mappedRoleId
          : user.id_acceso != null
            ? Number(user.id_acceso)
            : 0;

      const nombre = user.nombre || '';
      const apellido = user.apellido || '';
      this.nombreCompleto = `${nombre} ${apellido}`.trim() || 'Usuario';

      this.userEmail = user.email || '';
      this.displayEmail =
        this.userEmail && this.userEmail.length > 22
          ? this.userEmail.slice(0, 19) + '...'
          : this.userEmail;

      this.userLegajo = user.legajo ? String(user.legajo) : '';
      this.displayLegajo =
        this.userLegajo && this.userLegajo.length > 12
          ? this.userLegajo.slice(0, 9) + '...'
          : this.userLegajo;

      this.displayRole = user.rolNombre || user.role || user.rol || '';

      const legInfo = this.userLegajo ? `Legajo: ${this.userLegajo}` : '';
      const nameInfo = this.nombreCompleto ? ` — ${this.nombreCompleto}` : '';
      this.displayUserLabel = (legInfo + nameInfo).trim() || 'Usuario'; // Asignar valor a displayUserLabel

      console.log('Usuario cargado:', {
        roleName,
        mappedRoleId,
        id_acceso: this.id_acceso,
        user,
      });
    } else {
      this.id_acceso = 0;
      this.nombreCompleto = 'Usuario Demo';
      this.userEmail = '';
      this.displayEmail = '';
      this.userLegajo = '';
      this.displayLegajo = '';
      this.displayUserLabel = 'Usuario'; // Valor por defecto
      this.displayRole = '';
    }
  }

  // Getters para el menú filtrado
  get visibleMenuItems(): MenuItem[] {
    return this.allMenuItems
      .filter(
        (item) =>
          item.principal && item.estado && this.isItemVisibleForUser(item)
      )
      .sort((a, b) => a.orden - b.orden);
  }

  getSubMenus(menu: MenuItem): MenuItem[] {
    return this.allMenuItems
      .filter(
        (item) =>
          !item.principal &&
          item.grupo === menu.grupo &&
          item.estado &&
          this.isItemVisibleForUser(item)
      )
      .sort((a, b) => a.orden - b.orden);
  }

  private isItemVisibleForUser(item: MenuItem): boolean {
    if (!this.isLoggedIn || !this.id_acceso) return false;

    const itemAllowed =
      item.requiredAccess && item.requiredAccess.length > 0
        ? item.requiredAccess.map((x) => Number(x))
        : undefined;

    const parentAllowed = this.getParentRequiredAccessForLink(item.link);

    if (parentAllowed && parentAllowed.length > 0) {
      const allowed =
        itemAllowed && itemAllowed.length > 0
          ? itemAllowed.filter((x) => parentAllowed.includes(x))
          : parentAllowed;
      return allowed.includes(this.id_acceso);
    }

    if (!itemAllowed || itemAllowed.length === 0) return true;
    return itemAllowed.includes(this.id_acceso);
  }

  private getParentRequiredAccessForLink(link: string): number[] | undefined {
    try {
      const segments = link.split('/').filter((s) => s.length > 0);
      if (segments.length === 0) return undefined;
      const first = segments[0];
      const route = this.router.config.find((r) => r.path === first);
      const ra = route?.data?.['requiredAccess'] as number[] | undefined;
      return ra ? ra.map((x) => Number(x)) : undefined;
    } catch (e) {
      return undefined;
    }
  }

  toggleSubMenu(menu: MenuItem) {
    if (this.getSubMenus(menu).length === 0 && menu.link) {
      this.router.navigate([menu.link]); // Navegar directamente si no hay submenús
      if (this.isSmallScreen) {
        this.sidebarService.hide();
      }
    } else {
      this.visibleMenuItems.forEach((m) => {
        if (m !== menu) m.expanded = false;
      });
      menu.expanded = !menu.expanded;
    }
  }

  navigateToSubMenu(subMenu: MenuItem) {
    if (subMenu.link && subMenu.link !== '/') {
      this.router.navigate([subMenu.link]);
      if (this.isSmallScreen) {
        this.sidebarService.hide();
      }
    }
  }

  isMenuExpanded(menu: MenuItem): boolean {
    return !!menu.expanded;
  }

  toggleSidebar() {
    this.sidebarService.toggle();
  }

  navigateToHome() {
    this.router.navigate(['/inicio']);
  }

  // Nuevo: cuando se hace click en el logo en pantallas chicas, ocultar sidebar y navegar
  onLogoClick(): void {
    if (this.isSmallScreen) {
      // ocultar inmediatamente para que no quede tapando la vista después de la navegación
      this.sidebarService.hide();
      this.isSidebarVisible = false;
    }
    // navegar (la navegación puede ocurrir inmediatamente)
    this.navigateToHome();
  }

  // Nuevo: manejar click en el enlace "Perfil" desde la plantilla
  onPerfilLinkClick(): void {
    if (this.isSmallScreen) {
      this.sidebarService.hide();
    }
    // La navegación la realiza el routerLink en el template
  }

  getNombreCompleto(): string {
    return this.nombreCompleto || 'Usuario';
  }

  confirmLogout() {
    this.isPerfilModalVisible = false;

    this.alertaService
      .confirm('¿Estás seguro de que deseas cerrar sesión?', '¿Cerrar sesión?')
      .then((result: any) => {
        if (result && result.isConfirmed) {
          this.authService.logout();
          this.router.navigate(['/login/login']);
        }
      });
  }

  togglePerfilModal() {
    this.isPerfilModalVisible = !this.isPerfilModalVisible;
  }

  onPerfilModalToggled(isVisible: boolean) {
    this.isPerfilModalVisible = isVisible;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!this.isPerfilModalVisible) return;

    const toggle = this.el.nativeElement.querySelector(
      '.profile-toggle'
    ) as HTMLElement | null;
    const dropdown = this.el.nativeElement.querySelector(
      '.profile-dropdown'
    ) as HTMLElement | null;

    if (
      (toggle && toggle.contains(target)) ||
      (dropdown && dropdown.contains(target))
    ) {
      return;
    }

    this.isPerfilModalVisible = false;
  }

  // Helper method para verificar roles
  isRole(roleName: string): boolean {
    return this.displayRole?.toLowerCase() === roleName.toLowerCase();
  }
}

import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ElementRef,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import {
  trigger,
  transition,
  style,
  animate,
  state,
} from '@angular/animations';
import { Subscription, interval } from 'rxjs';
import {
  PageTitleService,
  PageMetadata,
} from '../../../services/page-title.service';
import { AlertaService } from '../../../services/alerta.service';
import { SidebarService } from '../../../services/sidebar.service';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css'],
  standalone: true,
  imports: [CommonModule, NgIf, NgbTooltipModule, RouterModule],
  animations: [
    trigger('titleChange', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate(
          '300ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ]),
    trigger('breadcrumbSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-10px)' }),
        animate(
          '200ms 100ms ease-out',
          style({ opacity: 1, transform: 'translateX(0)' })
        ),
      ]),
    ]),
    trigger('alertsPulse', [
      state('normal', style({ transform: 'scale(1)' })),
      state('critical', style({ transform: 'scale(1)' })),
      transition('normal => critical', [
        animate('500ms ease-in-out', style({ transform: 'scale(1.05)' })),
        animate('500ms ease-in-out', style({ transform: 'scale(1)' })),
      ]),
    ]),
  ],
})
export class TopbarComponent implements OnInit, OnDestroy {
  @Input() isLoggedIn: boolean = false;
  @Input() isSmallScreen: boolean = false;
  @Input() userEmail: string | null = null;
  @Input() displayEmail: string | null = null;
  @Input() userLegajo: string | null = null;
  @Input() displayLegajo: string | null = null;
  @Input() userRole: string | null = null;
  @Input() displayRole: string | null = null;
  @Input() userLabel: string | null = null;
  @Input() pageTitle: string = 'Sistema de Gestión'; // Asegurarse de que este Input exista

  @Output() perfilModalToggled = new EventEmitter<boolean>();
  @Output() homeNavigation = new EventEmitter<void>();
  @Output() logoutRequested = new EventEmitter<void>();
  @Output() sidebarToggled = new EventEmitter<void>();

  isPerfilModalVisible: boolean = false;
  // Estado del sidebar (visible = desplegado)
  isSidebarVisible: boolean = true;

  // Metadata de la página actual
  pageMetadata: PageMetadata = {
    title: 'Sistema de Gestión',
    icon: 'bi-house-door',
    color: 'primary',
  };

  // Propiedades de alertas
  alertasVencidas = 0;
  isLoadingAlertas = false;

  // Datos de notificaciones (ejemplo - reemplazar con tu servicio real)
  private notifications = {
    overdue: 2, // Herramientas vencidas
    maintenance: 1, // Herramientas que necesitan mantenimiento
    low_stock: 0, // Stock bajo (si aplicara)
  };

  // Nueva bandera para controlar animación de la campana
  animateAlerts: boolean = false;

  // Nueva bandera para sacudida puntual periódica
  animateShake: boolean = false;
  private shakeIntervalId: number | null = null;
  private shakeTimeoutId: number | null = null;
  private readonly shakePeriod = 5000; // cada 5 segundos
  private readonly shakeDuration = 800; // duración de la sacudida en ms

  // Guardar último conteo para detectar incrementos
  private previousAlertCount: number = 0;

  private alertsSubscription?: Subscription;
  private alertsInterval?: Subscription;
  private sidebarSubscription?: Subscription;

  private el = inject(ElementRef);

  constructor(
    private pageTitleService: PageTitleService,
    private alertaService: AlertaService,
    private router: Router,
    private sidebarService: SidebarService
  ) {}

  ngOnInit() {
    // Suscribirse a cambios en la metadata
    this.pageTitleService.metadata$.subscribe((metadata) => {
      this.pageMetadata = metadata;
    });

    // Cargar alertas inicial y configurar actualización periódica
    if (this.isLoggedIn) {
      this.loadAlertas();
      this.setupAlertsPolling();
    }

    // Leer el estado actual de forma síncrona para evitar races donde el sidebar
    // ya fue colapsado antes de que este componente se haya inicializado.
    try {
      this.isSidebarVisible = this.sidebarService.isVisible;
    } catch (e) {
      // si por alguna razón no está disponible, dejamos el valor por defecto
    }

    this.sidebarSubscription = this.sidebarService.visible$.subscribe(
      (visible) => {
        this.isSidebarVisible = visible;
      }
    );

    // Suscribirse a los cambios en las alertas
    this.alertsSubscription = this.alertaService
      .getAlertasActualizadas$()
      .subscribe(() => {
        this.loadAlertas(); // Recargar alertas automáticamente
      });

    // inicializar previousAlertCount con 0 (o con el valor que venga del primer fetch)
    this.previousAlertCount = 0;
  }

  ngOnDestroy() {
    this.alertsSubscription?.unsubscribe();
    this.alertsInterval?.unsubscribe();
    this.sidebarSubscription?.unsubscribe();
    this.stopShakeLoop(); // asegurar limpieza
  }

  // Getters para acceso fácil en la plantilla
  get pageIcon(): string | undefined {
    return this.pageMetadata.icon;
  }

  get pageSubtitle(): string | undefined {
    return this.pageMetadata.subtitle;
  }

  get breadcrumbs() {
    return this.pageMetadata.breadcrumbs || [];
  }

  get hasBreadcrumbs(): boolean {
    return this.breadcrumbs.length > 0;
  }

  get pageBadge() {
    return this.pageMetadata.badge;
  }

  get pageColor(): string {
    return this.pageMetadata.color || 'primary';
  }

  // Tooltip dinámico para el pill (legajo + rol)
  get pillTooltip(): string {
    const leg = this.userLegajo || this.displayLegajo || '';
    const role = this.displayRole || this.userRole || '';
    return role ? `${leg} — ${role}` : leg;
  }

  // Getters para alertas
  get totalAlertas(): number {
    return this.alertasVencidas;
  }

  get alertsTooltip(): string {
    if (this.totalAlertas === 0) {
      return 'No hay alertas';
    }

    return `${this.totalAlertas} alerta${this.totalAlertas > 1 ? 's' : ''}`;
  }

  // Métodos para manejo de notificaciones
  getTotalNotifications(): number {
    return this.notifications.overdue;
  }

  hasNormalAlerts(): boolean {
    return false; // No hay normales, solo vencidas
  }

  hasWarningAlerts(): boolean {
    return (
      this.notifications.maintenance > 0 || this.notifications.low_stock > 0
    );
  }

  hasCriticalAlerts(): boolean {
    return this.notifications.overdue > 0;
  }

  getNotificationsSubtitle(): string {
    if (this.getTotalNotifications() === 0) {
      return 'Todo en orden';
    }

    return ''; // Sin subtítulo cuando hay alertas
  }

  getNotificationsTooltip(): string {
    if (this.getTotalNotifications() === 0) {
      return 'No hay alertas';
    }

    let tooltip = 'Alertas: ';
    const parts = [];

    if (this.notifications.overdue > 0) {
      parts.push(
        `${this.notifications.overdue} alerta${
          this.notifications.overdue > 1 ? 's' : ''
        }`
      );
    }
    if (this.notifications.maintenance > 0) {
      parts.push(`${this.notifications.maintenance} mantenimiento`);
    }
    if (this.notifications.low_stock > 0) {
      parts.push(`${this.notifications.low_stock} stock bajo`);
    }

    return tooltip + parts.join(', ');
  }

  getTooltipMessage(): string {
    if (this.getTotalNotifications() === 0) {
      return 'No hay préstamos vencidos. Todo está en orden.';
    }
    return 'Haz clic para ver los préstamos vencidos que requieren atención.';
  }

  togglePerfilModal(): void {
    this.isPerfilModalVisible = !this.isPerfilModalVisible;
    this.perfilModalToggled.emit(this.isPerfilModalVisible);
  }

  navigateToHome(): void {
    this.isPerfilModalVisible = false;
    this.homeNavigation.emit();
  }

  confirmLogout(): void {
    this.isPerfilModalVisible = false;
    this.logoutRequested.emit();
  }

  toggleSidebar(): void {
    this.sidebarToggled.emit();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.isPerfilModalVisible) return;

    this.isPerfilModalVisible = false;
    this.perfilModalToggled.emit(false);
  }

  private loadAlertas(): void {
    if (this.isLoadingAlertas) return;
    this.isLoadingAlertas = true;

    // Cargar alertas vencidas
    this.alertaService.getCountAlertasVencidas().subscribe({
      next: (resp) => {
        const newCount = Number(resp?.data ?? 0);
        this.alertasVencidas = newCount;
        this.notifications.overdue = newCount; // sincronizar

        // Si hay incremento respecto al anterior y ahora > 0, activar animación
        // Si hay alertas (>0) asegurar que el loop de sacudidas esté activo.
        // Esto cubre tanto incrementos como la carga inicial cuando previos = 0.
        if (newCount > 0) {
          // Si hubo incremento o si el loop aún no corre, activar atención
          if (
            newCount > this.previousAlertCount ||
            this.shakeIntervalId == null
          ) {
            this.triggerAlertAttention();
          }
        } else {
          // Si ya no hay alertas, parar el loop
          this.stopShakeLoop();
          this.animateAlerts = false;
        }

        this.previousAlertCount = newCount;
        this.checkLoadingComplete();
      },
      error: (error) => {
        console.error('Error loading overdue alerts:', error);
        this.alertasVencidas = 0;
        this.notifications.overdue = 0; // Sincronizar en error
        this.previousAlertCount = 0;
        this.stopShakeLoop();
        this.checkLoadingComplete();
      },
    });
  }

  // Lógica para activar la animación de atención (inicia loop de sacudidas)
  private triggerAlertAttention(): void {
    // activar animación de atención (clase attention)
    this.animateAlerts = true;
    // iniciar loop de sacudidas si no está activo
    this.startShakeLoop();
  }

  private startShakeLoop(): void {
    if (this.shakeIntervalId != null) return; // ya corriendo
    // disparar una sacudida inmediata
    this.triggerShake();
    // programar repetición cada shakePeriod ms
    this.shakeIntervalId = window.setInterval(() => {
      this.triggerShake();
    }, this.shakePeriod);
  }

  private triggerShake(): void {
    // activar clase de sacudida
    this.animateShake = true;
    // asegurar que se apague tras shakeDuration
    if (this.shakeTimeoutId) {
      clearTimeout(this.shakeTimeoutId);
      this.shakeTimeoutId = null;
    }
    this.shakeTimeoutId = window.setTimeout(() => {
      this.animateShake = false;
      this.shakeTimeoutId = null;
    }, this.shakeDuration);
  }

  private stopShakeLoop(): void {
    if (this.shakeIntervalId != null) {
      clearInterval(this.shakeIntervalId);
      this.shakeIntervalId = null;
    }
    if (this.shakeTimeoutId != null) {
      clearTimeout(this.shakeTimeoutId);
      this.shakeTimeoutId = null;
    }
    this.animateShake = false;
  }

  // Método invocado al clicar la campana: detener animación y navegar
  onNotificationsClick(): void {
    // detener animación (usuario ya vio la campana)
    this.animateAlerts = false;
    // detener loop de sacudidas
    this.stopShakeLoop();
    // navegar a alertas (mantiene el comportamiento previo)
    this.navigateToAlertas();
  }

  private checkLoadingComplete(): void {
    // Simple check - en una implementación más robusta podrías usar forkJoin
    setTimeout(() => {
      this.isLoadingAlertas = false;
    }, 100);
  }

  private setupAlertsPolling(): void {
    // Actualizar alertas cada 2 minutos
    this.alertsInterval = interval(120000).subscribe(() => {
      this.loadAlertas();
    });
  }

  navigateToAlertas(): void {
    // Asegurar navegación a la ruta correcta
    this.router.navigate(['/dashboard/alertas']).catch((error) => {
      console.error('Error al navegar a /dashboard/alertas:', error);
    });
  }

  // Nombre interno por defecto para mostrar si no se pasa pageTitle desde Sidebar
  defaultPageTitle = 'Sistema de Gestión';

  // Getter simplificado que solo devuelve el título dinámico
  get displayTitle(): string {
    return this.pageTitle && this.pageTitle.trim().length > 0
      ? this.pageTitle
      : 'Inicio';
  }
}

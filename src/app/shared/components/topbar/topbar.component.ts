import { Component, Input, Output, EventEmitter, HostListener, ElementRef, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { trigger, transition, style, animate, state } from '@angular/animations';
import { Subscription, interval } from 'rxjs';
import { PageTitleService, PageMetadata } from '../../../services/page-title.service';
import { AlertaService } from '../../../services/alerta.service';

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
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('breadcrumbSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-10px)' }),
        animate('200ms 100ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ]),
    trigger('alertsPulse', [
      state('normal', style({ transform: 'scale(1)' })),
      state('critical', style({ transform: 'scale(1)' })),
      transition('normal => critical', [
        animate('500ms ease-in-out', style({ transform: 'scale(1.05)' })),
        animate('500ms ease-in-out', style({ transform: 'scale(1)' }))
      ])
    ])
  ]
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

  @Output() perfilModalToggled = new EventEmitter<boolean>();
  @Output() homeNavigation = new EventEmitter<void>();
  @Output() logoutRequested = new EventEmitter<void>();
  @Output() sidebarToggled = new EventEmitter<void>();

  isPerfilModalVisible: boolean = false;

  // Metadata de la página actual
  pageMetadata: PageMetadata = {
    title: 'Sistema de Gestión',
    icon: 'bi-house-door',
    color: 'primary'
  };

  // Propiedades de alertas
  alertasPendientes = 0;
  alertasVencidas = 0;
  isLoadingAlertas = false;

  private alertsSubscription?: Subscription;
  private alertsInterval?: Subscription;

  private el = inject(ElementRef);

  constructor(
    private pageTitleService: PageTitleService,
    private alertaService: AlertaService,
    private router: Router
  ) { }

  ngOnInit() {
    // Suscribirse a cambios en la metadata
    this.pageTitleService.metadata$.subscribe(metadata => {
      this.pageMetadata = metadata;
    });

    // Cargar alertas inicial y configurar actualización periódica
    if (this.isLoggedIn) {
      this.loadAlertas();
      this.setupAlertsPolling();
    }
  }

  ngOnDestroy() {
    this.alertsSubscription?.unsubscribe();
    this.alertsInterval?.unsubscribe();
  }

  // Getters para acceso fácil en la plantilla
  get pageTitle(): string {
    return this.pageMetadata.title;
  }

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
    return this.alertasPendientes + this.alertasVencidas;
  }

  get alertsTooltip(): string {
    if (this.totalAlertas === 0) {
      return 'No hay alertas pendientes';
    }

    const parts: string[] = [];

    if (this.alertasVencidas > 0) {
      parts.push(`${this.alertasVencidas} vencida${this.alertasVencidas > 1 ? 's' : ''}`);
    }

    if (this.alertasPendientes > 0) {
      parts.push(`${this.alertasPendientes} pendiente${this.alertasPendientes > 1 ? 's' : ''}`);
    }

    return `${this.totalAlertas} alerta${this.totalAlertas > 1 ? 's' : ''}: ${parts.join(', ')}`;
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

    // Cargar alertas pendientes
    this.alertaService.getCountAlertasPendientes().subscribe({
      next: (resp) => {
        this.alertasPendientes = resp?.data ?? 0;
        this.checkLoadingComplete();
      },
      error: (error) => {
        console.error('Error loading pending alerts:', error);
        this.alertasPendientes = 0;
        this.checkLoadingComplete();
      }
    });

    // Cargar alertas vencidas
    this.alertaService.getCountAlertasVencidas().subscribe({
      next: (resp) => {
        this.alertasVencidas = resp?.data ?? 0;
        this.checkLoadingComplete();
      },
      error: (error) => {
        console.error('Error loading overdue alerts:', error);
        this.alertasVencidas = 0;
        this.checkLoadingComplete();
      }
    });
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
    // Navegar a la página de alertas
    this.router.navigate(['/dashboard/alertas']);
  }
}

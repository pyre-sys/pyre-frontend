import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { AlertaService } from '../../../services/alerta.service';
import { PageTitleService } from '../../../services/page-title.service';

interface Alerta {
  idAlerta: number;
  idHerramienta: number;
  nombreHerramienta: string;
  idTipoAlerta: number;
  nombreTipoAlerta: string;
  fechaGeneracion: string;
  leida: boolean;
  diasVencido?: number;
  codigoHerramienta?: string;
}

type TipoFiltro = 'todas' | 'pendientes' | 'vencidas' | 'noLeidas';

@Component({
  selector: 'app-alertas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alertas.component.html',
  styleUrls: ['./alertas.component.css', '../../../../styles/visor-style.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(-20px)', opacity: 0 }),
        animate('400ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ])
    ])
  ]
})
export class AlertasComponent implements OnInit {
  alertas: Alerta[] = [];
  alertasFiltradas: Alerta[] = [];
  isLoading = false;
  tipoFiltroActual: TipoFiltro = 'todas';
  searchTerm = '';

  // Estadísticas
  stats = {
    total: 0,
    pendientes: 0,
    vencidas: 0,
    noLeidas: 0
  };

  // Opciones de filtro
  filtroOptions = [
    { value: 'todas', label: 'Todas las Alertas', icon: 'bi-list-ul', color: 'primary' },
    { value: 'pendientes', label: 'Próximas a Vencer', icon: 'bi-exclamation-triangle', color: 'warning' },
    { value: 'vencidas', label: 'Vencidas', icon: 'bi-exclamation-octagon', color: 'danger' },
    { value: 'noLeidas', label: 'No Leídas', icon: 'bi-envelope', color: 'info' }
  ];

  Math = Math; // Expose Math as a public property

  constructor(
    private alertaService: AlertaService,
    private pageTitleService: PageTitleService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.pageTitleService.setTitle('Gestión de Alertas');

    // Check for initial filter from route params
    this.route.queryParams.subscribe(params => {
      const tipo = params['tipo'];
      if (tipo === 'pendientes' || tipo === 'vencidas') {
        this.tipoFiltroActual = tipo;
      }
      this.loadAlertas();
    });
  }

  loadAlertas(): void {
    this.isLoading = true;

    this.alertaService.getAlertas().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.data) {
          this.alertas = this.processAlertas(response.data);
          this.calculateStats();
          this.applyFilters();
        } else {
          this.alertas = [];
          this.alertasFiltradas = [];
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error al cargar alertas:', error);
        this.alertas = [];
        this.alertasFiltradas = [];
      }
    });
  }

  private processAlertas(alertas: any[]): Alerta[] {
    return alertas.map(alerta => ({
      ...alerta,
      diasVencido: this.calculateDaysOverdue(alerta.fechaGeneracion, alerta.idTipoAlerta),
      codigoHerramienta: this.extractCodigoFromName(alerta.nombreHerramienta)
    }));
  }

  private calculateDaysOverdue(fechaGeneracion: string, tipoAlerta: number): number {
    if (tipoAlerta !== 2) return 0; // Solo calcular para alertas vencidas

    const today = new Date();
    const fechaGen = new Date(fechaGeneracion);

    if (fechaGen.getFullYear() === 1) return 0; // Fecha inválida del backend

    const diffTime = today.getTime() - fechaGen.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  }

  private extractCodigoFromName(nombreHerramienta: string): string {
    // Extract code pattern from tool name (e.g., "TALADRO MANUAL 01" -> "01")
    const match = nombreHerramienta.match(/\d+$/);
    return match ? match[0] : '';
  }

  private calculateStats(): void {
    this.stats.total = this.alertas.length;
    this.stats.pendientes = this.alertas.filter(a => a.idTipoAlerta === 1).length;
    this.stats.vencidas = this.alertas.filter(a => a.idTipoAlerta === 2).length;
    this.stats.noLeidas = this.alertas.filter(a => !a.leida).length;
  }

  onFilterChange(filtro: any): void {
    this.tipoFiltroActual = filtro;
    this.applyFilters();

    // Update URL without navigation
    const queryParams = filtro !== 'todas' ? { tipo: filtro } : {};
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge'
    });
  }

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value.toLowerCase();
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.alertas];

    // Apply type filter
    switch (this.tipoFiltroActual) {
      case 'pendientes':
        filtered = filtered.filter(a => a.idTipoAlerta === 1);
        break;
      case 'vencidas':
        filtered = filtered.filter(a => a.idTipoAlerta === 2);
        break;
      case 'noLeidas':
        filtered = filtered.filter(a => !a.leida);
        break;
    }

    // Apply search filter
    if (this.searchTerm) {
      filtered = filtered.filter(a =>
        a.nombreHerramienta.toLowerCase().includes(this.searchTerm) ||
        a.nombreTipoAlerta.toLowerCase().includes(this.searchTerm)
      );
    }

    // Sort by priority and date
    filtered.sort((a, b) => {
      // First by read status (unread first)
      if (a.leida !== b.leida) {
        return a.leida ? 1 : -1;
      }
      // Then by alert type (vencidas first)
      if (a.idTipoAlerta !== b.idTipoAlerta) {
        return b.idTipoAlerta - a.idTipoAlerta;
      }
      // Finally by generation date (newest first)
      return new Date(b.fechaGeneracion).getTime() - new Date(a.fechaGeneracion).getTime();
    });

    this.alertasFiltradas = filtered;
  }

  toggleAlertaLeida(alerta: Alerta): void {
    const newStatus = !alerta.leida;

    this.alertaService.marcarAlertaLeida(alerta.idAlerta, newStatus).subscribe({
      next: (response) => {
        if (response.success) {
          alerta.leida = newStatus;
          this.calculateStats();

          // Show success message
          const action = newStatus ? 'marcada como leída' : 'marcada como no leída';
          this.showSuccessToast(`Alerta ${action} correctamente`);
        }
      },
      error: (error) => {
        console.error('Error al actualizar alerta:', error);
        this.showErrorToast('Error al actualizar el estado de la alerta');
      }
    });
  }

  marcarTodasLeidas(): void {
    const alertasNoLeidas = this.alertasFiltradas.filter(a => !a.leida);

    if (alertasNoLeidas.length === 0) {
      this.showInfoToast('No hay alertas sin leer en la vista actual');
      return;
    }

    this.alertaService.marcarMultiplesAlertasLeidas(alertasNoLeidas.map(a => a.idAlerta)).subscribe({
      next: (response) => {
        if (response.success) {
          alertasNoLeidas.forEach(alerta => alerta.leida = true);
          this.calculateStats();
          this.showSuccessToast(`${alertasNoLeidas.length} alertas marcadas como leídas`);
        }
      },
      error: (error) => {
        console.error('Error al marcar alertas como leídas:', error);
        this.showErrorToast('Error al marcar las alertas como leídas');
      }
    });
  }

  getAlertIcon(tipoAlerta: number): string {
    return tipoAlerta === 1 ? 'bi-exclamation-triangle' : 'bi-exclamation-octagon';
  }

  getAlertColor(tipoAlerta: number): string {
    return tipoAlerta === 1 ? 'warning' : 'danger';
  }

  getFilterCount(filtro: any): number {
    switch (filtro) {
      case 'todas': return this.stats.total;
      case 'pendientes': return this.stats.pendientes;
      case 'vencidas': return this.stats.vencidas;
      case 'noLeidas': return this.stats.noLeidas;
      default: return 0;
    }
  }

  private showSuccessToast(message: string): void {
    // Implement toast notification or use AlertaService
    console.log('Success:', message);
  }

  private showErrorToast(message: string): void {
    // Implement toast notification or use AlertaService
    console.error('Error:', message);
  }

  private showInfoToast(message: string): void {
    // Implement toast notification or use AlertaService
    console.info('Info:', message);
  }

  // Track by function for performance
  trackByAlerta(index: number, alerta: Alerta): number {
    return alerta.idAlerta;
  }
}

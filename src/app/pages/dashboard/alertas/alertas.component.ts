import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { AlertaService } from '../../../services/alerta.service';
import { PageTitleService } from '../../../services/page-title.service';
import { ModalAlertaComponent } from '../modal-alerta/modal-alerta.component';

interface Alerta {
  idAlerta: number;
  idMovimiento: number;
  nombreHerramienta: string;
  idTipoAlerta: number;
  nombreTipoAlerta: string;
  fechaGeneracion: string;
  comentario: string;
  activo: boolean;
  diasVencido?: number;
  responsableNombre?: string;
  tipoMovimiento?: string;
}

type TipoFiltro = 'todas' | 'pendientes' | 'vencidas' | 'noLeidas';

@Component({
  selector: 'app-alertas',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalAlertaComponent],
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

  // Modal properties
  selectedAlerta: Alerta | null = null;
  showEditModal = false;

  // Estadísticas
  stats = {
    total: 0,
    pendientes: 0,
    vencidas: 0,
    noLeidas: 0
  };

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
      diasVencido: this.calculateDaysOverdue(alerta.fechaGeneracion, alerta.idTipoAlerta)
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

  // Get alert count by type name
  getAlertCountByType(tipoNombre: string): number {
    return this.alertas.filter(alerta => {
      if (tipoNombre === "Prestamo Vencido") {
        return alerta.nombreTipoAlerta === "Prestamo Vencido";
      }
      return alerta.nombreTipoAlerta === tipoNombre;
    }).length;
  }

  // Open edit modal
  openEditModal(alerta: Alerta): void {
    this.selectedAlerta = { ...alerta };
    this.showEditModal = true;
  }

  // Close edit modal
  onCloseEditModal(): void {
    this.selectedAlerta = null;
    this.showEditModal = false;
  }

  // Handle alert updated
  onAlertaUpdated(): void {
    this.loadAlertas(); // Reload alerts after update
    this.onCloseEditModal();
  }

  // Get alert type name by ID
  getAlertTypeName(idTipoAlerta: number): string {
    switch (idTipoAlerta) {
      case 1:
        return 'Mantenimiento';
      case 2:
        return 'Préstamo Vencido';
      default:
        return 'Desconocido';
    }
  }

  // Apply current filters
  private applyFilters(): void {
    let filtered = [...this.alertas];

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(alerta =>
        alerta.nombreHerramienta.toLowerCase().includes(term) ||
        alerta.nombreTipoAlerta.toLowerCase().includes(term) ||
        (alerta.responsableNombre && alerta.responsableNombre.toLowerCase().includes(term))
      );
    }

    // Apply type filter
    switch (this.tipoFiltroActual) {
      case 'pendientes':
        filtered = filtered.filter(a => a.idTipoAlerta === 1);
        break;
      case 'vencidas':
        filtered = filtered.filter(a => a.idTipoAlerta === 2);
        break;
      // 'todas' shows all alerts
    }

    this.alertasFiltradas = filtered;
  }

  private calculateStats(): void {
    this.stats.total = this.alertas.length;
    this.stats.pendientes = this.alertas.filter(a => a.idTipoAlerta === 1).length;
    this.stats.vencidas = this.alertas.filter(a => a.idTipoAlerta === 2).length;

    // Apply filters after calculating stats
    this.applyFilters();
  }

  onFilterChange(filtro: any): void {
    this.tipoFiltroActual = filtro;

    // Update URL without navigation
    const queryParams = filtro !== 'todas' ? { tipo: filtro } : {};
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge'
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

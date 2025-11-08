import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageTitleService } from '../../../services/page-title.service';
import { HerramientaService } from '../../../services/herramienta.service';
import { PaginatorComponent } from "../../../shared/components/paginator/paginator.component";
import { AlertaService } from '../../../services/alerta.service';

interface HerramientasRaw {
  [key: string]: any;
}

interface DisplayHerramienta {
  id?: number;
  idHerramienta?: number;
  codigo?: string;
  nombre?: string;
  marca?: string;
  tipo?: string;
  estadoFisico?: string;
  disponibilidad?: string;
  estadoDisponibilidad?: string;
  ubicacion?: string;
  planta?: string;
  activo?: boolean;
  estado?: string;
}

@Component({
  selector: 'app-disponibilidad',
  imports: [
    CommonModule,
    FormsModule,
    PaginatorComponent,
  ],
  templateUrl: './disponibilidad.component.html',
  styleUrl: './disponibilidad.component.css'
})
export class DisponibilidadComponent implements OnInit {

  herramientas: DisplayHerramienta[] = [];
  filteredHerramientas: DisplayHerramienta[] = [];
  currentPage = 1;
  pageSize = 6;
  loading = false;
  totalItems = 0;
  totalPages = 0;

  // Estadísticas
  herramientasDisponibles = 0;
  herramientasPrestadas = 0;
  herramientasEnMantenimiento = 0;
  herramientasExtraviadas = 0;

  // Filtros
  disponibilidadSelect: any = null;

  // Estados de disponibilidad disponibles
  estadosDisponibilidad = [
    { id: 1, nombre: 'Disponible', icon: 'bi-check-circle-fill', color: 'success' },
    { id: 2, nombre: 'Prestada', icon: 'bi-arrow-right-circle', color: 'primary' },
    { id: 3, nombre: 'Mantenimiento', icon: 'bi-wrench-adjustable', color: 'warning' },
    { id: 4, nombre: 'Extraviada', icon: 'bi-exclamation-triangle', color: 'danger' }
  ];

  constructor(
    private pageTitleService: PageTitleService,
    private srvHerramienta: HerramientaService,
    private srvAlerta: AlertaService
  ) { }

  ngOnInit(): void {
    this.pageTitleService.setTitle('Estado de Disponibilidad');
    this.cargarEstadisticas();
    // Inicializar con estado "Disponible" (ID: 1)
    this.disponibilidadSelect = this.estadosDisponibilidad.find(estado => estado.id === 1);
    this.onSearch();
  }

  getPaginatedHerramientas(): DisplayHerramienta[] {
    return this.filteredHerramientas;
  }

  cargarEstadisticas() {
    // Cargar todas las estadísticas en paralelo
    const disponibilidadIds = [1, 2, 3, 4]; // Disponible, Prestada, Mantenimiento, Extraviada

    disponibilidadIds.forEach(disponibilidadId => {
      this.srvHerramienta.getCountHerramientasByDisponibilidad(disponibilidadId).subscribe({
        next: (response: any) => {
          const count = response?.data ?? 0;
          switch (disponibilidadId) {
            case 1: this.herramientasDisponibles = count; break;
            case 2: this.herramientasPrestadas = count; break;
            case 3: this.herramientasEnMantenimiento = count; break;
            case 4: this.herramientasExtraviadas = count; break;
          }
        },
        error: (error: any) => {
          console.error(`Error cargando estadísticas para disponibilidad ${disponibilidadId}:`, error);
        }
      });
    });
  }

  onDisponibilidadSelected(disponibilidad: any) {
    this.disponibilidadSelect = disponibilidad;
    this.currentPage = 1; // Reset pagination
    this.onSearch();
  }

  onDisponibilidadCardClick(disponibilidad: any) {
    this.disponibilidadSelect = disponibilidad;
    this.currentPage = 1;
    this.onSearch();
  }

  hasActiveFilters(): boolean {
    return !!this.disponibilidadSelect;
  }

  onResetFilters() {
    this.disponibilidadSelect = null;
    this.herramientas = [];
    this.filteredHerramientas = [];
    this.totalItems = 0;
  }

  onSearch() {
    if (!this.disponibilidadSelect) {
      this.herramientas = [];
      this.filteredHerramientas = [];
      this.totalItems = 0;
      return;
    }

    this.loading = true;

    this.srvHerramienta.getHerramientasPorDisponibilidadArray([this.disponibilidadSelect.id]).subscribe({
      next: (response: any) => {
        this.loading = false;
        if (response.success && response.data) {
          const herramientasData = response.data;
          this.herramientas = herramientasData.map((h: any) => this.mapHerramientaToDisplayFormat(h));
          this.totalItems = this.herramientas.length;
          this.calculatePagination();
          this.updateFilteredData();
        } else {
          this.herramientas = [];
          this.filteredHerramientas = [];
          this.totalItems = 0;
        }
      },
      error: (error: any) => {
        this.loading = false;
        console.error('Error al cargar herramientas por disponibilidad:', error);
        this.srvAlerta.error('Error al cargar las herramientas. Por favor, inténtelo de nuevo.');
        this.herramientas = [];
        this.filteredHerramientas = [];
        this.totalItems = 0;
      }
    });
  }

  private updateFilteredData(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.filteredHerramientas = this.herramientas.slice(startIndex, endIndex);
  }

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updateFilteredData();
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.calculatePagination();
    this.updateFilteredData();
  }

  onPageEvent(event: { pageIndex: number, pageSize: number }): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.calculatePagination();
    this.updateFilteredData();
  }

  getDisponibilidadStats(disponibilidadId: number): number {
    switch (disponibilidadId) {
      case 1: return this.herramientasDisponibles;
      case 2: return this.herramientasPrestadas;
      case 3: return this.herramientasEnMantenimiento;
      case 4: return this.herramientasExtraviadas;
      default: return 0;
    }
  }

  // Helper para mapear herramienta a formato de visualización
  private mapHerramientaToDisplayFormat(h: HerramientasRaw): DisplayHerramienta {
    const estadoRaw = h['activo'] ?? h['estado'] ?? h['active'] ?? h['isActive'] ?? null;
    const activo = typeof estadoRaw === 'boolean' ? estadoRaw : (estadoRaw === 'Activo' || estadoRaw === true);
    const estado = activo ? 'Activo' : 'Inactivo';

    // Mapeo para normalizar los valores de disponibilidad
    let disponibilidad = h['estadoDisponibilidad'] ?? h['disponibilidad'] ?? '';

    // Normalizar disponibilidad según los valores correctos
    if (disponibilidad) {
      if (typeof disponibilidad === 'string') {
        if (disponibilidad.toLowerCase().includes('prest')) disponibilidad = 'Prestada';
        else if (disponibilidad.toLowerCase().includes('manten')) disponibilidad = 'Mantenimiento';
        else if (disponibilidad.toLowerCase().includes('extra')) disponibilidad = 'Extraviada';
        else if (disponibilidad.toLowerCase().includes('disp')) disponibilidad = 'Disponible';
      } else if (typeof disponibilidad === 'number') {
        const dispMap: { [key: number]: string } = {
          1: 'Disponible',
          2: 'Prestada',
          3: 'Mantenimiento',
          4: 'Extraviada'
        };
        disponibilidad = dispMap[disponibilidad] || 'Disponible';
      }
    }

    return {
      id: h['id'] ?? h['idHerramienta'] ?? null,
      idHerramienta: h['idHerramienta'] ?? h['id'] ?? null,
      codigo: h['codigo'] ?? '',
      nombre: h['nombreHerramienta'] ?? h['nombre'] ?? '',
      marca: h['marca'] ?? '',
      tipo: h['tipo'] ?? '',
      estadoFisico: h['estadoFisico'] ?? '',
      disponibilidad: disponibilidad,
      ubicacion: h['ubicacion'] ?? h['ubicacionFisica'] ?? '',
      planta: h['nombrePlanta'] ?? h['planta'] ?? '',
      activo: activo,
      estado: estado
    } as DisplayHerramienta;
  }

  // Helper methods for template
  getDisponibilidadColor(disponibilidad: string | undefined): string {
    if (!disponibilidad) return 'primary';

    const disp = disponibilidad.toLowerCase();
    if (disp.includes('disponible')) return 'success';
    if (disp.includes('prestada')) return 'primary';
    if (disp.includes('mantenimiento')) return 'warning';
    if (disp.includes('extraviada')) return 'danger';
    return 'primary';
  }

  getDisponibilidadIcon(disponibilidad: string | undefined): string {
    if (!disponibilidad) return 'bi-question-circle';

    const disp = disponibilidad.toLowerCase();
    if (disp.includes('disponible')) return 'bi-check-circle';
    if (disp.includes('prestada')) return 'bi-arrow-right-circle';
    if (disp.includes('mantenimiento')) return 'bi-wrench';
    if (disp.includes('extraviada')) return 'bi-exclamation-triangle';
    return 'bi-question-circle';
  }

  getEstadoFisicoColor(estadoFisico: string | undefined): string {
    if (!estadoFisico) return 'primary';

    const estado = estadoFisico.toLowerCase();
    if (estado.includes('excelente')) return 'success';
    if (estado.includes('usada') || estado.includes('bueno')) return 'primary';
    if (estado.includes('desgastada') || estado.includes('regular')) return 'warning';
    if (estado.includes('dañada') || estado.includes('malo') || estado.includes('no apta')) return 'danger';
    return 'primary';
  }

  getEstadoFisicoIcon(estadoFisico: string | undefined): string {
    if (!estadoFisico) return 'bi-question-circle';

    const estado = estadoFisico.toLowerCase();
    if (estado.includes('excelente')) return 'bi-star-fill';
    if (estado.includes('usada') || estado.includes('bueno')) return 'bi-check-circle';
    if (estado.includes('desgastada') || estado.includes('regular')) return 'bi-exclamation-circle';
    if (estado.includes('dañada') || estado.includes('malo') || estado.includes('no apta')) return 'bi-x-circle';
    return 'bi-question-circle';
  }
}

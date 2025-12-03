import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageTitleService } from '../../../services/page-title.service';
import { HerramientaService } from '../../../services/herramienta.service';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { AlertaService } from '../../../services/alerta.service';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';

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
  idDisponibilidad?: number;
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
    NgbTooltipModule,
    SpinnerComponent,
  ],
  templateUrl: './disponibilidad.component.html',
  styleUrls: ['../../../../styles/reportes-style.css'],
})
export class DisponibilidadComponent implements OnInit {
  herramientas: DisplayHerramienta[] = [];
  filteredHerramientas: DisplayHerramienta[] = [];
  paginatedHerramientas: DisplayHerramienta[] = [];
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

  // Filtros de búsqueda (local) - IGUAL QUE ESTADO
  filtroCodigo = '';
  filtroNombre = '';
  filtroMarca = '';
  filtroDisponibilidadId: number | null = null;
  selectedDisponibilidad: any = null;
  disponibilidadSelect: any = null; // AGREGAR la propiedad que falta

  // Estados de disponibilidad disponibles
  estadosDisponibilidad = [
    {
      id: 1,
      nombre: 'Disponible',
      icon: 'bi-check-circle-fill',
      color: 'success',
    },
    {
      id: 2,
      nombre: 'Prestada',
      icon: 'bi-arrow-right-circle',
      color: 'primary',
    },
    {
      id: 3,
      nombre: 'Mantenimiento',
      icon: 'bi-wrench-adjustable',
      color: 'warning',
    },
    {
      id: 4,
      nombre: 'Extraviada',
      icon: 'bi-exclamation-triangle',
      color: 'danger',
    },
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
    this.disponibilidadSelect = this.estadosDisponibilidad.find(
      (estado) => estado.id === 1
    );
    this.cargarPorDisponibilidad();
  }

  // Cargar estadísticas de cada disponibilidad
  cargarEstadisticas() {
    const disponibilidadIds = [1, 2, 3, 4];

    disponibilidadIds.forEach((disponibilidadId) => {
      this.srvHerramienta
        .getCountHerramientasByDisponibilidad(disponibilidadId)
        .subscribe({
          next: (response: any) => {
            const count = response?.data ?? 0;
            switch (disponibilidadId) {
              case 1:
                this.herramientasDisponibles = count;
                break;
              case 2:
                this.herramientasPrestadas = count;
                break;
              case 3:
                this.herramientasEnMantenimiento = count;
                break;
              case 4:
                this.herramientasExtraviadas = count;
                break;
            }
          },
          error: (error: any) => {
            console.error(
              `Error cargando estadísticas para disponibilidad ${disponibilidadId}:`,
              error
            );
          },
        });
    });
  }

  // Cuando hace click en un botón de disponibilidad - IGUAL QUE ESTADO
  onEstadoCardClick(estado: any) {
    this.disponibilidadSelect = estado;
    this.currentPage = 1;
    this.filtroCodigo = '';
    this.filtroNombre = '';
    this.filtroMarca = '';
    this.filtroDisponibilidadId = null;
    this.selectedDisponibilidad = null;
    this.cargarPorDisponibilidad();
  }

  // Cargar herramientas por disponibilidad seleccionada (backend)
  cargarPorDisponibilidad() {
    if (!this.disponibilidadSelect) {
      this.herramientas = [];
      this.filteredHerramientas = [];
      this.totalItems = 0;
      return;
    }

    this.loading = true;

    this.srvHerramienta
      .getHerramientasPorDisponibilidad(this.disponibilidadSelect.id)
      .subscribe({
        next: (response: any) => {
          this.loading = false;
          if (response.success && response.data) {
            const herramientasData = response.data;
            this.herramientas = herramientasData.map((h: any) =>
              this.mapHerramientaToDisplayFormat(h)
            );

            // Aplicar filtros locales
            this.applyFiltersLocal();
          }
        },
        error: (error: any) => {
          this.loading = false;
          console.error(
            'Error al cargar herramientas por disponibilidad:',
            error
          );
          this.srvAlerta.error('Error al cargar las herramientas.');
          this.herramientas = [];
          this.filteredHerramientas = [];
          this.totalItems = 0;
        },
      });
  }

  // Aplicar filtros LOCALMENTE (sin ir al backend) - IGUAL QUE ESTADO
  applyFiltersLocal(): void {
    this.filteredHerramientas = this.herramientas.filter((h) => {
      const codigo = h.codigo?.toLowerCase() ?? '';
      const nombre = h.nombre?.toLowerCase() ?? '';
      const marca = h.marca?.toLowerCase() ?? '';

      const filtroCodigo = this.filtroCodigo.toLowerCase().trim();
      const filtroNombre = this.filtroNombre.toLowerCase().trim();
      const filtroMarca = this.filtroMarca.toLowerCase().trim();

      // Filtro de disponibilidad adicional: comparar por ID (más confiable)
      let filtroDisponibilidadMatch = true;
      if (this.filtroDisponibilidadId !== null) {
        filtroDisponibilidadMatch =
          h.idDisponibilidad === this.filtroDisponibilidadId;
      }

      return (
        (!filtroCodigo || codigo.includes(filtroCodigo)) &&
        (!filtroNombre || nombre.includes(filtroNombre)) &&
        (!filtroMarca || marca.includes(filtroMarca)) &&
        filtroDisponibilidadMatch
      );
    });

    this.totalItems = this.filteredHerramientas.length;
    this.currentPage = 1;
    this.calculatePagination();
    this.updatePaginatedData();
  }

  // Cuando se selecciona disponibilidad en el combo - EJECUTAR FILTRADO INMEDIATAMENTE
  onDisponibilidadSelected(disponibilidad: any): void {
    console.log('Disponibilidad seleccionada (evento):', disponibilidad);

    this.selectedDisponibilidad = disponibilidad;
    // Usar idEstadoDisponibilidad como ID
    this.filtroDisponibilidadId =
      disponibilidad?.idEstadoDisponibilidad ?? null;

    console.log('selectedDisponibilidad:', this.selectedDisponibilidad);
    console.log('filtroDisponibilidadId:', this.filtroDisponibilidadId);

    // IMPORTANTE: Aplicar filtros inmediatamente sin esperar a que el usuario haga clic en Buscar
    this.currentPage = 1;
    this.applyFiltersLocal();
  }

  // Buscar (ejecutar filtros locales) - IGUAL QUE ESTADO
  onSearch(): void {
    this.currentPage = 1;
    this.applyFiltersLocal();
  }

  hasActiveFilters(): boolean {
    return !!(
      this.filtroCodigo?.trim() ||
      this.filtroNombre?.trim() ||
      this.filtroMarca?.trim() ||
      this.filtroDisponibilidadId !== null
    );
  }

  onResetFilters(): void {
    this.filtroCodigo = '';
    this.filtroNombre = '';
    this.filtroMarca = '';
    this.filtroDisponibilidadId = null;
    this.selectedDisponibilidad = null;
    this.currentPage = 1;
    this.applyFiltersLocal();
  }

  // Actualizar datos paginados (para mostrar en tabla)
  private updatePaginatedData(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedHerramientas = this.filteredHerramientas.slice(
      startIndex,
      endIndex
    );
  }

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
  }

  onPageEvent(event: { pageIndex: number; pageSize: number }): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.calculatePagination();
    this.updatePaginatedData();
  }

  getDisponibilidadStats(disponibilidadId: number): number {
    switch (disponibilidadId) {
      case 1:
        return this.herramientasDisponibles;
      case 2:
        return this.herramientasPrestadas;
      case 3:
        return this.herramientasEnMantenimiento;
      case 4:
        return this.herramientasExtraviadas;
      default:
        return 0;
    }
  }

  // Helper para mapear herramienta a formato de visualización
  private mapHerramientaToDisplayFormat(
    h: HerramientasRaw
  ): DisplayHerramienta {
    const estadoRaw =
      h['activo'] ?? h['estado'] ?? h['active'] ?? h['isActive'] ?? null;
    const activo =
      typeof estadoRaw === 'boolean'
        ? estadoRaw
        : estadoRaw === 'Activo' || estadoRaw === true;
    const estado = activo ? 'Activo' : 'Inactivo';

    let disponibilidad = h['estadoDisponibilidad'] ?? h['disponibilidad'] ?? '';

    if (disponibilidad) {
      if (typeof disponibilidad === 'string') {
        if (disponibilidad.toLowerCase().includes('prest'))
          disponibilidad = 'Prestada';
        else if (disponibilidad.toLowerCase().includes('manten'))
          disponibilidad = 'Mantenimiento';
        else if (disponibilidad.toLowerCase().includes('extra'))
          disponibilidad = 'Extraviada';
        else if (disponibilidad.toLowerCase().includes('disp'))
          disponibilidad = 'Disponible';
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
      idDisponibilidad: h['idDisponibilidad'] ?? null,
      ubicacion: h['ubicacion'] ?? h['ubicacionFisica'] ?? '',
      planta: h['nombrePlanta'] ?? h['planta'] ?? '',
      activo: activo,
      estado: estado,
    } as DisplayHerramienta;
  }

  // Helper methods for template
  getEstadoClass(estado: string | undefined): string {
    if (!estado) return 'default';

    const est = estado.toLowerCase();
    if (est.includes('excelente')) return 'excelente';
    if (est.includes('usada') || est.includes('usado')) return 'usada';
    if (est.includes('desgastada') || est.includes('desgastado'))
      return 'desgastada';
    if (est.includes('dañada') || est.includes('dañado')) return 'danada';
    if (est.includes('no apta') || est.includes('no apte')) return 'no-apta';
    return 'default';
  }

  // Helper para generar las clases usadas por los badges de estado físico
  // Devuelve un array con ambas convenciones para cubrir las variantes CSS del proyecto:
  // - "estado-<clave>" (ej. estado-excelente)
  // - "badge-<color>"  (ej. badge-success)
  getEstadoBadgeClasses(estado?: string): string[] {
    if (!estado) return [];
    const estadoKey = this.getEstadoClass(estado);
    const color = this.mapEstadoToColor(estado);
    return [`estado-${estadoKey}`, `badge-${color}`];
  }

  // Mapear texto de estado a colores usados en las otras vistas
  private mapEstadoToColor(estado?: string): string {
    if (!estado) return 'secondary';
    const est = estado.toLowerCase();
    if (est.includes('excelente')) return 'success';
    if (est.includes('usada') || est.includes('usado')) return 'primary';
    if (est.includes('desgastada') || est.includes('desgastado'))
      return 'warning';
    if (est.includes('dañada') || est.includes('dañado')) return 'danger';
    if (est.includes('no apta') || est.includes('no apte')) return 'dark';
    return 'secondary';
  }
}

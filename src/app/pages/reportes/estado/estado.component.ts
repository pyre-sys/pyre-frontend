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
  selector: 'app-estado',
  imports: [
    CommonModule,
    FormsModule,
    PaginatorComponent,
    NgbTooltipModule,
    SpinnerComponent,
  ],
  templateUrl: './estado.component.html',
  styleUrls: ['../../../../styles/reportes-style.css'],
})
export class EstadoComponent implements OnInit {
  herramientas: DisplayHerramienta[] = [];
  filteredHerramientas: DisplayHerramienta[] = [];
  paginatedHerramientas: DisplayHerramienta[] = [];
  currentPage = 1;
  pageSize = 6;
  loading = false;
  totalItems = 0;
  totalPages = 0;

  // Filtros de búsqueda (local)
  filtroCodigo = '';
  filtroNombre = '';
  filtroMarca = '';
  filtroDisponibilidadId: number | null = null;
  selectedDisponibilidad: any = null;

  // Estadísticas
  herramientasExcelente = 0;
  herramientasUsadas = 0;
  herramientasDesgastadas = 0;
  herramientasDaniadas = 0;
  herramientasNoApta = 0;

  // Filtro de estado - EXCELENTE por defecto (ID: 1)
  estadoFisicoSelect: any = null;

  // Estados físicos disponibles
  estadosFisicos = [
    { id: 1, nombre: 'Excelente', icon: 'bi-star-fill', color: 'success' },
    { id: 2, nombre: 'Usada', icon: 'bi-check-circle', color: 'primary' },
    {
      id: 3,
      nombre: 'Desgastada',
      icon: 'bi-exclamation-circle',
      color: 'warning',
    },
    { id: 4, nombre: 'Dañada', icon: 'bi-x-circle', color: 'danger' },
    { id: 5, nombre: 'No Apta', icon: 'bi-ban', color: 'dark' },
  ];

  constructor(
    private pageTitleService: PageTitleService,
    private srvHerramienta: HerramientaService,
    private srvAlerta: AlertaService
  ) { }

  ngOnInit(): void {
    this.pageTitleService.setTitle('Estado de Herramientas');
    this.cargarEstadisticas();

    // Seleccionar estado "Excelente" por defecto
    this.estadoFisicoSelect = this.estadosFisicos.find((e) => e.id === 1);

    // Cargar herramientas con estado Excelente
    this.cargarPorEstado();
  }

  // Cargar estadísticas de cada estado
  cargarEstadisticas() {
    const estadosIds = [1, 2, 3, 4, 5];

    estadosIds.forEach((estadoId) => {
      this.srvHerramienta
        .getCountHerramientasByEstadoFisico(estadoId)
        .subscribe({
          next: (response: any) => {
            const count = response?.data ?? 0;
            switch (estadoId) {
              case 1:
                this.herramientasExcelente = count;
                break;
              case 2:
                this.herramientasUsadas = count;
                break;
              case 3:
                this.herramientasDesgastadas = count;
                break;
              case 4:
                this.herramientasDaniadas = count;
                break;
              case 5:
                this.herramientasNoApta = count;
                break;
            }
          },
          error: (error: any) => {
            console.error(
              `Error cargando estadísticas para estado ${estadoId}:`,
              error
            );
          },
        });
    });
  }

  // Cuando hace click en un botón de estado
  onEstadoCardClick(estado: any) {
    this.estadoFisicoSelect = estado;
    this.currentPage = 1;
    this.filtroCodigo = '';
    this.filtroNombre = '';
    this.filtroMarca = '';
    this.filtroDisponibilidadId = null;
    this.selectedDisponibilidad = null;
    this.cargarPorEstado();
  }

  // Cargar herramientas por estado seleccionado (backend)
  cargarPorEstado() {
    if (!this.estadoFisicoSelect) {
      this.herramientas = [];
      this.filteredHerramientas = [];
      this.totalItems = 0;
      return;
    }

    this.loading = true;

    this.srvHerramienta
      .getHerramientasPorEstadoFisico(this.estadoFisicoSelect.id)
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
          console.error('Error al cargar herramientas por estado:', error);
          this.srvAlerta.error('Error al cargar las herramientas.');
          this.herramientas = [];
          this.filteredHerramientas = [];
          this.totalItems = 0;
        },
      });
  }

  // Aplicar filtros LOCALMENTE (sin ir al backend)
  applyFiltersLocal(): void {
    this.filteredHerramientas = this.herramientas.filter((h) => {
      const codigo = h.codigo?.toLowerCase() ?? '';
      const nombre = h.nombre?.toLowerCase() ?? '';
      const marca = h.marca?.toLowerCase() ?? '';

      const filtroCodigo = this.filtroCodigo.toLowerCase().trim();
      const filtroNombre = this.filtroNombre.toLowerCase().trim();
      const filtroMarca = this.filtroMarca.toLowerCase().trim();

      // Filtro de disponibilidad: comparar por ID (más confiable)
      let filtroDisponibilidadMatch = true;
      if (this.filtroDisponibilidadId !== null) {
        // Comparar el idDisponibilidad de la herramienta con el filtro seleccionado
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

  // Buscar (ejecutar filtros locales)
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

  getEstadoStats(estadoId: number): number {
    switch (estadoId) {
      case 1:
        return this.herramientasExcelente;
      case 2:
        return this.herramientasUsadas;
      case 3:
        return this.herramientasDesgastadas;
      case 4:
        return this.herramientasDaniadas;
      case 5:
        return this.herramientasNoApta;
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
        // Normalizar strings antes de comparar
        if (disponibilidad.toLowerCase().includes('prest'))
          disponibilidad = 'Prestada';
        else if (disponibilidad.toLowerCase().includes('manten'))
          disponibilidad = 'Mantenimiento';
        else if (disponibilidad.toLowerCase().includes('extra'))
          disponibilidad = 'Extraviada';
        else if (disponibilidad.toLowerCase().includes('disp'))
          disponibilidad = 'Disponible';
      } else if (typeof disponibilidad === 'number') {
        const dispMap: { [key: number]: string } = {
          1: 'Disponible',
          2: 'Prestada',
          3: 'Mantenimiento',
          4: 'Extraviada',
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
}

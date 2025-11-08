import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <-- Import FormsModule
import { PageTitleService } from '../../../services/page-title.service';
import { HerramientaService } from '../../../services/herramienta.service';
import { CboHerramientasComponent } from "../../../shared/components/Cbo/cbo-herramientas/cbo-herramientas.component";
import { ModalHistorialComponent } from "../../movimientos/modal-historial/modal-historial.component";
import { PaginatorComponent } from "../../../shared/components/paginator/paginator.component";
import { CboEstadoFisicoHerramientaComponent } from "../../../shared/components/Cbo/cbo-estado-fisico-herramienta/cbo-estado-fisico-herramienta.component";
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
  selector: 'app-estado',
  imports: [
    CommonModule,
    FormsModule, // <-- Add FormsModule here
    PaginatorComponent,
  ],
  templateUrl: './estado.component.html',
  styleUrl: './estado.component.css'
})
export class EstadoComponent implements OnInit {

  herramientas: DisplayHerramienta[] = [];
  filteredHerramientas: DisplayHerramienta[] = [];
  columns: string[] = ['codigo', 'nombre', 'marca', 'estadoFisico', 'disponibilidad'];
  currentPage = 1;
  pageSize = 6;
  loading = false;
  totalItems = 0;
  totalPages = 0;

  // Filtros
  filtroCodigo: string = '';
  filtroNombre: string = '';
  filtroMarca: string = '';
  filtroEstado: string = '';

  // Estadísticas
  herramientasExcelente = 0;
  herramientasUsadas = 0;
  herramientasDesgastadas = 0;
  herramientasDaniadas = 0;
  herramientasNoApta = 0;

  // Filtros
  estadoFisicoSelect: any = null;

  // Estados físicos disponibles
  estadosFisicos = [
    { id: 1, nombre: 'Excelente', icon: 'bi-star-fill', color: 'success' },
    { id: 2, nombre: 'Usada', icon: 'bi-check-circle', color: 'primary' },
    { id: 3, nombre: 'Desgastada', icon: 'bi-exclamation-circle', color: 'warning' },
    { id: 4, nombre: 'Dañada', icon: 'bi-x-circle', color: 'danger' },
    { id: 5, nombre: 'No Apta', icon: 'bi-ban', color: 'dark' }
  ];

  // Modal detalle
  showDetalleModal = false;
  detalleMovimiento: any = null;

  constructor(
    private pageTitleService: PageTitleService,
    private srvHerramienta: HerramientaService,
    private srvAlerta: AlertaService
  ) { }

  ngOnInit(): void {
    this.pageTitleService.setTitle('Estado de Herramientas');
    this.cargarEstadisticas();
    // Inicializar con estado "Dañada" (ID: 4)
    this.estadoFisicoSelect = this.estadosFisicos.find(estado => estado.id === 4);
    this.onSearch();
  }

  getPaginatedHerramientas(): DisplayHerramienta[] {
    return this.filteredHerramientas;
  }

  // Los filtros ahora solo se aplicarán localmente cuando no usamos la paginación del backend
  applyFilters(): void {
    // Si hay filtros activos, hacer una nueva petición al backend en lugar de filtrar localmente
    if (this.hasActiveFilters()) {
      this.fetchHerramientas();
      return;
    }

    // Si no hay filtros, simplemente mostramos los datos tal cual están
    this.filteredHerramientas = [...this.herramientas];
  }

  fetchHerramientas(): void {
    this.loading = true;
    console.log(`[HerramientasList] fetchHerramientas page=${this.currentPage} size=${this.pageSize}`);

    // Construir objeto de filtros para enviar al servicio
    const filters: any = {};
    if (this.filtroCodigo?.trim()) filters.codigo = this.filtroCodigo.trim();
    if (this.filtroNombre?.trim()) filters.nombre = this.filtroNombre.trim();
    if (this.filtroMarca?.trim()) filters.marca = this.filtroMarca.trim();

    // Convertir estado de string a boolean para el backend
    if (this.filtroEstado) {
      filters.estado = this.filtroEstado === 'activo';
    }

    console.debug('[HerramientasList] Enviando filtros:', filters);

    this.srvHerramienta.getTools(1, this.pageSize, filters).subscribe({
      next: (resp: any) => {
        console.debug('[HerramientasList] fetchHerramientas - respuesta:', resp);

        // Extraer datos del array
        let herramientasData = [];

        if (Array.isArray(resp.data)) {
          herramientasData = resp.data;
        } else if (resp.data && Array.isArray(resp.data.data)) {
          herramientasData = resp.data.data;
        }

        // Mapear los datos al formato de visualización
        this.herramientas = herramientasData.map((h: any) => this.mapHerramientaToDisplayFormat(h));

        // Actualizar información de paginación
        this.totalItems = resp.total || herramientasData.length;
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);

        // Usar datos directamente sin filtrado adicional
        this.filteredHerramientas = this.herramientas;
        this.loading = false;

        console.log('[HerramientasList] Herramientas cargadas:', this.herramientas.length);
        console.log('[HerramientasList] Paginación:', {
          total: this.totalItems,
          pages: this.totalPages,
          current: this.currentPage
        });
      },
      error: (error: any) => {
        console.error('Error al cargar herramientas:', error);
        this.srvAlerta.error('Error al cargar las herramientas. Por favor, inténtelo de nuevo.');
        this.loading = false;
      }
    });
  }

  cargarEstadisticas() {
    // Cargar todas las estadísticas en paralelo
    const estadosIds = [1, 2, 3, 4, 5]; // Excelente, Usada, Desgastada, Dañada, No Apta

    estadosIds.forEach(estadoId => {
      this.srvHerramienta.getCountHerramientasByEstadoFisico(estadoId).subscribe({
        next: (response: any) => {
          const count = response?.data ?? 0;
          switch (estadoId) {
            case 1: this.herramientasExcelente = count; break;
            case 2: this.herramientasUsadas = count; break;
            case 3: this.herramientasDesgastadas = count; break;
            case 4: this.herramientasDaniadas = count; break;
            case 5: this.herramientasNoApta = count; break;
          }
        },
        error: (error: any) => {
          console.error(`Error cargando estadísticas para estado ${estadoId}:`, error);
        }
      });
    });
  }

  onEstadoFisicoSelected(estado: any) {
    this.estadoFisicoSelect = estado;
    this.currentPage = 1; // Reset pagination
    this.onSearch();
  }

  onEstadoCardClick(estado: any) {
    this.estadoFisicoSelect = estado;
    this.currentPage = 1;
    this.onSearch();
  }

  hasActiveFilters(): boolean {
    return !!this.estadoFisicoSelect;
  }

  onResetFilters() {
    this.estadoFisicoSelect = null;
    this.herramientas = [];
    this.filteredHerramientas = [];
    this.totalItems = 0;
  }

  onSearch() {
    if (!this.estadoFisicoSelect) {
      this.herramientas = [];
      this.filteredHerramientas = [];
      this.totalItems = 0;
      return;
    }

    this.loading = true;

    this.srvHerramienta.getHerramientasPorEstadoFisico(this.estadoFisicoSelect.id).subscribe({
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
        console.error('Error al cargar herramientas por estado físico:', error);
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

  getVisiblePages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    const half = Math.floor(maxVisible / 2);

    let start = Math.max(1, this.currentPage - half);
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  onPageEvent(event: { pageIndex: number, pageSize: number }): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.calculatePagination();
    this.updateFilteredData();
  }

  getEstadoStats(estadoId: number): number {
    switch (estadoId) {
      case 1: return this.herramientasExcelente;
      case 2: return this.herramientasUsadas;
      case 3: return this.herramientasDesgastadas;
      case 4: return this.herramientasDaniadas;
      case 5: return this.herramientasNoApta;
      default: return 0;
    }
  }

  abrirModalDetalle(movimiento: any) {
    this.detalleMovimiento = movimiento;
    this.showDetalleModal = true;
  }

  cerrarModalDetalle() {
    this.showDetalleModal = false;
    this.detalleMovimiento = null;
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
      nombre: h['nombreHerramienta'] ?? h['nombre'] ?? '', // Primero buscar nombreHerramienta
      marca: h['marca'] ?? '',
      tipo: h['tipo'] ?? '',
      estadoFisico: h['estadoFisico'] ?? '',
      disponibilidad: disponibilidad,
      ubicacion: h['ubicacion'] ?? h['ubicacionFisica'] ?? '', // Añadir ubicacionFisica como fallback
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
}

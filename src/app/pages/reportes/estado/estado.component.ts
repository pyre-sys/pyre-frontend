import { Component, OnInit } from '@angular/core';
import { PageTitleService } from '../../../services/page-title.service';
import { HerramientaService } from '../../../services/herramienta.service';
import { CboHerramientasComponent } from "../../../shared/components/Cbo/cbo-herramientas/cbo-herramientas.component";
import { ModalHistorialComponent } from "../../movimientos/modal-historial/modal-historial.component";
import { PaginatorComponent } from "../../../shared/components/paginator/paginator.component";
import { CboEstadoFisicoHerramientaComponent } from "../../../shared/components/Cbo/cbo-estado-fisico-herramienta/cbo-estado-fisico-herramienta.component";
import { CommonModule } from '@angular/common';
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
  imports: [CboHerramientasComponent,
    ModalHistorialComponent,
    PaginatorComponent,
    CboEstadoFisicoHerramientaComponent,
    CommonModule
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
  herramientaSelect: any = null;
  estadoFisicoSelect: any = null;


  // Modal detalle
  showDetalleModal = false;
  detalleMovimiento: any = null;

  constructor(
    private pageTitleService: PageTitleService,
    private srvHerramienta: HerramientaService,
    private srvAlerta: AlertaService
  ) { }

  ngOnInit(): void {
    this.pageTitleService.setTitle('Reportes');
    this.cargarEstadisticas();
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
    const params: any = { search: '' }; // Elimina 'resumen' si no es una propiedad válida
    this.srvHerramienta.getTools().subscribe({
      next: (response: any) => {
        const herramientas = response.data || [];
        this.herramientasExcelente = herramientas.filter((h: any) => h.estadoFisicoHerramienta === 'excelente').length;
        this.herramientasUsadas = herramientas.filter((h: any) => h.estadoFisicoHerramienta === 'usada').length;
        this.herramientasDesgastadas = herramientas.filter((h: any) => h.estadoFisicoHerramienta === 'desgastada').length;
        this.herramientasDaniadas = herramientas.filter((h: any) => h.estadoFisicoHerramienta === 'daniada').length;
        this.herramientasNoApta = herramientas.filter((h: any) => h.estadoFisicoHerramienta === 'no apta').length;
      },
      error: (error: any) => {
        console.error('Error cargando estadísticas:', error);
      }
    });
  }

  onHerramientaSelected(herramienta: any) {
    this.herramientaSelect = herramienta;
  }

  onEstadoFisicoSelected(estado: any) {
    this.estadoFisicoSelect = estado;
  }

  hasActiveFilters(): boolean {
    return !!this.herramientaSelect || !!this.estadoFisicoSelect;
  }

  onResetFilters() {
    this.herramientaSelect = null;
    this.estadoFisicoSelect = null;
    this.onSearch();
  }

  onSearch() {
    this.loading = true;
    const params: any = {
      herramienta: this.herramientaSelect?.id,
      estadoFisico: this.estadoFisicoSelect?.id,
      page: this.currentPage,
      pageSize: this.pageSize
    };
    this.srvHerramienta.getTools(params).subscribe({
      next: (res: any) => {
        this.herramientas = res.items || [];
        this.totalItems = res.total || 0;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
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
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.calculatePagination();
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
    // pageIndex es 0-based, pero backend espera 1-based
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;

    console.log(`[HerramientasList] Cambio de página: pageIndex=${event.pageIndex}, pageSize=${event.pageSize}`);
    console.log(`[HerramientasList] Solicitando página ${this.currentPage} con ${this.pageSize} registros por página`);

    this.fetchHerramientas();
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
}

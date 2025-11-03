import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HerramientasModalComponent } from '../modal-herramienta/modal-herramienta.component';
import { HerramientaService } from '../../../services/herramienta.service';
import { AlertaService } from '../../../services/alerta.service';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { PageTitleService } from '../../../services/page-title.service';

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

// Nueva interfaz para la paginación
interface PaginationData {
  totalRecords?: number;
  totalPages?: number;
  currentPage?: number;
  page?: number;
  pageSize?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

// Nueva interfaz para la respuesta
interface ApiResponse {
  data:
    | any[]
    | {
        data: any[];
        pagination?: PaginationData;
        page?: number;
        pageSize?: number;
        totalRecords?: number;
        totalPages?: number;
        hasNextPage?: boolean;
        hasPreviousPage?: boolean;
      };
  total?: number;
  pagination?: PaginationData;
}

@Component({
  selector: 'app-visor-herramientas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    HerramientasModalComponent,
    PaginatorComponent,
    NgbTooltipModule,
  ],
  templateUrl: './visor-herramientas.component.html',
  styleUrls: ['../../../../styles/visor-style.css'],
  providers: [HerramientaService, AlertaService],
})
export class VisorHerramientasComponent implements OnInit {
  herramientas: DisplayHerramienta[] = [];
  filteredHerramientas: DisplayHerramienta[] = [];
  columns: string[] = [
    'codigo',
    'nombre',
    'marca',
    'estadoFisico',
    'disponibilidad',
  ];
  currentPage = 1;
  pageSize = 6;
  loading = false;
  totalItems = 0;
  totalPages = 0;

  // Expose Math to template
  Math = Math;

  // Filtros
  filtroCodigo: string = '';
  filtroNombre: string = '';
  filtroMarca: string = '';
  filtroEstado: string = '';

  // Modal control
  showToolModal = false;
  modalInitialData: any = null;
  modalMode: 'create' | 'edit' = 'create';

  // Constructor con inyección de servicios
  constructor(
    private srvHerramienta: HerramientaService,
    private srvAlerta: AlertaService,
    private pageTitleService: PageTitleService
  ) {}

  ngOnInit(): void {
    this.pageTitleService.setTitle('Listado de Herramientas');
    this.fetchHerramientas();
  }

  fetchHerramientas(): void {
    this.loading = true;

    // Construir objeto de filtros para enviar al servicio
    const filters: any = {};
    if (this.filtroCodigo?.trim()) filters.codigo = this.filtroCodigo.trim();
    if (this.filtroNombre?.trim()) filters.nombre = this.filtroNombre.trim();
    if (this.filtroMarca?.trim()) filters.marca = this.filtroMarca.trim();

    // Convertir estado de string a boolean para el backend
    if (this.filtroEstado) {
      filters.estado = this.filtroEstado === 'activo';
    }

    this.srvHerramienta
      .getTools(this.currentPage, this.pageSize, filters)
      .subscribe({
        next: (resp: any) => {
          let herramientasData = [];

          if (Array.isArray(resp.data)) {
            herramientasData = resp.data;
          } else if (resp.data && Array.isArray(resp.data.data)) {
            herramientasData = resp.data.data;
          }

          // Mapear los datos al formato de visualización
          this.herramientas = herramientasData.map((h: any) =>
            this.mapHerramientaToDisplayFormat(h)
          );

          // Actualizar información de paginación
          this.totalItems = resp.total || herramientasData.length;
          this.totalPages = Math.ceil(this.totalItems / this.pageSize);

          // Usar datos directamente sin filtrado adicional
          this.filteredHerramientas = this.herramientas;
          this.loading = false;
        },
        error: (error: any) => {
          this.srvAlerta.error(
            'Error al cargar las herramientas. Por favor, inténtelo de nuevo.'
          );
          this.loading = false;
        },
      });
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

    // Mapeo para normalizar los valores de disponibilidad
    let disponibilidad = h['estadoDisponibilidad'] ?? h['disponibilidad'] ?? '';

    // Normalizar disponibilidad según los valores correctos
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
      nombre: h['nombreHerramienta'] ?? h['nombre'] ?? '', // Primero buscar nombreHerramienta
      marca: h['marca'] ?? '',
      tipo: h['tipo'] ?? '',
      estadoFisico: h['estadoFisico'] ?? '',
      disponibilidad: disponibilidad,
      ubicacion: h['ubicacion'] ?? h['ubicacionFisica'] ?? '', // Añadir ubicacionFisica como fallback
      planta: h['nombrePlanta'] ?? h['planta'] ?? '',
      activo: activo,
      estado: estado,
    } as DisplayHerramienta;
  }

  // Reimplementación de métodos para que coincidan con los de visor-usuario
  onSearch(): void {
    this.currentPage = 1;
    this.fetchHerramientas();
  }

  onResetFilters(): void {
    this.filtroCodigo = '';
    this.filtroNombre = '';
    this.filtroMarca = '';
    this.filtroEstado = '';
    this.currentPage = 1;
    this.fetchHerramientas();
  }

  getPaginatedHerramientas(): DisplayHerramienta[] {
    return this.filteredHerramientas;
  }

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
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

  hasActiveFilters(): boolean {
    return !!(
      this.filtroCodigo?.trim() ||
      this.filtroNombre?.trim() ||
      this.filtroMarca?.trim() ||
      this.filtroEstado
    );
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

  createNewTool(): void {
    this.modalInitialData = null;
    this.modalMode = 'create';
    this.showToolModal = true;
  }

  editTool(item: DisplayHerramienta): void {
    const id = item?.id ?? item?.idHerramienta ?? null;
    if (id == null) return;

    this.modalInitialData = null;
    this.modalMode = 'edit';
    this.showToolModal = true;

    this.srvHerramienta.getToolById(Number(id)).subscribe({
      next: (resp: any) => {
        // Extraer los datos de la respuesta según su estructura
        const toolData = resp?.data ?? resp ?? null;

        // Si no hay datos o están vacíos, usar el item directamente
        if (!toolData) {
          this.modalInitialData = item;
          return;
        }

        // Normalizar el objeto para asegurar que tenga todas las propiedades necesarias
        const normalizedData = {
          ...toolData,
          // Asegurar que nombreHerramienta/nombre estén presentes
          nombreHerramienta:
            toolData.nombreHerramienta || toolData.nombre || item.nombre,
          nombre: toolData.nombre || toolData.nombreHerramienta || item.nombre,
          // Asegurar que disponibilidad/estadoDisponibilidad estén presentes
          disponibilidad:
            toolData.disponibilidad ||
            toolData.estadoDisponibilidad ||
            item.disponibilidad,
          estadoDisponibilidad:
            toolData.estadoDisponibilidad ||
            toolData.disponibilidad ||
            item.disponibilidad,
          // Asegurar que estadoFisico esté presente
          estadoFisico: toolData.estadoFisico || item.estadoFisico || 'Bueno',
          // Asegurar que id/idHerramienta estén presentes
          id: toolData.id || toolData.idHerramienta || item.id,
          idHerramienta:
            toolData.idHerramienta || toolData.id || item.idHerramienta,
        };

        this.modalInitialData = normalizedData;
      },
      error: (err: any) => {
        this.modalInitialData = item;
      },
    });
  }

  deleteTool(item: DisplayHerramienta): void {
    const id = item?.id ?? item?.idHerramienta ?? null;
    if (id == null) return;

    this.srvAlerta
      .confirm(
        '¿Estás seguro de que deseas eliminar esta herramienta?',
        'Eliminar Herramienta'
      )
      .then((result: any) => {
        if (result && result.isConfirmed) {
          this.srvHerramienta.deleteTool(Number(id)).subscribe({
            next: () => {
              this.srvAlerta.success(
                'La herramienta ha sido eliminada correctamente.',
                '¡Eliminada!'
              );
              this.fetchHerramientas();
            },
            error: (err: any) => {
              this.srvAlerta.error(
                'No se pudo eliminar la herramienta. Intente nuevamente.'
              );
            },
          });
        }
      });
  }

  toggleToolActive(item: DisplayHerramienta): void {
    const id = item?.id ?? item?.idHerramienta ?? null;
    if (id == null) return;

    const current = item.activo;
    const targetState = !current;
    const actionText = targetState ? 'activar' : 'desactivar';

    this.srvAlerta
      .confirm(
        `¿Estás seguro de que deseas ${actionText} esta herramienta?`,
        `${
          actionText.charAt(0).toUpperCase() + actionText.slice(1)
        } Herramienta`
      )
      .then((result: any) => {
        if (result && result.isConfirmed) {
          // Usar el nuevo método updateToolStatus en lugar de toggleActivo
          this.srvHerramienta
            .updateToolStatus(Number(id), targetState)
            .subscribe({
              next: (response) => {
                // Verificar si la respuesta contiene información sobre el éxito de la operación
                const success = response?.success !== false;

                if (success) {
                  item.activo = targetState; // Actualizar el estado localmente
                  const pastText = targetState ? 'activada' : 'desactivada';
                  this.srvAlerta.success(
                    `Herramienta ${pastText} correctamente.`,
                    '¡Hecho!'
                  );
                } else {
                  // Si el backend indica que hubo un error
                  const errorMsg =
                    response?.message ||
                    'No se pudo cambiar el estado de la herramienta.';
                  this.srvAlerta.error(errorMsg);
                }
              },
              error: (err: any) => {
                // Extraer mensaje de error del backend si está disponible
                const errorMsg =
                  err?.error?.message ||
                  err?.message ||
                  'No se pudo cambiar el estado de la herramienta. Intente nuevamente.';

                this.srvAlerta.error(errorMsg);
              },
            });
        }
      });
  }

  closeToolModal(): void {
    this.showToolModal = false;
    this.modalInitialData = null;
    this.modalMode = 'create';
  }

  async onModalSubmit(event: {
    mode: 'create' | 'edit';
    data: any;
    onSuccess: (response: any) => void;
    onError: (error: any) => void;
  }) {
    if (event.mode === 'create') {
      this.srvHerramienta.createTool(event.data).subscribe({
        next: (response) => {
          this.fetchHerramientas();
          event.onSuccess(response);
        },
        error: (err) => {
          event.onError(err);
        },
      });
    } else {
      const id = Number(
        this.modalInitialData?.id ??
          this.modalInitialData?.idHerramienta ??
          null
      );
      if (!id) {
        const error = {
          message: 'No se pudo identificar la herramienta a actualizar',
        };
        event.onError(error);
        return;
      }

      this.srvHerramienta.updateTool(id, event.data).subscribe({
        next: (response) => {
          this.fetchHerramientas();
          event.onSuccess(response);
        },
        error: (err) => {
          event.onError(err);
        },
      });
    }
  }

  onPageEvent(event: { pageIndex: number; pageSize: number }): void {
    // pageIndex es 0-based, pero backend espera 1-based
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;

    this.fetchHerramientas();
  }

  private showSnack(message: string): void {
    console.log('SNACK:', message);
  }
}

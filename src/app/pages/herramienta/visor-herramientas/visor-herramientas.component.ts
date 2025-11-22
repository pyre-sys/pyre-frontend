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
import { CboDisponibilidadHerramientaComponent } from '../../../shared/components/Cbo/cbo-disponibilidad-herramienta/cbo-disponibilidad-herramienta.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';

interface DisplayHerramienta {
  id?: number;
  idHerramienta?: number;
  codigo?: string;
  nombre?: string;
  marca?: string;
  tipo?: string;
  estadoFisico?: string;
  disponibilidad?: string;
  activo?: boolean;
  estado?: string;
  bloqueado?: boolean;
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
    CboDisponibilidadHerramientaComponent,
    SpinnerComponent,
  ],
  templateUrl: './visor-herramientas.component.html',
  styleUrls: ['../../../../styles/visor-style.css'],
  providers: [HerramientaService, AlertaService],
})
export class VisorHerramientasComponent implements OnInit {
  herramientas: DisplayHerramienta[] = [];
  filteredHerramientas: DisplayHerramienta[] = [];
  currentPage = 1;
  pageSize = 6;
  totalItems = 0;
  totalPages = 1;
  isLoading = false;

  filtroCodigo = '';
  filtroNombre = '';
  filtroMarca = '';
  filtroDisponibilidadId: number | null = null;
  selectedDisponibilidad: any = null;

  showToolModal = false;
  modalInitialData: any = null;
  modalMode: 'create' | 'edit' = 'create';

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
    this.isLoading = true;

    const filters: any = {};
    if (this.filtroCodigo.trim()) filters.codigo = this.filtroCodigo.trim();
    if (this.filtroNombre.trim()) filters.nombre = this.filtroNombre.trim();
    if (this.filtroMarca.trim()) filters.marca = this.filtroMarca.trim();

    // Fix disponibilidad filter
    if (this.filtroDisponibilidadId) {
      filters.idDisponibilidad = this.filtroDisponibilidadId;
    }

    this.srvHerramienta
      .getTools(this.currentPage, this.pageSize, filters)
      .subscribe({
        next: (resp: any) => {
          const data: any[] = Array.isArray(resp.data)
            ? resp.data
            : resp.data?.data ?? [];
          this.herramientas = data.map((h: any) => this.mapHerramienta(h));
          this.filteredHerramientas = [...this.herramientas];
          this.totalItems = resp.total ?? data.length;
          this.calculatePagination();
          this.isLoading = false;
        },
        error: () => {
          this.srvAlerta.error('Error al cargar las herramientas.');
          this.isLoading = false;
        },
      });
  }

  private mapHerramienta(h: any): DisplayHerramienta {
    const bloqueado =
      h.bloqueado ||
      h.estadoDisponibilidad?.toLowerCase()?.includes('bloque') ||
      false;

    return {
      id: h.id ?? h.idHerramienta,
      codigo: h.codigo,
      nombre: h.nombreHerramienta ?? h.nombre,
      marca: h.marca,
      estadoFisico: h.estadoFisico,
      disponibilidad: h.estadoDisponibilidad ?? h.disponibilidad,
      activo: h.activo,
      estado: h.activo ? 'Activo' : 'Inactivo',
      bloqueado,
    };
  }

  onSearch(): void {
    this.currentPage = 1;
    this.fetchHerramientas();
  }

  onDisponibilidadSelected(disponibilidad: any): void {
    this.selectedDisponibilidad = disponibilidad;
    this.filtroDisponibilidadId =
      disponibilidad?.idEstadoDisponibilidad ?? null;
    console.log('filtroDisponibilidadId set to:', this.filtroDisponibilidadId);
  }

  onResetFilters(): void {
    this.filtroCodigo = '';
    this.filtroNombre = '';
    this.filtroMarca = '';
    this.filtroDisponibilidadId = null;
    this.selectedDisponibilidad = null;
    this.currentPage = 1;
    this.fetchHerramientas();
  }

  hasActiveFilters(): boolean {
    return !!(
      this.filtroCodigo?.trim() ||
      this.filtroNombre?.trim() ||
      this.filtroMarca?.trim() ||
      this.filtroDisponibilidadId
    );
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

  applyFilters(): void {
    if (this.hasActiveFilters()) {
      this.fetchHerramientas();
      return;
    }
    this.filteredHerramientas = [...this.herramientas];
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.fetchHerramientas();
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.calculatePagination();
    this.fetchHerramientas();
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
    // Configuración instantánea sin demoras
    this.modalInitialData = null;
    this.modalMode = 'create';
    this.showToolModal = true;

    // Sin setTimeout ni operaciones asíncronas - el modal debe aparecer inmediatamente
  }

  editTool(item: DisplayHerramienta): void {
    const id = item?.id ?? item?.idHerramienta ?? null;
    if (id == null) return;

    // Mostrar el modal inmediatamente sin esperar la carga de datos
    this.modalInitialData = null;
    this.modalMode = 'edit';
    this.showToolModal = true;

    // Cargar datos en segundo plano - el modal se mostrará con loading
    this.srvHerramienta.getToolById(Number(id)).subscribe({
      next: (resp: any) => {
        const toolData = resp?.data ?? resp ?? null;

        const normalizedData = {
          ...toolData,
          nombreHerramienta:
            toolData?.nombreHerramienta || toolData?.nombre || item.nombre,
          nombre:
            toolData?.nombre || toolData?.nombreHerramienta || item.nombre,
          disponibilidad:
            toolData?.disponibilidad ||
            toolData?.estadoDisponibilidad ||
            item.disponibilidad,
          estadoDisponibilidad:
            toolData?.estadoDisponibilidad ||
            toolData?.disponibilidad ||
            item.disponibilidad,
          estadoFisico: toolData?.estadoFisico || item.estadoFisico || 'Bueno',
          id: toolData?.id || toolData?.idHerramienta || item.id,
          idHerramienta:
            toolData?.idHerramienta || toolData?.id || item.idHerramienta,
        };

        this.modalInitialData = normalizedData;
      },
      error: () => {
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
        if (result?.isConfirmed) {
          this.srvHerramienta.deleteTool(Number(id)).subscribe({
            next: (resp: any) => {
              const msg =
                resp?.message ??
                'La herramienta ha sido eliminada correctamente.';
              this.srvAlerta.success(msg, '¡Eliminada!');
              this.fetchHerramientas();
            },
            error: (err: any) => {
              const errorMsg =
                err?.error?.message ||
                err?.message ||
                'No se pudo eliminar la herramienta. Intente nuevamente.';
              this.srvAlerta.error(errorMsg);
            },
          });
        }
      });
  }

  toggleToolActive(item: DisplayHerramienta): void {
    const id = item?.id ?? item?.idHerramienta ?? null;
    if (id == null) return;

    const targetState = !item.activo;
    const actionText = targetState ? 'activar' : 'desactivar';

    this.srvAlerta
      .confirm(
        `¿Estás seguro de que deseas ${actionText} esta herramienta?`,
        `${
          actionText.charAt(0).toUpperCase() + actionText.slice(1)
        } Herramienta`
      )
      .then((result: any) => {
        if (result?.isConfirmed) {
          this.srvHerramienta
            .updateToolStatus(Number(id), targetState)
            .subscribe({
              next: (response: any) => {
                const success = response?.success !== false;
                const msg = response?.message;

                if (success) {
                  item.activo = targetState;
                  const pastText = targetState ? 'activada' : 'desactivada';
                  this.srvAlerta.success(
                    msg ?? `Herramienta ${pastText} correctamente.`,
                    '¡Hecho!'
                  );
                } else {
                  this.srvAlerta.error(
                    msg ?? 'No se pudo cambiar el estado de la herramienta.'
                  );
                }
              },
              error: (err: any) => {
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

  toggleBloqueo(item: DisplayHerramienta): void {
    const id = item?.id ?? item?.idHerramienta ?? null;
    if (id == null) return;

    const isCurrentlyBlocked = item.bloqueado;
    const actionText = isCurrentlyBlocked ? 'desbloquear' : 'bloquear';
    const title = isCurrentlyBlocked ? 'Desbloqueo' : 'Bloqueo';

    this.srvAlerta
      .confirm(`¿Desea ${actionText} esta herramienta?`, title)
      .then((result: any) => {
        if (result?.isConfirmed) {
          this.srvHerramienta.toggleBloqueo(Number(id)).subscribe({
            next: (resp: any) => {
              item.bloqueado =
                typeof resp?.bloqueado !== 'undefined'
                  ? resp.bloqueado
                  : !item.bloqueado;
              const msg =
                resp?.message ?? `Herramienta ${actionText} correctamente.`;
              this.srvAlerta.success(msg, '¡Hecho!');
              this.fetchHerramientas();
            },
            error: (err: any) => {
              const errorMsg =
                err?.error?.message ||
                err?.message ||
                `No se pudo ${actionText} la herramienta.`;
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

  onModalSubmit(event: {
    mode: 'create' | 'edit';
    data: any;
    onSuccess: (response: any) => void;
    onError: (error: any) => void;
  }) {
    if (event.mode === 'create') {
      this.srvHerramienta.createTool(event.data).subscribe({
        next: (response: any) => {
          const msg = response?.message ?? 'Herramienta creada correctamente.';
          this.srvAlerta.success(msg, '¡Hecho!');
          this.fetchHerramientas();
          event.onSuccess(response);
        },
        error: (err: any) => {
          const errorMsg =
            err?.error?.message ||
            err?.message ||
            'Error al crear la herramienta.';
          this.srvAlerta.error(errorMsg);
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
        next: (response: any) => {
          const msg =
            response?.message ?? 'Herramienta actualizada correctamente.';
          this.srvAlerta.success(msg, '¡Hecho!');
          this.fetchHerramientas();
          event.onSuccess(response);
        },
        error: (err: any) => {
          const errorMsg =
            err?.error?.message ||
            err?.message ||
            'Error al actualizar la herramienta.';
          this.srvAlerta.error(errorMsg);
          event.onError(err);
        },
      });
    }
  }

  onPageEvent(event: { pageIndex: number; pageSize: number }): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.fetchHerramientas();
  }

  private showSnack(message: string): void {
    console.log('SNACK:', message);
  }

  // Añadir método para descargar el reporte Excel
  downloadReporteExcel(): void {
    this.isLoading = true;
    this.srvHerramienta.reporteHerramientas().subscribe({
      next: (blob: Blob) => {
        try {
          const url = window.URL.createObjectURL(blob);
          const fileName = `Reporte_Herramientas_${new Date()
            .toISOString()
            .slice(0, 10)
            .replace(/-/g, '')}.xlsx`;
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
          this.isLoading = false;
          this.srvAlerta.success(
            'Reporte descargado correctamente.',
            'Descarga'
          );
        } catch (e) {
          console.error('Error al procesar el archivo:', e);
          this.srvAlerta.error('No se pudo procesar el archivo descargado.');
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        console.error('Error al descargar reporteHerramientas:', err);
        const msg =
          err?.error?.message ||
          err?.message ||
          'No se pudo descargar el reporte. Intente nuevamente.';
        this.srvAlerta.error(msg);
      },
    });
  }
}

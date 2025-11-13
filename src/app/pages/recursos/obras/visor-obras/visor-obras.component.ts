import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ObrasService, ObraDto } from '../../../../services/obras.service';
import { AlertaService } from '../../../../services/alerta.service';
import { ObraEditModalComponent } from '../modal-obras/modal-obras.component';
import { PageTitleService } from '../../../../services/page-title.service';

@Component({
  selector: 'app-visor-obras',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ObraEditModalComponent
  ],
  templateUrl: './visor-obras.component.html',
  styleUrls: ['./visor-obras.component.css'],
  providers: [ObrasService]
})
export class VisorObrasComponent implements OnInit {
  obras: ObraDto[] = [];
  filteredObras: ObraDto[] = [];
  columns: string[] = ['codigo', 'nombreObra', 'ubicacion', 'fechaInicio', 'fechaFin'];
  rowsPerPageOptions: number[] = [5, 10, 20, 40];
  currentPage = 1;
  pageSize = 10;
  loading = false;
  totalItems = 0;
  totalPages = 0;

  // Expose Math to template
  Math = Math;

  // Filtros
  filtroNombre: string = '';
  filtroEstado: string = '';

  showObraModal = false;
  modalInitialData: any = null;
  modalMode: 'create' | 'edit' = 'create';

  showDetailsModal = false;
  detailsData: any = null;

  constructor(private obrasService: ObrasService, private alertService: AlertaService, private pageTitleService: PageTitleService) { }

  ngOnInit(): void {
    this.pageTitleService.setTitle('Obras');
    this.fetchObras();
  }

  fetchObras(): void {
    this.loading = true;
    this.obrasService.getObrasPaged(this.currentPage, this.pageSize).subscribe({
      next: (resp) => {
        const pagedData = resp?.data ?? {};
        const rawList = Array.isArray(pagedData.data) ? pagedData.data : [];
        this.totalItems = pagedData.totalRecords ?? rawList.length ?? 0;
        this.currentPage = pagedData.page ?? 1;
        this.pageSize = pagedData.pageSize ?? this.pageSize;
        this.obras = rawList.map((o: any) => ({
          idObra: o.idObra,
          codigo: o.codigo,
          nombreObra: o.nombreObra,
          ubicacion: o.ubicacion,
          fechaInicio: o.fechaInicio,
          fechaFin: o.fechaFin,
          estado: o.estado || 'Activo' // Default state
        }));
        this.applyFilters();
        this.calculatePagination();
        this.loading = false;
      },
      error: () => {
        this.showSnack('Error al cargar las obras. Por favor, inténtelo de nuevo.');
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredObras = this.obras.filter(obra => {
      const matchesNombre = !this.filtroNombre ||
        obra.nombreObra?.toLowerCase().includes(this.filtroNombre.toLowerCase());

      const matchesEstado = !this.filtroEstado ||
        (this.filtroEstado === 'activo') ||
        (this.filtroEstado === 'inactivo');

      return matchesNombre && matchesEstado;
    });

    this.totalItems = this.filteredObras.length;
    this.calculatePagination();
  }

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
  }

  getPaginatedObras(): ObraDto[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredObras.slice(startIndex, endIndex);
  }

  onSearch(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onResetFilters(): void {
    this.filtroNombre = '';
    this.filtroEstado = '';
    this.currentPage = 1;
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return !!(this.filtroNombre?.trim() || this.filtroEstado);
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

  editObra(item: ObraDto): void {
    const id = item?.idObra ?? null;
    if (id == null) return;
    this.modalInitialData = null;
    this.modalMode = 'edit';
    this.showObraModal = true;
    this.obrasService.getObraById(id).subscribe({
      next: (resp) => {
        this.modalInitialData = resp?.data ?? null;
      },
      error: () => {
        this.modalInitialData = item;
      }
    });
  }

  deleteObra(item: ObraDto): void {
    const id = item?.idObra ?? null;
    if (id == null) return;
    this.alertService.confirm('¿Estás seguro de que deseas eliminar esta obra?', 'Eliminar Obra')
      .then((result: any) => {
        if (result && result.isConfirmed) {
          this.obrasService.deleteObra(id).subscribe({
            next: () => {
              this.alertService.success('La obra ha sido eliminada correctamente.', '¡Eliminado!');
              this.fetchObras();
            },
            error: () => {
              this.alertService.error('No se pudo eliminar la obra. Intente nuevamente.');
            }
          });
        }
      });
  }

  createNewObra(): void {
    this.modalInitialData = null;
    this.modalMode = 'create';
    this.showObraModal = true;
  }

  closeObraModal(): void {
    this.showObraModal = false;
    this.modalInitialData = null;
    this.modalMode = 'create';
  }

  async onModalSubmit(event: {
    mode: 'create' | 'edit';
    data: any;
    onSuccess: () => void;
    onError: (error: any) => void;
  }) {
    if (event.mode === 'create') {
      this.obrasService.createObra(event.data).subscribe({
        next: () => {
          this.fetchObras();
          event.onSuccess();
        },
        error: (err) => {
          event.onError(err);
        }
      });
    } else {
      // Intentar detectar id desde distintos campos que pueden venir (IdObra, idObra, Id)
      const idFromData = Number(event.data?.IdObra ?? event.data?.idObra ?? event.data?.Id ?? null);
      const idFromModal = Number(this.modalInitialData?.idObra ?? this.modalInitialData?.IdObra ?? null);
      const id = idFromData || idFromModal;

      if (!id) {
        event.onError({ message: 'No se pudo identificar la obra a actualizar' });
        return;
      }

      // Asegurar que el body tenga la propiedad IdObra (por si no la trae)
      if (!event.data?.IdObra) {
        event.data.IdObra = id;
      }

      this.obrasService.updateObra(id, event.data).subscribe({
        next: () => {
          this.fetchObras();
          event.onSuccess();
        },
        error: (err) => {
          event.onError(err);
        }
      });
    }
  }

  viewObra(item: ObraDto): void {
    this.detailsData = item;
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.detailsData = null;
  }

  private showSnack(message: string): void {
    console.log('SNACK:', message);
  }
}

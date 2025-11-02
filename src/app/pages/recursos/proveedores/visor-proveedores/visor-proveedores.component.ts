import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProveedoresService } from '../../../../services/proveedores.service';
import { AlertaService } from '../../../../services/alerta.service';
import { ModalProveedorComponent } from '../modal-proveedor/modal-proveedor.component';
import { PageTitleService } from '../../../../services/page-title.service';

export interface ProveedorDto {
  idProveedor: number;
  nombreProveedor: string;
  contacto: string;
  cuit?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  descripcion?: string;
  activo: boolean;
}

@Component({
  selector: 'app-visor-proveedores',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ModalProveedorComponent,
  ],
  templateUrl: './visor-proveedores.component.html',
  styleUrls: ['./visor-proveedores.component.css'],
  providers: [ProveedoresService]
})
export class VisorProveedoresComponent implements OnInit {
  proveedores: ProveedorDto[] = [];
  filteredProveedores: ProveedorDto[] = [];
  columns: string[] = ['nombreProveedor', 'contacto', 'cuit', 'telefono', 'email', 'direccion'];
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

  showProveedorModal = false;
  modalInitialData: any = null;
  modalMode: 'create' | 'edit' = 'create';

  showDetailsModal = false;
  detailsData: any = null;

  constructor(private proveedoresService: ProveedoresService, private alertService: AlertaService, private pageTitleService: PageTitleService) { }

  ngOnInit(): void {
    this.pageTitleService.setTitle('Proveedores');
    this.fetchProveedores();
  }

  fetchProveedores(): void {
    this.loading = true;
    this.proveedoresService.getProveedores(this.currentPage, this.pageSize).subscribe({
      next: (resp) => {
        const pagedData = resp?.data ?? {};
        const rawList = Array.isArray(pagedData.data) ? pagedData.data : [];
        this.totalItems = pagedData.totalRecords ?? rawList.length ?? 0;
        this.currentPage = pagedData.page ?? 1;
        this.pageSize = pagedData.pageSize ?? this.pageSize;
        this.proveedores = rawList.map((p: any) => ({
          idProveedor: p.idProveedor,
          nombreProveedor: p.nombreProveedor,
          contacto: p.contacto,
          cuit: p.cuit,
          telefono: p.telefono,
          email: p.email,
          direccion: p.direccion,
          descripcion: p.descripcion,
          activo: p.activo
        }));
        this.applyFilters();
        this.calculatePagination();
        this.loading = false;
      },
      error: () => {
        this.showSnack('Error al cargar los proveedores. Por favor, inténtelo de nuevo.');
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredProveedores = this.proveedores.filter(proveedor => {
      const matchesNombre = !this.filtroNombre ||
        proveedor.nombreProveedor?.toLowerCase().includes(this.filtroNombre.toLowerCase());

      const matchesEstado = !this.filtroEstado ||
        (this.filtroEstado === 'activo' && proveedor.activo) ||
        (this.filtroEstado === 'inactivo' && !proveedor.activo);

      return matchesNombre && matchesEstado;
    });

    this.totalItems = this.filteredProveedores.length;
    this.calculatePagination();
  }

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
  }

  getPaginatedProveedores(): ProveedorDto[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredProveedores.slice(startIndex, endIndex);
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

  editProveedor(item: ProveedorDto): void {
    const id = item?.idProveedor ?? null;
    if (id == null) return;
    this.modalInitialData = null;
    this.modalMode = 'edit';
    this.showProveedorModal = true;
    this.proveedoresService.getProveedorById(id).subscribe({
      next: (resp) => {
        this.modalInitialData = resp?.data ?? null;
      },
      error: () => {
        this.modalInitialData = item;
      }
    });
  }

  deleteProveedor(item: ProveedorDto): void {
    const id = item?.idProveedor ?? null;
    if (id == null) return;
    this.alertService.confirm('¿Estás seguro de que deseas eliminar este proveedor?', 'Eliminar Proveedor')
      .then((result: any) => {
        if (result && result.isConfirmed) {
          this.proveedoresService.deleteProveedor(id).subscribe({
            next: () => {
              this.alertService.success('El proveedor ha sido eliminado correctamente.', '¡Eliminado!');
              this.fetchProveedores();
            },
            error: () => {
              this.alertService.error('No se pudo eliminar el proveedor. Intente nuevamente.');
            }
          });
        }
      });
  }

  createNewProveedor(): void {
    this.modalInitialData = null;
    this.modalMode = 'create';
    this.showProveedorModal = true;
  }

  closeProveedorModal(): void {
    this.showProveedorModal = false;
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
      this.proveedoresService.createProveedor(event.data).subscribe({
        next: () => {
          this.fetchProveedores();
          event.onSuccess();
        },
        error: (err) => {
          event.onError(err);
        }
      });
    } else {
      const id = Number(this.modalInitialData?.idProveedor ?? null);
      if (!id) {
        event.onError({ message: 'No se pudo identificar el proveedor a actualizar' });
        return;
      }
      this.proveedoresService.updateProveedor(id, event.data).subscribe({
        next: () => {
          this.fetchProveedores();
          event.onSuccess();
        },
        error: (err) => {
          event.onError(err);
        }
      });
    }
  }

  viewProveedor(item: ProveedorDto): void {
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

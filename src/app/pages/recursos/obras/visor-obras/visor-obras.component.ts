import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ObrasService, ObraDto } from '../../../../services/obras.service';
import { AlertaService } from '../../../../services/alerta.service';
import { ObraEditModalComponent } from '../modal-obras/modal-obras.component';
import { PaginatorComponent } from '../../../../shared/components/paginator/paginator.component';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner.component';
import { PageTitleService } from '../../../../services/page-title.service';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-visor-obras',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ObraEditModalComponent,
    PaginatorComponent,
    NgbTooltipModule,
    SpinnerComponent,
  ],
  templateUrl: './visor-obras.component.html',
  styleUrls: ['./visor-obras.component.css'],
  providers: [ObrasService],
})
export class VisorObrasComponent implements OnInit {
  obras: ObraDto[] = [];
  filteredObras: ObraDto[] = [];
  columns: string[] = [
    'codigo',
    'nombreObra',
    'descripcion',
    'fechaInicio',
    'fechaFin',
  ];
  rowsPerPageOptions: number[] = [5, 10, 20, 40];
  currentPage = 1;
  pageSize = 10; // usar 10 por defecto para coincidir con backend
  isLoading = false;
  totalItems = 0;
  totalPages = 0;

  // Expose Math to template
  Math = Math;

  // Filtros
  filtroNombre: string = '';
  filtroCodigo: string = ''; // nuevo filtro: código

  showObraModal = false;
  modalInitialData: any = null;
  modalMode: 'create' | 'edit' = 'create';

  showDetailsModal = false;
  detailsData: any = null;

  isSuperAdmin: boolean = false; // Nueva propiedad para controlar el rol

  constructor(
    private obrasService: ObrasService,
    private alertService: AlertaService,
    private pageTitleService: PageTitleService,
    private authService: AuthService // Inyectar AuthService
  ) {}

  ngOnInit(): void {
    this.pageTitleService.setTitle('Obras');

    // Determinar si el usuario es SuperAdmin (id_rol === 1)
    const user = this.authService.getUser?.() ?? null;
    const roleId = Number(user?.id_rol ?? user?.idRol ?? user?.id_acceso ?? 0);
    this.isSuperAdmin = roleId === 1;

    this.fetchObras();
  }

  fetchObras(): void {
    this.isLoading = true;
    const filters: any = {
      nombre: this.filtroNombre?.trim() || undefined,
      codigo: this.filtroCodigo?.trim() || undefined,
    };

    this.obrasService
      .getObrasPaged(this.currentPage, this.pageSize, filters)
      .subscribe({
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
            descripcion: o.descripcion,
            fechaInicio: o.fechaInicio,
            fechaFin: o.fechaFin,
            activo:
              o.activo ??
              o.activa ??
              String(o.estado || 'Activo').toLowerCase() === 'activo',
            estado: o.estado ?? (o.activo || o.activa ? 'Activo' : 'Inactivo'),
          }));
          this.filteredObras = [...this.obras];
          this.calculatePagination();
          this.isLoading = false;
        },
        error: (err: any) => {
          this.showSnack(
            'Error al cargar las obras. Por favor, inténtelo de nuevo.'
          );
          this.isLoading = false;
        },
      });
  }

  applyFilters(): void {
    // Cuando la lista ya está cargada localmente, permitimos un filtrado rápido en cliente
    // por Código y/o Nombre. Si prefieres que siempre lo haga el backend, simplemente
    // llama a fetchObras() en lugar de filtrar localmente.
    if (!this.obras || this.obras.length === 0) {
      this.filteredObras = [];
      this.totalItems = 0;
      this.calculatePagination();
      return;
    }

    const codigoFilter = (this.filtroCodigo || '')
      .toString()
      .trim()
      .toLowerCase();
    const nombreFilter = (this.filtroNombre || '')
      .toString()
      .trim()
      .toLowerCase();

    this.filteredObras = this.obras.filter((obra) => {
      const codigo = (obra.codigo ?? '').toString().toLowerCase();
      const nombre = (obra.nombreObra ?? '').toString().toLowerCase();

      const matchesCodigo = !codigoFilter || codigo.includes(codigoFilter);
      const matchesNombre = !nombreFilter || nombre.includes(nombreFilter);

      return matchesCodigo && matchesNombre;
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
    this.fetchObras();
  }

  onResetFilters(): void {
    this.filtroNombre = '';
    this.filtroCodigo = '';
    this.currentPage = 1;
    this.fetchObras();
  }

  hasActiveFilters(): boolean {
    return !!(this.filtroNombre?.trim() || this.filtroCodigo?.trim());
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
      },
    });
  }

  deleteObra(item: ObraDto): void {
    const id = item?.idObra ?? null;
    if (id == null) return;
    this.alertService
      .confirm(
        '¿Estás seguro de que deseas eliminar esta obra?',
        'Eliminar Obra'
      )
      .then((result: any) => {
        if (result && result.isConfirmed) {
          this.obrasService.deleteObra(id).subscribe({
            next: () => {
              this.alertService.success(
                'La obra ha sido eliminada correctamente.',
                '¡Eliminado!'
              );
              this.fetchObras();
            },
            error: () => {
              this.alertService.error(
                'No se pudo eliminar la obra. Intente nuevamente.'
              );
            },
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
        },
      });
    } else {
      // Intentar detectar id desde distintos campos que pueden venir (IdObra, idObra, Id)
      const idFromData = Number(
        event.data?.IdObra ?? event.data?.idObra ?? event.data?.Id ?? null
      );
      const idFromModal = Number(
        this.modalInitialData?.idObra ?? this.modalInitialData?.IdObra ?? null
      );
      const id = idFromData || idFromModal;

      if (!id) {
        event.onError({
          message: 'No se pudo identificar la obra a actualizar',
        });
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
        },
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

  // Manejar eventos emitidos por app-paginator (pageIndex 0-based)
  onPageEvent(event: { pageIndex: number; pageSize: number }): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.fetchObras();
  }

  // Nuevo: toggle activo/inactivo de obra desde la UI
  toggleObraActive(event: Event, obra: any): void {
    event.stopPropagation();
    if (!this.isSuperAdmin) return;
    const id = obra?.idObra ?? null;
    if (!id) return;
    obra._pending = true;
    this.obrasService.toggleObraActivo(Number(id)).subscribe({
      next: (resp: any) => {
        obra.activo = !!resp?.data;
        obra.estado = obra.activo ? 'Activo' : 'Inactivo';
        obra._pending = false;
        this.alertService.success(
          `La obra ha sido ${
            obra.activo ? 'activada' : 'desactivada'
          } correctamente.`
        );
      },
      error: (err: any) => {
        obra._pending = false;
        const msg =
          err?.error?.message ||
          err?.message ||
          'No se pudo cambiar el estado de la obra';
        this.alertService.error(msg);
      },
    });
  }

  private showSnack(message: string): void {
    console.log('SNACK:', message);
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ClienteService } from '../../../../services/cliente.service';
import { ModalClientesComponent } from '../modal-clientes/modal-clientes.component';
import { Router } from '@angular/router';
import { AlertaService } from '../../../../services/alerta.service';
import { Roles } from '../../../../shared/enums/roles';
import { PaginatorComponent } from '../../../../shared/components/paginator/paginator.component';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { PageTitleService } from '../../../../services/page-title.service';
import { CboEstadoComponent } from '../../../../shared/components/Cbo/cbo-estado/cbo-estado.component';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner.component';
import { AuthService } from '../../../../services/auth.service';

interface UserRaw {
  [key: string]: any;
}

interface DisplayUser {
  id: number | null;
  cuit?: string;
  legajo?: string | number;
  nombre?: string;
  telefono?: string;
  estado?: string;
  activo?: boolean;
  _pending?: boolean; // flag local para bloquear UI mientras se hace la petición
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
  selector: 'app-visor-clientes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    PaginatorComponent,
    NgbTooltipModule,
    ModalClientesComponent,
    CboEstadoComponent,
    SpinnerComponent,
  ],
  templateUrl: './visor-clientes.component.html',
  styleUrls: ['./visor-clientes.component.css'],
  providers: [ClienteService],
})
export class VisorClientesComponent implements OnInit {
  users: DisplayUser[] = [];
  filteredUsers: DisplayUser[] = [];
  // Mostrar columnas: cuit, nombre, telefono, estado, acciones
  columns: string[] = ['cuit', 'nombre', 'telefono', 'estado'];
  currentPage = 1;
  pageSize = 10; // usar 10 por defecto para coincidir con backend
  isLoading = false;
  totalItems = 0;
  totalPages = 0;
  isSuperAdmin: boolean = false;

  // Expose Math to template
  Math = Math;

  // Filtros (actualizados: sólo Cuit, Nombre y Estado)
  filtroCuit: string = '';
  filtroNombre: string = '';
  filtroEstado: string = '';

  // Modal control
  showUserModal = false;
  modalInitialData: any = null;
  modalMode: 'create' | 'edit' = 'create';

  // Exponer el enum de roles al template
  readonly Roles = Roles;

  constructor(
    private clienteService: ClienteService,
    private router: Router,
    private alertService: AlertaService,
    private pageTitleService: PageTitleService,
    private authService: AuthService // Inyectar AuthService
  ) {}

  ngOnInit(): void {
    this.pageTitleService.setTitle('Listado de Clientes');

    // Determinar si el usuario es SuperAdmin (id_rol === 1)
    const user = this.authService.getUser?.() ?? null;
    const roleId = Number(user?.id_rol ?? user?.idRol ?? user?.id_acceso ?? 0);
    this.isSuperAdmin = roleId === 1;

    this.fetchUsers();
  }

  fetchUsers(): void {
    this.isLoading = true;
    console.log(
      `[ClientList] fetchUsers page=${this.currentPage} size=${this.pageSize}`
    );

    // Construir objeto de filtros para enviar al servicio
    const filters: any = {};
    if (this.filtroCuit?.trim()) filters.cuit = this.filtroCuit.trim();
    if (this.filtroNombre?.trim()) filters.nombre = this.filtroNombre.trim();
    // Convertir estado de string a boolean para el backend (si aplica)
    // En la API el parámetro es 'activo', por eso lo enviamos como activo=true|false
    if (this.filtroEstado) {
      filters.activo = this.filtroEstado === 'activo';
    }

    this.clienteService
      .getClientes(this.currentPage, this.pageSize, filters)
      .subscribe({
        next: (resp: ApiResponse) => {
          console.debug('[ClientList] fetchUsers - filtros enviados:', filters);
          console.debug(
            '[ClientList] fetchUsers - resp crudo del servicio:',
            resp
          );

          // Obtener la lista de usuarios
          let rawList: UserRaw[] = [];
          if (Array.isArray(resp.data)) {
            rawList = resp.data;
            this.users = resp.data.map((u) => this.mapUserToDisplayFormat(u));
          } else if (resp.data && typeof resp.data === 'object') {
            if (Array.isArray(resp.data.data)) {
              rawList = resp.data.data;
              this.users = resp.data.data.map((u) =>
                this.mapUserToDisplayFormat(u)
              );
            }
          }

          // Extraer información de paginación de la respuesta
          let paginationInfo: PaginationData | null = null;

          // Caso 1: Cuando la respuesta tiene el formato esperado con pagination
          if (resp.pagination) {
            paginationInfo = resp.pagination;
          }
          // Caso 2: Cuando la pagination está dentro de data
          else if (
            resp.data &&
            typeof resp.data === 'object' &&
            !Array.isArray(resp.data)
          ) {
            const dataObj = resp.data as {
              pagination?: PaginationData;
              page?: number;
              pageSize?: number;
              totalRecords?: number;
              totalPages?: number;
              hasNextPage?: boolean;
              hasPreviousPage?: boolean;
            };

            if (dataObj.pagination) {
              paginationInfo = dataObj.pagination;
            } else if (dataObj.page !== undefined) {
              paginationInfo = {
                page: dataObj.page,
                pageSize: dataObj.pageSize,
                totalRecords: dataObj.totalRecords,
                totalPages: dataObj.totalPages,
                hasNextPage: dataObj.hasNextPage,
                hasPreviousPage: dataObj.hasPreviousPage,
              };
            }
          }

          // Actualizar propiedades de paginación
          if (paginationInfo) {
            this.totalItems =
              paginationInfo.totalRecords || resp.total || this.users.length;
            this.totalPages =
              paginationInfo.totalPages ||
              Math.ceil(this.totalItems / this.pageSize);

            // Si el backend devuelve la página actual, sincronizamos nuestro estado
            if (paginationInfo.page) {
              this.currentPage = paginationInfo.page;
            }

            console.log('[ClientList] Paginación actualizada:', {
              currentPage: this.currentPage,
              totalPages: this.totalPages,
              totalItems: this.totalItems,
              pageSize: this.pageSize,
            });
          } else {
            // Fallback a los valores calculados anteriormente
            this.totalItems = resp.total || this.users.length;
            this.totalPages = Math.ceil(this.totalItems / this.pageSize);
          }

          // Eliminar el filtrado local y depender únicamente de los datos del backend
          this.filteredUsers = this.users;
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error fetching users:', error);
          this.alertService.error(
            'Error al cargar los usuarios. Por favor, inténtelo de nuevo.'
          );
          this.isLoading = false;
        },
      });
  }

  // Helper para mapear usuario a formato de visualización
  private mapUserToDisplayFormat(u: UserRaw): DisplayUser {
    const estadoRaw =
      u['activo'] ?? u['estado'] ?? u['active'] ?? u['isActive'] ?? null;
    const activo =
      typeof estadoRaw === 'boolean'
        ? estadoRaw
        : estadoRaw === 'Activo' || estadoRaw === true;
    const estado = activo ? 'Activo' : 'Inactivo';

    return {
      id: u['id'] ?? u['idCliente'] ?? u['userId'] ?? null,
      cuit: u['cuit'] ?? u['cuitNumber'] ?? '',
      legajo:
        u['legajo'] ?? u['legajo_number'] ?? u['legajoNumber'] ?? u['id'] ?? '',
      nombre: u['nombre'] ?? u['name'] ?? u['razonSocial'] ?? '',
      telefono: u['telefono'] ?? u['phone'] ?? u['telefonoContacto'] ?? '',
      estado: estado,
      activo: activo,
      _pending: false,
    } as DisplayUser;
  }

  // Reimplementación de métodos faltantes que se usan en la plantilla
  onSearch(): void {
    this.currentPage = 1;
    this.fetchUsers();
  }

  onResetFilters(): void {
    this.filtroCuit = '';
    this.filtroNombre = '';
    this.filtroEstado = '';
    this.currentPage = 1;
    this.fetchUsers();
  }

  getPaginatedUsers(): DisplayUser[] {
    return this.filteredUsers;
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
      this.fetchUsers();
      return;
    }

    // Si no hay filtros, simplemente mostramos los datos tal cual están
    this.filteredUsers = [...this.users];
  }

  hasActiveFilters(): boolean {
    return !!(
      this.filtroCuit?.trim() ||
      this.filtroNombre?.trim() ||
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

  // Helper para obtener nombre del rol por ID
  getRolNameById(rolId: number): string {
    // Nota: Este método puede no ser necesario si el componente maneja la visualización
    return '';
  }

  editUser(item: DisplayUser): void {
    const id = item?.id ?? null;
    if (id == null) return;

    this.modalInitialData = null;
    this.modalMode = 'edit';
    this.showUserModal = true;

    this.clienteService.getClienteById(Number(id)).subscribe({
      next: (resp: any) => {
        this.modalInitialData = resp?.data ?? resp ?? null;
      },
      error: (err: any) => {
        console.error('[ClientList] error loading user by id', err);
        this.modalInitialData = item;
      },
    });
  }

  deleteUser(item: DisplayUser): void {
    const id = item?.id ?? null;
    if (id == null) return;

    this.alertService
      .confirm(
        '¿Estás seguro de que deseas eliminar este cliente?',
        'Eliminar Cliente'
      )
      .then((result: any) => {
        if (result && result.isConfirmed) {
          // bloquear el botón y mostrar estado pending (sin spinners inline)
          item._pending = true;
          this.clienteService.deleteCliente(Number(id)).subscribe({
            next: (resp: any) => {
              const msg =
                resp?.message ?? 'El cliente ha sido eliminado correctamente.';
              this.alertService.success(msg, '¡Eliminado!');
              item._pending = false;
              this.fetchUsers();
            },
            error: (err: any) => {
              item._pending = false;
              console.error('[ClientList] deleteUser error', err);
              const errMsg =
                err?.message ??
                err?.error?.message ??
                'No se pudo eliminar el cliente. Intente nuevamente.';
              this.alertService.error(errMsg);
            },
          });
        }
      });
  }

  toggleUserActive(event: Event, item: DisplayUser): void {
    // Evitar que el checkbox nativo cambie su estado visual antes de la confirmación
    try {
      event.preventDefault();
      event.stopPropagation();
    } catch {
      /* safe */
    }

    const id = item?.id ?? null;
    if (id == null) return;

    const current = item.activo;
    const targetState = !current;
    const actionText = targetState ? 'activar' : 'desactivar';

    this.alertService
      .confirm(
        `¿Estás seguro de que deseas ${actionText} este cliente?`,
        `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Cliente`
      )
      .then((result: any) => {
        if (result && result.isConfirmed) {
          // marcar pending para bloquear UI y mostrar spinner
          item._pending = true;

          this.clienteService.toggleActivo(Number(id)).subscribe({
            next: (_resp: any) => {
              // sólo al confirm y respuesta exitosa actualizamos el estado
              item.activo = targetState;
              item._pending = false;
              const pastText = targetState ? 'activado' : 'desactivado';
              this.alertService.success(
                `Cliente ${pastText} correctamente.`,
                '¡Hecho!'
              );
            },
            error: (err: any) => {
              item._pending = false;
              console.error('[ClientList] toggleUserActive error', err);
              this.alertService.error(
                'No se pudo cambiar el estado del cliente. Intente nuevamente.'
              );
            },
          });
        } else {
          // Si cancela, no hacemos nada. Como prevenimos el toggle nativo,
          // el checkbox permanece mostrando item.activo (estado anterior).
        }
      });
  }

  createNewUser(): void {
    this.modalInitialData = null;
    this.modalMode = 'create';
    this.showUserModal = true;
  }

  closeUserModal(): void {
    this.showUserModal = false;
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
      this.clienteService.createCliente(event.data).subscribe({
        next: (_resp: any) => {
          this.fetchUsers();
          event.onSuccess();
        },
        error: (err: any) => {
          console.error('[ClientList] createUser error', err);
          event.onError(err);
        },
      });
    } else {
      const id = Number(
        this.modalInitialData?.id ??
          this.modalInitialData?.idCliente ??
          this.modalInitialData?.clienteId ??
          this.modalInitialData?.userId ??
          this.modalInitialData?.Id ??
          null
      );

      if (!id) {
        console.warn('[ClientList] update requested but no id available');
        event.onError({
          message: 'No se pudo identificar el usuario a actualizar',
        });
        return;
      }

      // Asegurar que el body tenga idCliente para que updateCliente lo valide
      if (!event.data?.idCliente && !event.data?.Id && !event.data?.IdCliente) {
        event.data.idCliente = id;
      }

      // Incluir siempre el campo 'activo' con el valor real actual antes de hacer PUT.
      let actualActivo: boolean | null = null;
      if (
        this.modalInitialData &&
        (this.modalInitialData.activo === true ||
          this.modalInitialData.activo === false)
      ) {
        actualActivo = !!this.modalInitialData.activo;
      } else {
        // intentar buscar en la lista local por id
        const local = this.users.find((u) => Number(u.id) === Number(id));
        if (local && (local.activo === true || local.activo === false)) {
          actualActivo = !!local.activo;
        }
      }
      if (actualActivo === null) {
        console.warn(
          '[ClientList] No se pudo determinar el valor actual de activo, usando true como fallback para el PUT'
        );
        actualActivo = true;
      }
      event.data.activo = actualActivo;

      this.clienteService.updateCliente(id, event.data).subscribe({
        next: (_resp: any) => {
          this.fetchUsers();
          event.onSuccess();
        },
        error: (err: any) => {
          console.error('[ClientList] updateUser error', err);
          event.onError(err);
        },
      });
    }
  }

  // Actualizado para usar la paginación del backend
  onPageEvent(event: { pageIndex: number; pageSize: number }): void {
    // pageIndex es 0-based, pero backend espera 1-based
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;

    console.log(
      `[ClientList] Cambio de página: pageIndex=${event.pageIndex}, pageSize=${event.pageSize}`
    );
    console.log(
      `[ClientList] Solicitando página ${this.currentPage} con ${this.pageSize} registros por página`
    );

    this.fetchUsers();
  }

  private showSnack(message: string): void {
    console.log('SNACK:', message);
  }
}

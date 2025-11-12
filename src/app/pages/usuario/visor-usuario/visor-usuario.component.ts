import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UsuarioService } from '../../../services/usuario.service';
import { UsuariosModalComponent } from '../modal-usuario/modal-usuario.component';
import { Router } from '@angular/router';
import { AlertaService } from '../../../services/alerta.service';
import { Roles } from '../../../shared/enums/roles';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { PageTitleService } from '../../../services/page-title.service';
import { CboRolUsuarioComponent } from '../../../shared/components/Cbo/cbo-rol-usuario/cbo-rol-usuario.component';
import { CboEstadoComponent } from '../../../shared/components/Cbo/cbo-estado/cbo-estado.component';

interface UserRaw {
  [key: string]: any;
}

interface DisplayUser {
  id: number | null;
  legajo?: string | number;
  nombre?: string;
  apellido?: string;
  rol?: string;
  estado?: string;
  activo?: boolean;
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
  data: any[] | {
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
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    PaginatorComponent,
    NgbTooltipModule,
    UsuariosModalComponent,
    CboRolUsuarioComponent,
    CboEstadoComponent
  ],
  templateUrl: './visor-usuario.component.html',
  styleUrls: ['../../../../styles/visor-style.css'],
  providers: [UsuarioService]
})
export class VisorUsuariosComponent implements OnInit {
  users: DisplayUser[] = [];
  filteredUsers: DisplayUser[] = [];
  columns: string[] = ['legajo', 'nombre', 'apellido', 'rol', 'estado'];
  currentPage = 1;
  pageSize = 6;
  loading = false;
  totalItems = 0;
  totalPages = 0;

  // Expose Math to template
  Math = Math;

  // Filtros
  filtroLegajo: string = '';
  filtroNombre: string = '';
  filtroApellido: string = '';
  filtroRol: number | null = null;
  filtroEstado: string = '';

  // Modal control
  showUserModal = false;
  modalInitialData: any = null;
  modalMode: 'create' | 'edit' = 'create';

  // Exponer el enum de roles al template
  readonly Roles = Roles;

  constructor(private userService: UsuarioService, private router: Router, private alertService: AlertaService, private pageTitleService: PageTitleService) { }

  ngOnInit(): void {
    this.pageTitleService.setTitle('Listado de Usuarios');
    this.fetchUsers();
  }

  fetchUsers(): void {
    this.loading = true;
    console.log(`[UserList] fetchUsers page=${this.currentPage} size=${this.pageSize}`);

    // Construir objeto de filtros para enviar al servicio
    const filters: any = {};
    if (this.filtroLegajo?.trim()) filters.legajo = this.filtroLegajo.trim();
    if (this.filtroNombre?.trim()) filters.nombre = this.filtroNombre.trim();
    if (this.filtroApellido?.trim()) filters.apellido = this.filtroApellido.trim();
    // Validar filtroRol: sólo incluir si está definido y es un número válido
    if (this.filtroRol !== null && this.filtroRol !== undefined) {
      // Permitir que filtroRol sea number o string (por seguridad). Convertir a Number y validar.
      const rolVal = Number((this.filtroRol as any));
      if (!Number.isNaN(rolVal)) {
        filters.rol = rolVal;
      } else {
        // Evitar enviar valores inválidos como NaN
        console.warn('[UserList] filtroRol tiene un valor no numérico, se omitirá en la consulta:', this.filtroRol);
      }
    }

    // Convertir estado de string a boolean para el backend
    if (this.filtroEstado) {
      filters.estado = this.filtroEstado === 'activo';
    }

    this.userService.getUsers(this.currentPage, this.pageSize, filters).subscribe({
      next: (resp: ApiResponse) => {
        console.debug('[UserList] fetchUsers - filtros enviados:', filters);
        console.debug('[UserList] fetchUsers - resp crudo del servicio:', resp);

        // Obtener la lista de usuarios
        let rawList: UserRaw[] = [];
        if (Array.isArray(resp.data)) {
          rawList = resp.data;
          this.users = resp.data.map(u => this.mapUserToDisplayFormat(u));
        } else if (resp.data && typeof resp.data === 'object') {
          if (Array.isArray(resp.data.data)) {
            rawList = resp.data.data;
            this.users = resp.data.data.map(u => this.mapUserToDisplayFormat(u));
          }
        }

        // Extraer información de paginación de la respuesta
        let paginationInfo: PaginationData | null = null;

        // Caso 1: Cuando la respuesta tiene el formato esperado con pagination
        if (resp.pagination) {
          paginationInfo = resp.pagination;
        }
        // Caso 2: Cuando la pagination está dentro de data
        else if (resp.data && typeof resp.data === 'object' && !Array.isArray(resp.data)) {
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
              hasPreviousPage: dataObj.hasPreviousPage
            };
          }
        }

        // Actualizar propiedades de paginación
        if (paginationInfo) {
          this.totalItems = paginationInfo.totalRecords || resp.total || this.users.length;
          this.totalPages = paginationInfo.totalPages || Math.ceil(this.totalItems / this.pageSize);

          // Si el backend devuelve la página actual, sincronizamos nuestro estado
          if (paginationInfo.page) {
            this.currentPage = paginationInfo.page;
          }

          console.log('[UserList] Paginación actualizada:', {
            currentPage: this.currentPage,
            totalPages: this.totalPages,
            totalItems: this.totalItems,
            pageSize: this.pageSize
          });
        } else {
          // Fallback a los valores calculados anteriormente
          this.totalItems = resp.total || this.users.length;
          this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        }

        // Eliminar el filtrado local y depender únicamente de los datos del backend
        this.filteredUsers = this.users;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error fetching users:', error);
        this.alertService.error('Error al cargar los usuarios. Por favor, inténtelo de nuevo.');
        this.loading = false;
      }
    });
  }

  // Helper para mapear usuario a formato de visualización
  private mapUserToDisplayFormat(u: UserRaw): DisplayUser {
    const estadoRaw = u['activo'] ?? u['estado'] ?? u['active'] ?? u['isActive'] ?? null;
    const activo = typeof estadoRaw === 'boolean' ? estadoRaw : (estadoRaw === 'Activo' || estadoRaw === true);
    const estado = activo ? 'Activo' : 'Inactivo';

    return {
      id: u['id'] ?? u['userId'] ?? null,
      legajo: u['legajo'] ?? u['legajo_number'] ?? u['legajoNumber'] ?? u['id'] ?? '',
      nombre: u['nombre'] ?? u['firstName'] ?? u['name'] ?? '',
      apellido: u['apellido'] ?? u['lastName'] ?? u['surname'] ?? '',
      rol: u['rol'] ?? u['role'] ?? u['rolNombre'] ?? u['roleName'] ?? '',
      estado: estado,
      activo: activo
    } as DisplayUser;
  }

  // Reimplementación de métodos faltantes que se usan en la plantilla
  onSearch(): void {
    this.currentPage = 1;
    this.fetchUsers();
  }

  onResetFilters(): void {
    this.filtroLegajo = '';
    this.filtroNombre = '';
    this.filtroApellido = '';
    this.filtroRol = null;
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
    return !!(this.filtroLegajo?.trim() || this.filtroNombre?.trim() || this.filtroApellido?.trim() || this.filtroRol !== null || this.filtroEstado);
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

    this.userService.getUserById(Number(id)).subscribe({
      next: (resp) => {
        this.modalInitialData = resp?.data ?? resp ?? null;
      },
      error: (err) => {
        console.error('[UserList] error loading user by id', err);
        this.modalInitialData = item;
      }
    });
  }

  deleteUser(item: DisplayUser): void {
    const id = item?.id ?? null;
    if (id == null) return;

    this.alertService.confirm('¿Estás seguro de que deseas eliminar este usuario?', 'Eliminar Usuario')
      .then((result: any) => {
        if (result && result.isConfirmed) {
          this.userService.deleteUser(Number(id)).subscribe({
            next: () => {
              this.alertService.success('El usuario ha sido eliminado correctamente.', '¡Eliminado!');
              this.fetchUsers();
            },
            error: (err) => {
              console.error('[UserList] deleteUser error', err);
              this.alertService.error('No se pudo eliminar el usuario. Intente nuevamente.');
            }
          });
        }
      });
  }

  toggleUserActive(item: DisplayUser): void {
    const id = item?.id ?? null;
    if (id == null) return;

    const current = item.activo;
    const targetState = !current;
    const actionText = targetState ? 'activar' : 'desactivar';

    this.alertService.confirm(`¿Estás seguro de que deseas ${actionText} este usuario?`, `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Usuario`)
      .then((result: any) => {
        if (result && result.isConfirmed) {
          this.userService.toggleActivo(Number(id)).subscribe({
            next: () => {
              item.activo = targetState; // Actualizar el estado localmente
              const pastText = targetState ? 'activado' : 'desactivado';
              this.alertService.success(`Usuario ${pastText} correctamente.`, '¡Hecho!');
            },
            error: (err) => {
              console.error('[UserList] toggleUserActive error', err);
              this.alertService.error('No se pudo cambiar el estado del usuario. Intente nuevamente.');
            }
          });
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
      this.userService.createUser(event.data).subscribe({
        next: (resp) => {
          this.fetchUsers();
          event.onSuccess();
        },
        error: (err) => {
          console.error('[UserList] createUser error', err);
          event.onError(err);
        }
      });
    } else {
      const id = Number(this.modalInitialData?.id ?? this.modalInitialData?.userId ?? null);
      if (!id) {
        console.warn('[UserList] update requested but no id available');
        event.onError({ message: 'No se pudo identificar el usuario a actualizar' });
        return;
      }
      this.userService.updateUser(id, event.data).subscribe({
        next: (resp) => {
          this.fetchUsers();
          event.onSuccess();
        },
        error: (err) => {
          console.error('[UserList] updateUser error', err);
          event.onError(err);
        }
      });
    }
  }

  // Actualizado para usar la paginación del backend
  onPageEvent(event: { pageIndex: number, pageSize: number }): void {
    // pageIndex es 0-based, pero backend espera 1-based
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;

    console.log(`[UserList] Cambio de página: pageIndex=${event.pageIndex}, pageSize=${event.pageSize}`);
    console.log(`[UserList] Solicitando página ${this.currentPage} con ${this.pageSize} registros por página`);

    this.fetchUsers();
  }

  private showSnack(message: string): void {
    console.log('SNACK:', message);
  }
}

import { Component, OnInit, LOCALE_ID } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { DatePipe } from '@angular/common';
import { MovimientoService } from '../../../services/movimiento.service';
import { AlertaService } from '../../../services/alerta.service';
import { AuthService } from '../../../services/auth.service';
import { CboTipoMovimientoHerramientaComponent } from '../../../shared/components/Cbo/cbo-tipo-movimiento-herramienta/cbo-tipo-movimiento-herramienta.component';
import { CboObraHistorialComponent } from '../../../shared/components/Cbo/cbo-obra-historial/cbo-obra-historial.component';
import { CboFamiliaHerramientaComponent } from '../../../shared/components/Cbo/cbo-familia-herramienta/cbo-familia-herramienta.component';
import { CboUsuarioComponent } from '../../../shared/components/Cbo/cbo-usuario/cbo-usuario.component';
import { ModalHistorialComponent } from '../components/modal-historial/modal-historial.component';
import { ModalAgregarComponent } from '../components/modal-agregar/modal-agregar.component';
import { PageTitleService } from '../../../services/page-title.service';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgbTooltipModule,
    PaginatorComponent,
    DatePipe,
    CboTipoMovimientoHerramientaComponent,
    CboObraHistorialComponent,
    CboFamiliaHerramientaComponent,
    CboUsuarioComponent,
    ModalHistorialComponent,
    ModalAgregarComponent,
  ],
  templateUrl: './historial.component.html',
  styleUrls: [
    '../../../../styles/visor-style.css',
    './historial.component.css',
  ],
  providers: [{ provide: LOCALE_ID, useValue: 'es-ES' }],
})
export class HistorialComponent implements OnInit {
  movimientos: any[] = [];
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  loading = false;

  // Filtros
  filtroNombreHerramienta = '';
  filtroFamiliaHerramienta: number | null = null;
  filtroIdUsuarioGenera: number | null = null;
  filtroIdUsuarioResponsable: number | null = null;
  filtroIdTipoMovimiento: number | null = null;
  filtroObra: number | null = null;
  filtroFechaDesde = '';
  filtroFechaHasta = '';

  constructor(
    private movimientoService: MovimientoService,
    private alertaService: AlertaService,
    private authService: AuthService,
    private pageTitleService: PageTitleService
  ) {
    registerLocaleData(localeEs, 'es');
  }

  ngOnInit(): void {
    this.pageTitleService.setTitle('Historial de Movimientos');
    this.fetchMovimientos();
  }

  fetchMovimientos(): void {
    this.loading = true;
    let filters: any = {
      nombreHerramienta: this.filtroNombreHerramienta,
      idFamiliaHerramienta: this.filtroFamiliaHerramienta ?? undefined,
      idUsuarioGenera: this.filtroIdUsuarioGenera ?? undefined,
      idUsuarioResponsable: this.filtroIdUsuarioResponsable ?? undefined,
      idTipoMovimiento: this.filtroIdTipoMovimiento ?? undefined,
      idObra: this.filtroObra ?? undefined,
      fechaDesde: this.filtroFechaDesde,
      fechaHasta: this.filtroFechaHasta,
    };

    // Remove undefined values from filters
    filters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== undefined)
    );

    this.movimientoService
      .getMovimientos(this.currentPage, this.pageSize, filters)
      .subscribe({
        next: (resp) => {
          // Debug log para inspeccionar la respuesta del backend (remover si no es necesario)
          console.log('[Historial] getMovimientos response:', resp);

          // Normalizar la propiedad que contiene el array de movimientos
          let dataArray: any[] = [];
          if (Array.isArray(resp)) {
            dataArray = resp as any[];
          } else if (Array.isArray(resp.data)) {
            dataArray = resp.data;
          } else if (Array.isArray(resp.data?.data)) {
            dataArray = resp.data.data;
          } else if (Array.isArray(resp.items)) {
            dataArray = resp.items;
          } else if (Array.isArray(resp.result)) {
            dataArray = resp.result;
          } else {
            dataArray = [];
          }

          this.movimientos = dataArray;

          // Intentar sincronizar página, pageSize y total desde distintas ubicaciones posibles en la respuesta
          const respPage =
            resp.data?.page ??
            resp.page ??
            resp.data?.pagination?.page ??
            resp.pagination?.page;
          const respPageSize =
            resp.data?.pageSize ??
            resp.pageSize ??
            resp.data?.pagination?.pageSize ??
            resp.pagination?.pageSize;

          // Extraer total de registros (totalRecords / total)
          const totalCandidates = [
            resp.data?.totalRecords,
            resp.data?.total,
            resp.total,
            resp.totalRecords,
            resp.pagination?.totalRecords,
            resp.pagination?.total,
            resp.data?.pagination?.totalRecords,
            resp.data?.pagination?.total,
            resp.items?.total,
          ];
          const foundTotal = totalCandidates.find(
            (v) => typeof v === 'number' && !isNaN(v)
          ) as number | undefined;

          // Aplicar valores si vienen desde el backend
          if (typeof respPage === 'number' && !isNaN(respPage)) {
            this.currentPage = respPage;
          }
          if (typeof respPageSize === 'number' && !isNaN(respPageSize)) {
            this.pageSize = respPageSize;
          }

          this.totalItems =
            typeof foundTotal === 'number' ? foundTotal : dataArray.length || 0;

          this.loading = false;
        },
        error: (err) => {
          console.error('Error fetching movimientos:', err);
          this.alertaService.error('Error al cargar los movimientos.');
          this.loading = false;
        },
      });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.fetchMovimientos();
  }

  // Método para verificar si hay filtros activos
  hasActiveFilters(): boolean {
    return !!(
      this.filtroNombreHerramienta?.trim() ||
      this.filtroFamiliaHerramienta !== null ||
      this.filtroIdUsuarioGenera !== null ||
      this.filtroIdUsuarioResponsable !== null ||
      this.filtroIdTipoMovimiento !== null ||
      this.filtroObra !== null ||
      this.filtroFechaDesde ||
      this.filtroFechaHasta
    );
  }

  onTipoMovimientoSelected(tipoMovimiento: any): void {
    this.filtroIdTipoMovimiento = tipoMovimiento?.idTipoMovimiento || null;
    this.fetchMovimientos();
  }

  onUsuarioGeneraSelected(usuario: any): void {
    this.filtroIdUsuarioGenera = usuario?.id || null;
    this.fetchMovimientos();
  }

  onUsuarioResponsableSelected(usuario: any): void {
    this.filtroIdUsuarioResponsable = usuario?.id || null;
    this.fetchMovimientos();
  }

  onObraSelected(obra: any): void {
    this.filtroObra = obra?.idObra || null;
    this.fetchMovimientos();
  }

  onFamiliaHerramientaSelected(familia: any): void {
    this.filtroFamiliaHerramienta = familia?.idFamilia || null;
    this.fetchMovimientos();
  }

  onResetFilters(): void {
    this.filtroNombreHerramienta = '';
    this.filtroFamiliaHerramienta = null;
    this.filtroIdUsuarioGenera = null;
    this.filtroIdUsuarioResponsable = null;
    this.filtroIdTipoMovimiento = null;
    this.filtroObra = null;
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.currentPage = 1;
    this.fetchMovimientos();
  }

  // Método auxiliar para limpiar filtro específico (para futura funcionalidad)
  clearSpecificFilter(filterName: string): void {
    switch (filterName) {
      case 'nombreHerramienta':
        this.filtroNombreHerramienta = '';
        break;
      case 'familia':
        this.filtroFamiliaHerramienta = null;
        break;
      case 'tipoMovimiento':
        this.filtroIdTipoMovimiento = null;
        break;
      case 'usuarioGenera':
        this.filtroIdUsuarioGenera = null;
        break;
      case 'usuarioResponsable':
        this.filtroIdUsuarioResponsable = null;
        break;
      case 'obra':
        this.filtroObra = null;
        break;
      case 'fechas':
        this.filtroFechaDesde = '';
        this.filtroFechaHasta = '';
        break;
    }
    this.onSearch();
  }

  onPageEvent(event: { pageIndex: number; pageSize: number }): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.fetchMovimientos();
  }

  // Control para el modal de detalle
  showDetalleModal: boolean = false;
  detalleMovimiento: any = null;

  // Control para el modal de agregar
  showModalAgregar: boolean = false;
  movimientoSeleccionado: any = null;

  abrirModalDetalle(movimiento: any): void {
    this.detalleMovimiento = movimiento;
    this.showDetalleModal = true;
    console.debug('[Historial] abrirModalDetalle', movimiento);
  }

  cerrarModalDetalle(): void {
    this.showDetalleModal = false;
    this.detalleMovimiento = null;
  }

  abrirModalAgregar(movimiento: any): void {
    this.movimientoSeleccionado = movimiento;
    this.showModalAgregar = true;
    console.debug('[Historial] abrirModalAgregar', movimiento);
  }

  cerrarModalAgregar(): void {
    this.showModalAgregar = false;
    this.movimientoSeleccionado = null;
  }

  onMovimientoCreado(nuevoMovimiento: any): void {
    console.log('Nuevo movimiento creado:', nuevoMovimiento);
    // Refrescar la lista de movimientos
    this.fetchMovimientos();
  }

  /**
   * Retorna la clase de icono adecuada según el tipo de movimiento.
   * Acepta: nombre (con o sin acento, mayúsculas/minúsculas), id numérico
   * o un objeto que contenga `idTipoMovimiento` o `nombreTipoMovimiento`.
   */
  getMovimientoIcon(tipoMovimiento: any): string {
    if (tipoMovimiento == null) {
      return 'pi pi-question-circle';
    }

    // Si viene un objeto con id o nombre
    if (typeof tipoMovimiento === 'object') {
      if (typeof tipoMovimiento.idTipoMovimiento === 'number') {
        tipoMovimiento = tipoMovimiento.idTipoMovimiento;
      } else if (typeof tipoMovimiento.nombreTipoMovimiento === 'string') {
        tipoMovimiento = tipoMovimiento.nombreTipoMovimiento;
      }
    }

    // Si viene un número (idTipoMovimiento)
    if (typeof tipoMovimiento === 'number') {
      switch (tipoMovimiento) {
        case 1: // Préstamo
          return 'pi pi-arrow-right';
        case 2: // Devolución
          return 'pi pi-arrow-left';
        case 3: // Reparación
          return 'pi pi-wrench';
        case 4: // Baja (posible id común)
          return 'pi pi-times';
        case 5: // Alta (si el backend usa id 5 para alta)
          return 'pi pi-plus';
        default:
          return 'pi pi-question-circle';
      }
    }

    // Si viene una cadena, normalizar: quitar tildes y espacios, bajar a minúsculas
    if (typeof tipoMovimiento === 'string') {
      const normalized = tipoMovimiento
        .normalize('NFD') // separar acentos
        .replace(/\p{Diacritic}/gu, '') // eliminar diacríticos
        .toLowerCase()
        .trim();

      if (normalized.includes('prestam') || normalized === 'prestamo') {
        return 'pi pi-arrow-right';
      }
      if (normalized.includes('devolu') || normalized === 'devolucion') {
        return 'pi pi-arrow-left';
      }
      if (normalized.includes('repar') || normalized === 'reparacion') {
        return 'pi pi-wrench';
      }
      if (normalized.includes('baj') || normalized === 'baja') {
        return 'pi pi-times';
      }
      if (normalized.includes('alt') || normalized === 'alta') {
        return 'pi pi-plus';
      }
    }

    return 'pi pi-question-circle';
  }

  /**
   * Trunca el nombre completo a "Nombre L." para mostrar en la tabla
   * Funciona tanto para usuarios responsables como proveedores
   */
  truncateResponsableName(nombreCompleto: string): string {
    if (!nombreCompleto || !nombreCompleto.trim()) {
      return '-';
    }

    const partes = nombreCompleto.trim().split(' ');
    if (partes.length < 2) {
      // Solo un nombre, retornar tal como está
      return partes[0];
    }

    // Primer nombre + primera letra del segundo nombre/apellido
    const primerNombre = partes[0];
    const primeraLetraApellido = partes[1].charAt(0).toUpperCase();

    return `${primerNombre} ${primeraLetraApellido}.`;
  }

  /**
   * Verifica si se debe mostrar el botón de agregar herramienta
   * Condiciones:
   * 1. idTipoMovimiento = 1 (Préstamo)
   * 2. El usuario genera debe ser el usuario logueado
   * 3. Debe haber pasado menos de 15 minutos desde el PRIMER movimiento del grupo
   */
  shouldShowAddButton(movimiento: any): boolean {
    // Condición 1: Solo para préstamos (idTipoMovimiento = 1)
    const tipoMovimiento =
      movimiento.idTipoMovimiento || movimiento.tipoMovimiento?.id;
    if (tipoMovimiento !== 1) {
      return false;
    }

    // Condición 2: El usuario genera debe ser el usuario logueado
    const currentUserId = this.authService.getUserId();
    const usuarioGenera =
      movimiento.idUsuarioGenera || movimiento.usuarioGenera?.id;
    if (!currentUserId || usuarioGenera !== currentUserId) {
      return false;
    }

    // Condición 3: Menos de 15 minutos desde el PRIMER movimiento del grupo
    const fechaPrimerMovimiento =
      this.obtenerFechaPrimerMovimientoDelGrupo(movimiento);
    if (!fechaPrimerMovimiento) {
      return false;
    }

    const fechaInicial = new Date(fechaPrimerMovimiento);
    if (isNaN(fechaInicial.getTime())) return false;

    // Permitir hasta las 23:59:59.999 del mismo día del primer movimiento
    const finDelDia = new Date(fechaInicial);
    finDelDia.setHours(23, 59, 59, 999);

    const ahora = new Date();
    return ahora.getTime() <= finDelDia.getTime();
  }

  /**
   * Devuelve la hora límite (formateada) hasta la cual se puede agregar herramienta
   * Basado en la fecha del primer movimiento del grupo (hasta las 23:59:59.999 de ese día)
   */
  getFinAgregar(movimiento: any): string {
    const fechaPrimerMovimiento =
      this.obtenerFechaPrimerMovimientoDelGrupo(movimiento);
    if (!fechaPrimerMovimiento) return 'N/A';

    const fechaInicial = new Date(fechaPrimerMovimiento);
    if (isNaN(fechaInicial.getTime())) return 'N/A';

    const finDelDia = new Date(fechaInicial);
    finDelDia.setHours(23, 59, 59, 999);

    try {
      return finDelDia.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return (
        finDelDia.getHours() +
        ':' +
        String(finDelDia.getMinutes()).padStart(2, '0')
      );
    }
  }

  /**
   * Obtiene la fecha del primer movimiento del grupo (mismo usuario, obra, responsable y tipo)
   */
  private obtenerFechaPrimerMovimientoDelGrupo(movimiento: any): string | null {
    if (!movimiento) return null;

    // Filtrar movimientos del mismo grupo
    const movimientosDelGrupo = this.movimientos.filter((m) => {
      return (
        m.idUsuarioGenera === movimiento.idUsuarioGenera &&
        m.idUsuarioResponsable === movimiento.idUsuarioResponsable &&
        m.idObra === movimiento.idObra &&
        m.idTipoMovimiento === movimiento.idTipoMovimiento
      );
    });

    // Ordenar por fecha y obtener el primero
    movimientosDelGrupo.sort((a, b) => {
      const fechaA = new Date(a.fecha);
      const fechaB = new Date(b.fecha);
      return fechaA.getTime() - fechaB.getTime();
    });

    return movimientosDelGrupo.length > 0
      ? movimientosDelGrupo[0].fecha
      : movimiento.fecha;
  }

  // Determina si un movimiento es una devolución
  isDevolucion(movimiento: any): boolean {
    if (!movimiento) return false;
    const tipo =
      movimiento.idTipoMovimiento ||
      movimiento.tipoMovimiento ||
      movimiento.nombreTipoMovimiento ||
      '';
    if (typeof tipo === 'number') return tipo === 2;
    if (typeof tipo === 'string') {
      const normalized = tipo
        .toString()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();
      return normalized.includes('devol');
    }
    return false;
  }

  // Intenta obtener la fecha/hora real de devolución desde varios campos posibles
  getFechaDevolucionReal(movimiento: any): string | null {
    if (!movimiento) return null;
    const candidates = [
      'fechaDevolucion',
      'fechaDevolucionReal',
      'fechaRealDevolucion',
      'fechaRetorno',
      'fechaRegistroDevolucion',
      'fechaDevolucionRegistrada',
      'fecha',
    ];
    for (const key of candidates) {
      const v = movimiento[key];
      if (v) return v;
    }

    // Si el movimiento contiene un array de movimientos, buscar el movimiento de devolución
    if (Array.isArray(movimiento.movimientos)) {
      const movDev = movimiento.movimientos.find((m: any) => {
        const t =
          m.idTipoMovimiento ||
          m.tipoMovimiento ||
          m.nombreTipoMovimiento ||
          '';
        if (typeof t === 'number') return t === 2;
        if (typeof t === 'string') return t.toLowerCase().includes('devol');
        return false;
      });
      if (movDev && movDev.fecha) return movDev.fecha;
    }

    // Como fallback, buscar dentro del listado general de movimientos por uno que parezca devolución
    const movDevGlobal = this.movimientos.find((m) => {
      const sameTool = m.codigoHerramienta === movimiento.codigoHerramienta;
      const t =
        m.idTipoMovimiento || m.tipoMovimiento || m.nombreTipoMovimiento || '';
      const isDev =
        typeof t === 'number'
          ? t === 2
          : ('' + t).toLowerCase().includes('devol');
      return sameTool && isDev && m.fecha;
    });
    return movDevGlobal ? movDevGlobal.fecha : null;
  }
}

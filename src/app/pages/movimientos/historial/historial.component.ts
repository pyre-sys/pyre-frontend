import { Component, OnInit, LOCALE_ID } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { DatePipe } from '@angular/common';
import { MovimientoService } from '../../../services/movimiento.service';
import { AlertaService } from '../../../services/alerta.service';
import { CboObraComponent } from '../../../shared/components/Cbo/cbo-obra/cbo-obra.component';
import { CboTipoMovimientoHerramientaComponent } from '../../../shared/components/Cbo/cbo-tipo-movimiento-herramienta/cbo-tipo-movimiento-herramienta.component';
import { CboProveedorComponent } from '../../../shared/components/Cbo/cbo-proveedor/cbo-proveedor.component';
import { CboFamiliaHerramientaComponent } from "../../../shared/components/Cbo/cbo-familia-herramienta/cbo-familia-herramienta.component";
import { CboUsuarioComponent } from "../../../shared/components/Cbo/cbo-usuario/cbo-usuario.component";
import { ModalHistorialComponent } from '../modal-historial/modal-historial.component';
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
    CboObraComponent,
    CboTipoMovimientoHerramientaComponent,
    CboProveedorComponent,
    CboFamiliaHerramientaComponent,
    CboUsuarioComponent
    ,
    ModalHistorialComponent
  ],
  templateUrl: './historial.component.html',
  styleUrls: ['../../../../styles/visor-style.css', './historial.component.css'],
  providers: [{ provide: LOCALE_ID, useValue: 'es-ES' }]
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
  filtroProveedor: number | null = null;
  filtroFechaDesde = '';
  filtroFechaHasta = '';

  constructor(
    private movimientoService: MovimientoService,
    private alertaService: AlertaService,
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
      idProveedor: this.filtroProveedor ?? undefined,
      fechaDesde: this.filtroFechaDesde,
      fechaHasta: this.filtroFechaHasta
    };

    // Remove undefined values from filters
    filters = Object.fromEntries(Object.entries(filters).filter(([_, value]) => value !== undefined));

    this.movimientoService.getMovimientos(this.currentPage, this.pageSize, filters).subscribe({
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
        const respPage = resp.data?.page ?? resp.page ?? resp.data?.pagination?.page ?? resp.pagination?.page;
        const respPageSize = resp.data?.pageSize ?? resp.pageSize ?? resp.data?.pagination?.pageSize ?? resp.pagination?.pageSize;

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
          resp.items?.total
        ];
        const foundTotal = totalCandidates.find(v => typeof v === 'number' && !isNaN(v)) as number | undefined;

        // Aplicar valores si vienen desde el backend
        if (typeof respPage === 'number' && !isNaN(respPage)) {
          this.currentPage = respPage;
        }
        if (typeof respPageSize === 'number' && !isNaN(respPageSize)) {
          this.pageSize = respPageSize;
        }

        this.totalItems = typeof foundTotal === 'number' ? foundTotal : (dataArray.length || 0);

        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching movimientos:', err);
        this.alertaService.error('Error al cargar los movimientos.');
        this.loading = false;
      }
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
      this.filtroProveedor !== null ||
      this.filtroFechaDesde ||
      this.filtroFechaHasta
    );
  }

  onObraSelected(obra: any): void {
    this.filtroObra = obra?.idObra || null;
    this.fetchMovimientos();
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

  onProveedorSelected(proveedor: any): void {
    this.filtroProveedor = proveedor?.idProveedor || null;
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
    this.filtroProveedor = null;
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
      case 'proveedor':
        this.filtroProveedor = null;
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

  abrirModalDetalle(movimiento: any): void {
    this.detalleMovimiento = movimiento;
    this.showDetalleModal = true;
    // Si más adelante se integra un componente modal, aquí se podría abrirlo.
    console.debug('[Historial] abrirModalDetalle', movimiento);
  }

  cerrarModalDetalle(): void {
    this.showDetalleModal = false;
    this.detalleMovimiento = null;
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
}

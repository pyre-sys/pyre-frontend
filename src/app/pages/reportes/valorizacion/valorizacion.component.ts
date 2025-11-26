import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageTitleService } from '../../../services/page-title.service';
import { HerramientaService } from '../../../services/herramienta.service';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { AlertaService } from '../../../services/alerta.service';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';

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
  ubicacion?: string;
  costoDolares?: number;
  fechaDeIngreso?: string;
  activo?: boolean;
  valorActual?: number;
  categoria?: string;
  // AGREGAR la propiedad que falta
  idDisponibilidad?: number;
  // Nuevo: exponer estado (Activo / Inactivo) para usar en plantillas como otros componentes
  estado?: string;
}

type RangoPrecio = 'todos' | 'bajo' | 'medio' | 'alto' | 'premium';

@Component({
  selector: 'app-valorizacion',
  imports: [
    CommonModule,
    FormsModule,
    PaginatorComponent,
    NgbTooltipModule,
    SpinnerComponent,
  ],
  templateUrl: './valorizacion.component.html',
  styleUrls: ['../../../../styles/reportes-style.css'],
})
export class ValorizacionComponent implements OnInit {
  herramientas: DisplayHerramienta[] = [];
  filteredHerramientas: DisplayHerramienta[] = [];
  paginatedHerramientas: DisplayHerramienta[] = [];
  currentPage = 1;
  pageSize = 8;
  loading = false;
  totalItems = 0;
  totalPages = 0;

  // Estadísticas financieras
  valorInventarioTotal = 0;
  valorPromedioHerramienta = 0;
  herramientasBajas = 0;
  herramientasMedias = 0;
  herramientasAltas = 0;
  herramientasPremium = 0;

  // Filtros de búsqueda (local) - IGUAL QUE ESTADO
  filtroCodigo = '';
  filtroNombre = '';
  filtroMarca = '';
  filtroDisponibilidadId: number | null = null;
  selectedDisponibilidad: any = null;
  rangoPrecioSelect: RangoPrecio = 'todos';

  // Rangos de precios (en USD)
  rangosPrecio = [
    {
      value: 'todos' as RangoPrecio,
      label: 'Todas',
      icon: 'bi-collection',
      color: 'primary',
    },
    {
      value: 'bajo' as RangoPrecio,
      label: 'Económicas (< $500)',
      icon: 'bi-cash-stack',
      color: 'success',
    },
    {
      value: 'medio' as RangoPrecio,
      label: 'Estándar ($500-$2k)',
      icon: 'bi-currency-dollar',
      color: 'info',
    },
    {
      value: 'alto' as RangoPrecio,
      label: 'Premium ($2k-$5k)',
      icon: 'bi-gem',
      color: 'warning',
    },
    {
      value: 'premium' as RangoPrecio,
      label: 'Profesional (>$5k)',
      icon: 'bi-star-fill',
      color: 'danger',
    },
  ];

  constructor(
    private pageTitleService: PageTitleService,
    private srvHerramienta: HerramientaService,
    private srvAlerta: AlertaService
  ) {}

  ngOnInit(): void {
    this.pageTitleService.setTitle('Valorización de Inventario');
    this.loadAllHerramientas();
  }

  loadAllHerramientas(): void {
    this.loading = true;

    // Cargar todas las herramientas para análisis financiero completo
    this.srvHerramienta.getTools(1, 1000).subscribe({
      next: (response: any) => {
        this.loading = false;
        if (response && response.data) {
          const herramientasData = response.data;
          this.herramientas = herramientasData.map((h: any) =>
            this.mapHerramientaToDisplayFormat(h)
          );
          this.calculateFinancialStats();
          this.applyFiltersLocal();
        } else {
          this.herramientas = [];
          this.filteredHerramientas = [];
          this.totalItems = 0;
        }
      },
      error: (error: any) => {
        this.loading = false;
        console.error('Error al cargar herramientas:', error);
        this.srvAlerta.error('Error al cargar las herramientas.');
        this.herramientas = [];
        this.filteredHerramientas = [];
        this.totalItems = 0;
      },
    });
  }

  private calculateFinancialStats(): void {
    const herramientasConPrecio = this.herramientas.filter(
      (h) => h.costoDolares && h.costoDolares > 0
    );

    // Valor total del inventario
    this.valorInventarioTotal = herramientasConPrecio.reduce(
      (sum, h) => sum + (h.valorActual || 0),
      0
    );

    // Valor promedio por herramienta
    this.valorPromedioHerramienta =
      herramientasConPrecio.length > 0
        ? this.valorInventarioTotal / herramientasConPrecio.length
        : 0;

    // Distribución por rangos de precio
    this.herramientasBajas = herramientasConPrecio.filter(
      (h) => (h.valorActual || 0) < 500
    ).length;
    this.herramientasMedias = herramientasConPrecio.filter(
      (h) => (h.valorActual || 0) >= 500 && (h.valorActual || 0) < 2000
    ).length;
    this.herramientasAltas = herramientasConPrecio.filter(
      (h) => (h.valorActual || 0) >= 2000 && (h.valorActual || 0) < 5000
    ).length;
    this.herramientasPremium = herramientasConPrecio.filter(
      (h) => (h.valorActual || 0) >= 5000
    ).length;
  }

  onRangoPrecioSelected(rango: RangoPrecio): void {
    this.rangoPrecioSelect = rango;
    this.currentPage = 1;
    this.filtroCodigo = '';
    this.filtroNombre = '';
    this.filtroMarca = '';
    this.filtroDisponibilidadId = null;
    this.selectedDisponibilidad = null;
    this.applyFiltersLocal();
  }

  // Aplicar filtros LOCALMENTE (sin ir al backend) - IGUAL QUE ESTADO
  applyFiltersLocal(): void {
    let filtered = this.herramientas.filter((h) => {
      const codigo = h.codigo?.toLowerCase() ?? '';
      const nombre = h.nombre?.toLowerCase() ?? '';
      const marca = h.marca?.toLowerCase() ?? '';

      const filtroCodigo = this.filtroCodigo.toLowerCase().trim();
      const filtroNombre = this.filtroNombre.toLowerCase().trim();
      const filtroMarca = this.filtroMarca.toLowerCase().trim();

      // Filtro de disponibilidad: comparar por ID (más confiable)
      let filtroDisponibilidadMatch = true;
      if (this.filtroDisponibilidadId !== null) {
        filtroDisponibilidadMatch =
          h.idDisponibilidad === this.filtroDisponibilidadId;
      }

      const matchesCodigo = !filtroCodigo || codigo.includes(filtroCodigo);
      const matchesNombre = !filtroNombre || nombre.includes(filtroNombre);
      const matchesMarca = !filtroMarca || marca.includes(filtroMarca);

      return (
        matchesCodigo &&
        matchesNombre &&
        matchesMarca &&
        filtroDisponibilidadMatch
      );
    });

    // Filtrar por rango de precio
    if (this.rangoPrecioSelect !== 'todos') {
      switch (this.rangoPrecioSelect) {
        case 'bajo':
          filtered = filtered.filter((h) => (h.valorActual || 0) < 500);
          break;
        case 'medio':
          filtered = filtered.filter(
            (h) => (h.valorActual || 0) >= 500 && (h.valorActual || 0) < 2000
          );
          break;
        case 'alto':
          filtered = filtered.filter(
            (h) => (h.valorActual || 0) >= 2000 && (h.valorActual || 0) < 5000
          );
          break;
        case 'premium':
          filtered = filtered.filter((h) => (h.valorActual || 0) >= 5000);
          break;
      }
    }

    // Ordenar por valor descendente
    filtered.sort((a, b) => (b.valorActual || 0) - (a.valorActual || 0));

    this.filteredHerramientas = filtered;
    this.totalItems = filtered.length;
    this.currentPage = 1;
    this.calculatePagination();
    this.updatePaginatedData();
  }

  // Cuando se selecciona disponibilidad en el combo - EJECUTAR FILTRADO INMEDIATAMENTE
  onDisponibilidadSelected(disponibilidad: any): void {
    console.log('Disponibilidad seleccionada (evento):', disponibilidad);

    this.selectedDisponibilidad = disponibilidad;
    // Usar idEstadoDisponibilidad como ID
    this.filtroDisponibilidadId =
      disponibilidad?.idEstadoDisponibilidad ?? null;

    console.log('selectedDisponibilidad:', this.selectedDisponibilidad);
    console.log('filtroDisponibilidadId:', this.filtroDisponibilidadId);

    // IMPORTANTE: Aplicar filtros inmediatamente sin esperar a que el usuario haga clic en Buscar
    this.currentPage = 1;
    this.applyFiltersLocal();
  }

  private updatePaginatedData(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedHerramientas = this.filteredHerramientas.slice(
      startIndex,
      endIndex
    );
  }

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
  }

  onSearch(): void {
    this.currentPage = 1;
    this.applyFiltersLocal();
  }

  hasActiveFilters(): boolean {
    return !!(
      this.filtroCodigo?.trim() ||
      this.filtroNombre?.trim() ||
      this.filtroMarca?.trim() ||
      this.filtroDisponibilidadId !== null ||
      this.rangoPrecioSelect !== 'todos'
    );
  }

  onResetFilters(): void {
    this.filtroCodigo = '';
    this.filtroNombre = '';
    this.filtroMarca = '';
    this.filtroDisponibilidadId = null;
    this.selectedDisponibilidad = null;
    this.rangoPrecioSelect = 'todos';
    this.currentPage = 1;
    this.applyFiltersLocal();
  }

  // AGREGAR método que falta
  onPageEvent(event: { pageIndex: number; pageSize: number }): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.calculatePagination();
    this.updatePaginatedData();
  }

  getRangoPrecioStats(rango: RangoPrecio): number {
    switch (rango) {
      case 'bajo':
        return this.herramientasBajas;
      case 'medio':
        return this.herramientasMedias;
      case 'alto':
        return this.herramientasAltas;
      case 'premium':
        return this.herramientasPremium;
      case 'todos':
        return this.herramientas.length;
      default:
        return 0;
    }
  }

  private mapHerramientaToDisplayFormat(
    h: HerramientasRaw
  ): DisplayHerramienta {
    const costoDolares = parseFloat(h['costoDolares']?.toString() || '0') || 0;
    const fechaIngreso = h['fechaDeIngreso'] || h['fechaIngreso'];
    const valorActual = costoDolares;

    const estadoRaw =
      h['activo'] ?? h['estado'] ?? h['active'] ?? h['isActive'] ?? null;
    const activo =
      typeof estadoRaw === 'boolean'
        ? estadoRaw
        : estadoRaw === 'Activo' || estadoRaw === true;
    const estado = activo ? 'Activo' : 'Inactivo';

    return {
      id: h['id'] ?? h['idHerramienta'] ?? null,
      idHerramienta: h['idHerramienta'] ?? h['id'] ?? null,
      codigo: h['codigo'] ?? '',
      nombre: h['nombreHerramienta'] ?? h['nombre'] ?? '',
      marca: h['marca'] ?? '',
      tipo: h['tipo'] ?? '',
      estadoFisico: h['estadoFisico'] ?? '',
      disponibilidad: h['estadoDisponibilidad'] ?? h['disponibilidad'] ?? '',
      ubicacion: h['ubicacion'] ?? h['ubicacionFisica'] ?? '',
      costoDolares: costoDolares,
      fechaDeIngreso: fechaIngreso,
      activo: h['activo'] !== false,
      valorActual: valorActual,
      categoria: this.getCategoriaByValue(valorActual),
      // AGREGAR la propiedad que falta
      idDisponibilidad: h['idDisponibilidad'] ?? null,
      // Nuevo: exponer estado consistente (Activo / Inactivo)
      estado: estado,
    } as DisplayHerramienta;
  }

  private getCategoriaByValue(valor: number): string {
    if (valor >= 5000) return 'Profesional';
    if (valor >= 2000) return 'Premium';
    if (valor >= 500) return 'Estándar';
    return 'Económica';
  }

  // Helper methods for template
  formatCurrency(value: number | undefined): string {
    if (value === null || value === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  getCategoriaClass(categoria: string | undefined): string {
    switch (categoria) {
      case 'Profesional':
        return 'danger';
      case 'Premium':
        return 'warning';
      case 'Estándar':
        return 'info';
      case 'Económica':
        return 'success';
      default:
        return 'secondary';
    }
  }

  getDisponibilidadClass(disponibilidad: string | undefined): string {
    if (!disponibilidad) return 'secondary';
    const disp = disponibilidad.toLowerCase();
    if (disp.includes('disponible')) return 'success';
    if (disp.includes('prestada')) return 'primary';
    if (disp.includes('mantenimiento')) return 'warning';
    if (disp.includes('extraviada')) return 'danger';
    return 'primary';
  }

  // Nuevo: helper idéntico al usado en estado.component
  getEstadoClass(estado: string | undefined): string {
    if (!estado) return 'default';

    const est = estado.toLowerCase();
    if (est.includes('excelente')) return 'excelente';
    if (est.includes('usada') || est.includes('usado')) return 'usada';
    if (est.includes('desgastada') || est.includes('desgastado'))
      return 'desgastada';
    if (est.includes('dañada') || est.includes('dañado')) return 'danada';
    if (est.includes('no apta') || est.includes('no apte')) return 'no-apta';
    return 'default';
  }

  getEstadoFisicoClass(estadoFisico: string | undefined): string {
    if (!estadoFisico) return 'secondary';
    const estado = estadoFisico.toLowerCase();
    if (estado.includes('excelente')) return 'success';
    if (estado.includes('usada') || estado.includes('bueno')) return 'primary';
    if (estado.includes('desgastada') || estado.includes('regular'))
      return 'warning';
    if (
      estado.includes('dañada') ||
      estado.includes('malo') ||
      estado.includes('no apta')
    )
      return 'danger';
    return 'secondary';
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageTitleService } from '../../../services/page-title.service';
import { HerramientaService } from '../../../services/herramienta.service';
import { PaginatorComponent } from "../../../shared/components/paginator/paginator.component";
import { AlertaService } from '../../../services/alerta.service';

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
  planta?: string;
  costoDolares?: number;
  fechaDeIngreso?: string;
  activo?: boolean;
  valorActual?: number;
  categoria?: string;
}

type RangoPrecio = 'todos' | 'bajo' | 'medio' | 'alto' | 'premium';

@Component({
  selector: 'app-valorizacion',
  imports: [
    CommonModule,
    FormsModule,
    PaginatorComponent,
  ],
  templateUrl: './valorizacion.component.html',
  styleUrl: './valorizacion.component.css'
})
export class ValorizacionComponent implements OnInit {

  herramientas: DisplayHerramienta[] = [];
  filteredHerramientas: DisplayHerramienta[] = [];
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

  // Filtros
  rangoPrecioSelect: RangoPrecio = 'todos';
  searchTerm = '';

  // Rangos de precios (en USD)
  rangosPrecio = [
    { value: 'todos' as RangoPrecio, label: 'Todas las Herramientas', icon: 'bi-collection', color: 'primary', min: 0, max: Infinity },
    { value: 'bajo' as RangoPrecio, label: 'Económicas (< $500)', icon: 'bi-cash-stack', color: 'success', min: 0, max: 499.99 },
    { value: 'medio' as RangoPrecio, label: 'Estándar ($500 - $2000)', icon: 'bi-currency-dollar', color: 'info', min: 500, max: 1999.99 },
    { value: 'alto' as RangoPrecio, label: 'Premium ($2000 - $5000)', icon: 'bi-gem', color: 'warning', min: 2000, max: 4999.99 },
    { value: 'premium' as RangoPrecio, label: 'Profesional (> $5000)', icon: 'bi-star-fill', color: 'danger', min: 5000, max: Infinity }
  ];

  Math = Math; // <-- exponer Math para usar Math.min en template

  constructor(
    private pageTitleService: PageTitleService,
    private srvHerramienta: HerramientaService,
    private srvAlerta: AlertaService
  ) { }

  ngOnInit(): void {
    this.pageTitleService.setTitle('Valorización de Inventario');
    this.loadAllHerramientas();
  }

  getPaginatedHerramientas(): DisplayHerramienta[] {
    return this.filteredHerramientas;
  }

  loadAllHerramientas(): void {
    this.loading = true;

    // Cargar todas las herramientas para análisis financiero completo
    this.srvHerramienta.getTools(1, 1000).subscribe({
      next: (response: any) => {
        this.loading = false;
        if (response && response.data) {
          const herramientasData = response.data;
          this.herramientas = herramientasData.map((h: any) => this.mapHerramientaToDisplayFormat(h));
          this.calculateFinancialStats();
          this.applyFilters();
        } else {
          this.herramientas = [];
          this.filteredHerramientas = [];
          this.totalItems = 0;
        }
      },
      error: (error: any) => {
        this.loading = false;
        console.error('Error al cargar herramientas:', error);
        this.srvAlerta.error('Error al cargar las herramientas. Por favor, inténtelo de nuevo.');
        this.herramientas = [];
        this.filteredHerramientas = [];
        this.totalItems = 0;
      }
    });
  }

  private calculateFinancialStats(): void {
    const herramientasConPrecio = this.herramientas.filter(h => h.costoDolares && h.costoDolares > 0);

    // Valor total del inventario (sin depreciación)
    this.valorInventarioTotal = herramientasConPrecio.reduce((sum, h) => sum + (h.valorActual || 0), 0);

    // Valor promedio por herramienta
    this.valorPromedioHerramienta = herramientasConPrecio.length > 0 ?
      this.valorInventarioTotal / herramientasConPrecio.length : 0;

    // Distribución por rangos de precio (basada en valorActual que ahora == costoDolares)
    this.herramientasBajas = herramientasConPrecio.filter(h => (h.valorActual || 0) < 500).length;
    this.herramientasMedias = herramientasConPrecio.filter(h => (h.valorActual || 0) >= 500 && (h.valorActual || 0) < 2000).length;
    this.herramientasAltas = herramientasConPrecio.filter(h => (h.valorActual || 0) >= 2000 && (h.valorActual || 0) < 5000).length;
    this.herramientasPremium = herramientasConPrecio.filter(h => (h.valorActual || 0) >= 5000).length;
  }

  onRangoPrecioSelected(rango: RangoPrecio): void {
    this.rangoPrecioSelect = rango;
    this.currentPage = 1;
    this.applyFilters();
  }

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value.toLowerCase();
    this.currentPage = 1;
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.herramientas];

    // Filtrar por rango de precio
    if (this.rangoPrecioSelect !== 'todos') {
      const rango = this.rangosPrecio.find(r => r.value === this.rangoPrecioSelect);
      if (rango) {
        filtered = filtered.filter(h => {
          const valor = h.valorActual || 0;
          return valor >= rango.min && valor <= rango.max;
        });
      }
    }

    // Filtrar por búsqueda
    if (this.searchTerm) {
      filtered = filtered.filter(h =>
        h.nombre?.toLowerCase().includes(this.searchTerm) ||
        h.codigo?.toLowerCase().includes(this.searchTerm) ||
        h.marca?.toLowerCase().includes(this.searchTerm) ||
        h.tipo?.toLowerCase().includes(this.searchTerm)
      );
    }

    // Ordenar por valor descendente
    filtered.sort((a, b) => (b.valorActual || 0) - (a.valorActual || 0));

    this.totalItems = filtered.length;
    this.calculatePagination();
    this.updateFilteredData(filtered);
  }

  private updateFilteredData(filtered: DisplayHerramienta[]): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.filteredHerramientas = filtered.slice(startIndex, endIndex);
  }

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onPageEvent(event: { pageIndex: number, pageSize: number }): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.applyFilters();
  }

  getRangoPrecioStats(rango: RangoPrecio): number {
    switch (rango) {
      case 'bajo': return this.herramientasBajas;
      case 'medio': return this.herramientasMedias;
      case 'alto': return this.herramientasAltas;
      case 'premium': return this.herramientasPremium;
      case 'todos': return this.herramientas.length;
      default: return 0;
    }
  }

  private mapHerramientaToDisplayFormat(h: HerramientasRaw): DisplayHerramienta {
    const costoDolares = parseFloat(h['costoDolares']?.toString() || '0') || 0;
    const fechaIngreso = h['fechaDeIngreso'] || h['fechaIngreso'];

    // No depreciación: valorActual = costoDolares
    const valorActual = costoDolares;

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
      planta: h['nombrePlanta'] ?? h['planta'] ?? '',
      costoDolares: costoDolares,
      fechaDeIngreso: fechaIngreso,
      activo: h['activo'] !== false,
      valorActual: valorActual,
      categoria: this.getCategoriaByValue(valorActual)
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
      maximumFractionDigits: 2
    }).format(value);
  }

  getCategoriaColor(categoria: string | undefined): string {
    switch (categoria) {
      case 'Profesional': return 'danger';
      case 'Premium': return 'warning';
      case 'Estándar': return 'info';
      case 'Económica': return 'success';
      default: return 'secondary';
    }
  }

  getCategoriaIcon(categoria: string | undefined): string {
    switch (categoria) {
      case 'Profesional': return 'bi-star-fill';
      case 'Premium': return 'bi-gem';
      case 'Estándar': return 'bi-currency-dollar';
      case 'Económica': return 'bi-cash-stack';
      default: return 'bi-question-circle';
    }
  }

  // Helpers para disponibilidad (usados en la plantilla)
  getDisponibilidadColor(disponibilidad: string | undefined): string {
    if (!disponibilidad) return 'primary';
    const disp = disponibilidad.toLowerCase();
    if (disp.includes('disponible')) return 'success';
    if (disp.includes('prestada')) return 'primary';
    if (disp.includes('mantenimiento')) return 'warning';
    if (disp.includes('extraviada')) return 'danger';
    return 'primary';
  }

  getDisponibilidadIcon(disponibilidad: string | undefined): string {
    if (!disponibilidad) return 'bi-question-circle';
    const disp = disponibilidad.toLowerCase();
    if (disp.includes('disponible')) return 'bi-check-circle';
    if (disp.includes('prestada')) return 'bi-arrow-right-circle';
    if (disp.includes('mantenimiento')) return 'bi-wrench';
    if (disp.includes('extraviada')) return 'bi-exclamation-triangle';
    return 'bi-question-circle';
  }

  // Devuelve el objeto del rango actualmente seleccionado (o undefined)
  selectedRango() {
    return this.rangosPrecio.find(r => r.value === this.rangoPrecioSelect);
  }

  // Color (class suffix) del rango seleccionado, fallback 'primary'
  selectedRangoColor(): string {
    return this.selectedRango()?.color ?? 'primary';
  }

  // Label del rango seleccionado, fallback
  selectedRangoLabel(): string {
    return this.selectedRango()?.label ?? 'Todas las Herramientas';
  }

  // Clase de badge para disponibilidad (ej. 'badge-success')
  getDisponibilidadClass(disponibilidad?: string): string {
    return 'badge-' + this.getDisponibilidadColor(disponibilidad);
  }

  // Clase de badge para estado físico (ej. 'badge-warning')
  getEstadoFisicoClass(estadoFisico?: string): string {
    if (!estadoFisico) return 'badge-secondary';

    const estado = estadoFisico.toLowerCase();
    if (estado.includes('excelente')) return 'badge-success';
    if (estado.includes('usada') || estado.includes('bueno')) return 'badge-primary';
    if (estado.includes('desgastada') || estado.includes('regular')) return 'badge-warning';
    if (estado.includes('dañada') || estado.includes('malo') || estado.includes('no apta')) return 'badge-danger';
    return 'badge-secondary';
  }

  onResetFilters(): void {
    this.rangoPrecioSelect = 'todos';
    this.searchTerm = '';
    this.currentPage = 1;
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return this.rangoPrecioSelect !== 'todos' || this.searchTerm.length > 0;
  }

  // Track by function for performance
  trackByHerramienta(index: number, herramienta: DisplayHerramienta): number {
    return herramienta.id || index;
  }
}

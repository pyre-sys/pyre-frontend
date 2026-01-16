import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageTitleService } from '../../../services/page-title.service';
import { HerramientaService } from '../../../services/herramienta.service';
import { AlertaService } from '../../../services/alerta.service';
import { NgbTooltipModule, NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';

// Interfaces para el tipado de datos
interface Usuario {
  id: number;
  nombreCompleto: string;
  legajo: string;
}

interface Proveedor {
  id: number;
  nombreProveedor: string;
  contacto: string;
  telefono: string;
}

interface HerramientaPrestada {
  idHerramienta: number;
  codigo: string;
  nombreHerramienta: string;
  familia: string;
  fechaPrestamo: string;
}

interface HerramientaMantenimiento {
  idHerramienta: number;
  codigo: string;
  nombreHerramienta: string;
  familia: string;
  fechaMantenimiento: string;
  observaciones: string;
}

interface UsuarioConHerramientas {
  usuario: Usuario;
  cantidadHerramientas: number;
  herramientas: HerramientaPrestada[];
  collapsed: boolean; // Remove optional operator
}

interface ProveedorConHerramientas {
  proveedor: Proveedor;
  cantidadHerramientas: number;
  herramientas: HerramientaMantenimiento[];
  collapsed: boolean; // Remove optional operator
}

interface ResumenReporte {
  totalUsuariosConPrestamos: number;
  totalProveedoresConMantenimiento: number;
  totalHerramientasPrestadas: number;
  totalHerramientasEnMantenimiento: number;
  usuarioConMasHerramientas: UsuarioConHerramientas;
  proveedorConMasHerramientas: ProveedorConHerramientas;
}

interface ReporteData {
  usuariosConHerramientas: UsuarioConHerramientas[];
  proveedoresConHerramientas: ProveedorConHerramientas[];
  resumen: ResumenReporte;
}

@Component({
  selector: 'app-herramienta-usuario',
  imports: [
    CommonModule,
    FormsModule,
    NgbTooltipModule,
    NgbCollapseModule,
    SpinnerComponent,
  ],
  templateUrl: './herramienta-usuario.component.html',
  styleUrls: ['../../../../styles/reportes-style.css'],
})
export class HerramientaUsuarioComponent implements OnInit {
  loading = false;
  loadingExport = false; // Add loading state for Excel export
  reporteData: ReporteData | null = null;
  usuariosConHerramientas: UsuarioConHerramientas[] = [];
  proveedoresConHerramientas: ProveedorConHerramientas[] = [];
  resumen: ResumenReporte | null = null;

  // Filtros de vista
  filtroUsuario = '';
  filtroProveedor = '';
  mostrarSoloUsuarios = false;
  mostrarSoloProveedores = false;

  constructor(
    private pageTitleService: PageTitleService,
    private srvHerramienta: HerramientaService,
    private srvAlerta: AlertaService
  ) { }

  ngOnInit(): void {
    this.pageTitleService.setTitle('Reporte Herramientas por Usuario');
    this.cargarReporte();
  }

  cargarReporte(): void {
    this.loading = true;

    this.srvHerramienta.getReporteHerramientasUsuario().subscribe({
      next: (response: any) => {
        this.loading = false;
        if (response.success && response.data) {
          this.reporteData = response.data;
          this.usuariosConHerramientas = (response.data.usuariosConHerramientas || []).map((u: any) => ({
            ...u,
            collapsed: true
          }));
          this.proveedoresConHerramientas = (response.data.proveedoresConHerramientas || []).map((p: any) => ({
            ...p,
            collapsed: true
          }));
          this.resumen = response.data.resumen || null;
        } else {
          this.srvAlerta.error('No se encontraron datos en el reporte.');
        }
      },
      error: (error: any) => {
        this.loading = false;
        console.error('Error al cargar el reporte:', error);
        this.srvAlerta.error('Error al cargar el reporte de herramientas por usuario.');
      },
    });
  }

  // Filtros
  get usuariosFiltrados(): UsuarioConHerramientas[] {
    return this.usuariosConHerramientas.filter(u =>
      u.usuario.nombreCompleto.toLowerCase().includes(this.filtroUsuario.toLowerCase()) ||
      u.usuario.legajo.includes(this.filtroUsuario)
    );
  }

  get proveedoresFiltrados(): ProveedorConHerramientas[] {
    return this.proveedoresConHerramientas.filter(p =>
      p.proveedor.nombreProveedor.toLowerCase().includes(this.filtroProveedor.toLowerCase()) ||
      p.proveedor.contacto.toLowerCase().includes(this.filtroProveedor.toLowerCase())
    );
  }

  limpiarFiltros(): void {
    this.filtroUsuario = '';
    this.filtroProveedor = '';
    this.mostrarSoloUsuarios = false;
    this.mostrarSoloProveedores = false;
  }

  // Toggle collapse
  toggleUsuarioCollapse(usuario: UsuarioConHerramientas): void {
    usuario.collapsed = !usuario.collapsed;
  }

  toggleProveedorCollapse(proveedor: ProveedorConHerramientas): void {
    proveedor.collapsed = !proveedor.collapsed;
  }

  // Expandir/Colapsar todos
  expandirTodosUsuarios(): void {
    this.usuariosConHerramientas.forEach(u => u.collapsed = false);
  }

  colapsarTodosUsuarios(): void {
    this.usuariosConHerramientas.forEach(u => u.collapsed = true);
  }

  expandirTodosProveedores(): void {
    this.proveedoresConHerramientas.forEach(p => p.collapsed = false);
  }

  colapsarTodosProveedores(): void {
    this.proveedoresConHerramientas.forEach(p => p.collapsed = true);
  }

  // Helpers para formateo
  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getFamiliaClass(familia: string): string {
    const fam = familia.toLowerCase();
    if (fam.includes('eléctrica') || fam.includes('electrica')) return 'familia-electrica';
    if (fam.includes('medición') || fam.includes('medicion')) return 'familia-medicion';
    if (fam.includes('ferretería') || fam.includes('ferreteria')) return 'familia-ferreteria';
    if (fam.includes('mecánica') || fam.includes('mecanica')) return 'familia-mecanica';
    return 'familia-default';
  }

  // Método para exportar reporte general solamente
  exportarReporteGeneral(): void {
    this.loadingExport = true;

    this.srvHerramienta.reporteUsuariosProveedores().subscribe({
      next: (blob: Blob) => {
        this.loadingExport = false;
        const fileName = `Reporte_UsuariosProveedores_General_${new Date().toISOString().split('T')[0]}.xlsx`;
        this.descargarArchivo(blob, fileName);
        this.srvAlerta.success('Reporte general descargado correctamente.');
      },
      error: (error: any) => {
        this.loadingExport = false;
        console.error('Error al descargar reporte general:', error);
        this.srvAlerta.error('Error al descargar el reporte general.');
      }
    });
  }

  private descargarArchivo(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

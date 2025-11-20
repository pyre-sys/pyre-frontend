import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HerramientaService } from '../../../services/herramienta.service';
import { AlertaService } from '../../../services/alerta.service';
import { MovimientoService } from '../../../services/movimiento.service';
import { PageTitleService } from '../../../services/page-title.service';
import { Router, RouterModule } from '@angular/router';

export interface ActividadReciente {
  tipoMovimiento: string;
  nombreHerramienta: string;
  fecha: string;
  hora: string;
  nombreUsuarioResponsable: string;
  iconClass: string;
  iconColor: string;
}

export interface RankingHerramienta {
  nombreHerramienta: string;
  totalPrestamos: number;
  ultimoPrestamo: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  herramientasTotales = 0;
  herramientasDisponibles = 0;
  herramientasEnPrestamo = 0;
  herramientasEnReparacion = 0;
  alertasPendientes = 0;
  alertasVencidas = 0;
  actividadReciente: ActividadReciente[] = [];
  rankingHerramientas: RankingHerramienta[] = [];

  constructor(
    private herramientaService: HerramientaService,
    private alertaService: AlertaService,
    private movimientoService: MovimientoService,
    private pageTitleService: PageTitleService,
    private router: Router
  ) {}

  ngOnInit() {
    this.pageTitleService.setTitle('Dashboard');
    this.cargarEstadisticas();
    this.cargarActividadReciente();
    this.cargarRankingHerramientas();
  }

  private cargarEstadisticas(): void {
    this.herramientaService
      .getCountHerramientasTotales()
      .subscribe((resp: any) => {
        this.herramientasTotales = resp?.data ?? 0;
      });
    this.herramientaService
      .getCountHerramientasDisponibles()
      .subscribe((resp: any) => {
        this.herramientasDisponibles = resp?.data ?? 0;
      });
    this.herramientaService
      .getCountHerramientasEnPrestamo()
      .subscribe((resp: any) => {
        this.herramientasEnPrestamo = resp?.data ?? 0;
      });
    this.herramientaService
      .getCountHerramientasEnReparacion()
      .subscribe((resp: any) => {
        this.herramientasEnReparacion = resp?.data ?? 0;
      });
    this.alertaService.getCountAlertasPendientes().subscribe((resp: any) => {
      this.alertasPendientes = resp?.data ?? 0;
    });
    this.alertaService.getCountAlertasVencidas().subscribe((resp: any) => {
      this.alertasVencidas = resp?.data ?? 0;
    });
  }

  private cargarActividadReciente(): void {
    this.movimientoService.getUltimasPrestadas().subscribe(
      (resp: any) => {
        if (resp?.data && Array.isArray(resp.data)) {
          this.actividadReciente = resp.data.map((movimiento: any) => ({
            tipoMovimiento: movimiento.tipoMovimiento,
            nombreHerramienta: movimiento.nombreHerramienta,
            ...this.formatearFechaYHora(movimiento.fecha),
            nombreUsuarioResponsable: movimiento.nombreUsuarioResponsable,
            iconClass: this.getIconClass(movimiento.tipoMovimiento),
            iconColor: this.getIconColor(movimiento.tipoMovimiento),
          }));
        }
      },
      (error) => {
        console.error('Error al cargar actividad reciente:', error);
      }
    );
  }

  private cargarRankingHerramientas(): void {
    this.movimientoService.getRankingMasPrestadas().subscribe(
      (resp: any) => {
        if (resp?.data && Array.isArray(resp.data)) {
          this.rankingHerramientas = resp.data
            .slice(0, 10)
            .map((item: any) => ({
              nombreHerramienta: item.nombreHerramienta,
              totalPrestamos: item.totalPrestamos,
              ultimoPrestamo: this.formatearFechaRelativa(item.ultimoPrestamo),
            }));
        }
      },
      (error) => {
        console.error('Error al cargar ranking de herramientas:', error);
      }
    );
  }

  private formatearFechaRelativa(fecha: string): string {
    const date = new Date(fecha);
    const ahora = new Date();
    const diffMs = ahora.getTime() - date.getTime();
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffDias === 0) return 'Hoy';
    if (diffDias === 1) return 'Ayer';

    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  private formatearFechaYHora(fecha: string): { fecha: string; hora: string } {
    const date = new Date(fecha);
    const ahora = new Date();
    const diffMs = ahora.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    let fechaFormato = '';
    if (diffMins < 1) {
      fechaFormato = 'Hace unos segundos';
    } else if (diffMins < 60) {
      fechaFormato = `Hace ${diffMins} min`;
    } else if (diffHoras < 24) {
      fechaFormato = `Hace ${diffHoras}h`;
    } else if (diffDias < 7) {
      fechaFormato = `Hace ${diffDias}d`;
    } else {
      fechaFormato = date.toLocaleDateString('es-ES');
    }

    const hora = date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    return { fecha: fechaFormato, hora };
  }

  private getIconClass(tipoMovimiento: string): string {
    const tipo = tipoMovimiento?.toLowerCase();
    if (tipo?.includes('prestamo')) return 'bi-arrow-right';
    if (tipo?.includes('devolucion')) return 'bi-arrow-left';
    if (tipo?.includes('reparacion')) return 'bi-wrench-adjustable';
    return 'bi-plus-circle';
  }

  private getIconColor(tipoMovimiento: string): string {
    const tipo = tipoMovimiento?.toLowerCase();
    if (tipo?.includes('prestamo')) return 'success';
    if (tipo?.includes('devolucion')) return 'info';
    if (tipo?.includes('reparacion')) return 'warning';
    return 'primary';
  }

  navigateAlerta() {
    this.router.navigate(['/dashboard/alertas']);
  }
}

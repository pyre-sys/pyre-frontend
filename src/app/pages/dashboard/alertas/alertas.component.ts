import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap'; // Asegurarse de que esté importado
import { AlertaService } from '../../../services/alerta.service';
import { PageTitleService } from '../../../services/page-title.service';
import { ModalAlertaComponent } from '../modal-alerta/modal-alerta.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';

interface Alerta {
  idAlerta: number;
  idMovimiento: number;
  nombreHerramienta: string; // Ya existe
  herramientaNombre?: string; // Agregada para evitar conflictos
  idTipoAlerta: number;
  nombreTipoAlerta: string;
  fechaGeneracion: string;
  fechaVencimiento?: string; // Agregada
  comentario: string;
  activo: boolean;
  diasVencido?: number;
  responsableNombre?: string;
  herramientaCodigo?: string;
  tipoMovimiento?: string;
}

@Component({
  selector: 'app-alertas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgbTooltipModule, // Asegurarse de que esté incluido aquí
    ModalAlertaComponent,
    SpinnerComponent,
  ],
  templateUrl: './alertas.component.html',
  styleUrls: ['./alertas.component.css', '../../../../styles/visor-style.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate(
          '300ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ]),
  ],
})
export class AlertasComponent implements OnInit {
  alertas: Alerta[] = [];
  alertasFiltradas: Alerta[] = [];
  isLoading = false;

  // Contadores para las tarjetas
  totalAlertas = 0;
  prestamosVencidos = 0;
  reparacionesVencidas = 0;

  // Modal properties
  selectedAlerta: Alerta | null = null;
  showEditModal = false;

  constructor(
    private alertaService: AlertaService,
    private pageTitleService: PageTitleService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.pageTitleService.setTitle('Gestión de Alertas');
    this.fetchAlertas(); // ahora fetchAlertas obtiene también el total oficial
  }

  fetchAlertas(): void {
    this.isLoading = true;

    // 1) obtener total oficial primero
    this.alertaService.getCountAlertasVencidas().subscribe({
      next: (countResp: any) => {
        this.totalAlertas = Number(countResp?.data ?? 0);

        // 2) luego traer la lista completa de alertas
        this.alertaService.getAlertas().subscribe({
          next: (resp: any) => {
            this.alertas = (resp.data || []).map((alerta: any) => ({
              ...alerta,
              herramientaNombre:
                alerta.nombreHerramienta ?? alerta.herramientaNombre,
              fechaVencimiento:
                alerta.fechaVencimiento ?? alerta.fecha_vencimiento ?? null,
              diasVencido: this.calcularDiasVencido(
                alerta.fechaVencimiento ?? alerta.fecha_vencimiento ?? null
              ),
            }));
            this.alertasFiltradas = [...this.alertas];

            // 3) calcular préstamos y mantenimientos a partir de tipoMovimiento
            const normalize = (s?: string) =>
              (s ?? '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');

            const prestamos = this.alertas.filter((a) =>
              normalize(a.tipoMovimiento).includes('prestamo')
            ).length;

            const mantenimientos = this.alertas.filter((a) =>
              normalize(a.tipoMovimiento).includes('mantenimiento')
            ).length;

            // 4) asegurar que la suma coincide con el total oficial (siempre respetar totalAlertas)
            this.prestamosVencidos = prestamos;
            // asignar la diferencia a mantenimiento para que la suma coincida con totalAlertas
            const diff = this.totalAlertas - this.prestamosVencidos;
            this.reparacionesVencidas =
              diff >= 0
                ? Math.max(mantenimientos, diff)
                : Math.max(mantenimientos, 0);

            this.isLoading = false;
          },
          error: () => {
            this.alertas = [];
            this.alertasFiltradas = [];
            this.prestamosVencidos = 0;
            this.reparacionesVencidas = Math.max(
              0,
              this.totalAlertas - this.prestamosVencidos
            );
            this.isLoading = false;
          },
        });
      },
      error: () => {
        // Si falla obtener el total, caemos a cargar lista y calcular desde ella
        this.alertaService.getAlertas().subscribe({
          next: (resp: any) => {
            this.alertas = (resp.data || []).map((alerta: any) => ({
              ...alerta,
              herramientaNombre:
                alerta.nombreHerramienta ?? alerta.herramientaNombre,
              fechaVencimiento:
                alerta.fechaVencimiento ?? alerta.fecha_vencimiento ?? null,
              diasVencido: this.calcularDiasVencido(
                alerta.fechaVencimiento ?? alerta.fecha_vencimiento ?? null
              ),
            }));
            this.alertasFiltradas = [...this.alertas];
            this.totalAlertas = this.alertas.length;

            const normalize = (s?: string) =>
              (s ?? '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');

            this.prestamosVencidos = this.alertas.filter((a) =>
              normalize(a.tipoMovimiento).includes('prestamo')
            ).length;
            this.reparacionesVencidas =
              this.totalAlertas - this.prestamosVencidos;
            this.isLoading = false;
          },
          error: () => {
            this.alertas = [];
            this.alertasFiltradas = [];
            this.totalAlertas = 0;
            this.prestamosVencidos = 0;
            this.reparacionesVencidas = 0;
            this.isLoading = false;
          },
        });
      },
    });
  }

  // Calcular días vencido
  private calcularDiasVencido(fechaVencimiento: string | null): number {
    if (!fechaVencimiento) return 0;

    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diferenciaTiempo = hoy.getTime() - vencimiento.getTime();
    const diasVencido = Math.floor(diferenciaTiempo / (1000 * 60 * 60 * 24));

    return diasVencido > 0 ? diasVencido : 0; // Solo devolver días vencidos positivos
  }

  // Open dilatar modal
  openDilatarModal(alerta: Alerta): void {
    this.selectedAlerta = { ...alerta };
    this.showEditModal = true;
  }

  // Close edit modal
  onCloseEditModal(): void {
    this.selectedAlerta = null;
    this.showEditModal = false;
  }

  // Handle alert updated
  onAlertaUpdated(): void {
    this.fetchAlertas(); // Reload alerts after update
    this.onCloseEditModal();
  }

  downloadReporteExcel(): void {
    console.log('Descargando reporte de alertas...');
    // Verificar que el método exportarAlertasExcel exista en AlertaService
    this.alertaService.exportarAlertasExcel().subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Reporte_Alertas_${new Date()
          .toISOString()
          .slice(0, 10)
          .replace(/-/g, '')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        console.log('Reporte descargado correctamente.');
      },
      error: (err: unknown) => {
        console.error('Error al descargar el reporte:', err);
      },
    });
  }
}

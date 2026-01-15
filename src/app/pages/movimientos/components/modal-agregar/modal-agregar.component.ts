import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MovimientoService,
  CreateMovimientoDto,
} from '../../../../services/movimiento.service';
import { AlertaService } from '../../../../services/alerta.service';
import { CboHerramientasComponent } from '../../../../shared/components/Cbo/cbo-herramientas/cbo-herramientas.component';

@Component({
  selector: 'app-modal-agregar',
  standalone: true,
  imports: [CommonModule, FormsModule, CboHerramientasComponent],
  templateUrl: './modal-agregar.component.html',
  styleUrls: ['./modal-agregar.component.css'],
})
export class ModalAgregarComponent implements OnInit {
  @Input() isOpen = false;
  @Input() movimiento: any = null;
  @Output() close = new EventEmitter<void>();
  @Output() movimientoCreado = new EventEmitter<any>();

  herramientaSeleccionada: any = null;
  observacionesAdicionales = '';
  loading = false;

  constructor(
    private movimientoService: MovimientoService,
    private alertaService: AlertaService
  ) {}

  ngOnInit(): void {
    if (this.isOpen) {
      this.resetForm();
    }
    // Debug: ver qué datos tiene el movimiento
    console.debug('[ModalAgregar] Movimiento recibido:', this.movimiento);
  }

  resetForm(): void {
    this.herramientaSeleccionada = null;
    this.observacionesAdicionales = '';
    this.loading = false;
  }

  onHerramientaSelected(herramienta: any): void {
    this.herramientaSeleccionada = herramienta;
  }

  onProcesar(): void {
    if (!this.herramientaSeleccionada || !this.movimiento) {
      this.alertaService.error('Debe seleccionar una herramienta.');
      return;
    }

    // Crear mensaje de confirmación similar al de prestamo component
    const tipoMovimiento =
      this.movimiento.tipoMovimiento ||
      this.movimiento.nombreTipoMovimiento ||
      'N/A';
    const fechaDevolucion = this.movimiento.fechaEstimadaDevolucion
      ? this.formatearFecha(this.movimiento.fechaEstimadaDevolucion)
      : 'Se usará fecha por defecto (mañana)';
    const confirmMessage = `¿Confirmar creación de movimiento?<br><br>Tipo: ${tipoMovimiento}<br>Herramienta: ${this.herramientaSeleccionada.nombre}<br>Código: ${this.herramientaSeleccionada.codigo}<br><br><strong>Fecha de devolución:</strong> ${fechaDevolucion}`;

    this.alertaService
      .confirm(confirmMessage, 'Confirmar Movimiento')
      .then((result) => {
        if (result.isConfirmed) {
          this.crearMovimiento();
        }
      });
  }

  private crearMovimiento(): void {
    if (!this.herramientaSeleccionada || !this.movimiento) return;

    this.loading = true;

    // Obtener fechaEstimadaDevolucion del movimiento original
    // Si no existe, usar fecha por defecto (mañana)
    let fechaDevolucion = this.movimiento.fechaEstimadaDevolucion;
    if (!fechaDevolucion) {
      fechaDevolucion = this.obtenerFechaDevolucionPorDefecto();
      console.warn(
        '[ModalAgregar] fechaEstimadaDevolucion no encontrada en movimiento original, usando fecha por defecto:',
        fechaDevolucion
      );
    }

    // Debug: verificar la fecha que se va a usar
    console.debug(
      '[ModalAgregar] Fecha de devolución a usar:',
      fechaDevolucion
    );

    // Preparar el DTO para crear el movimiento
    const nuevoMovimiento: CreateMovimientoDto = {
      idHerramienta:
        this.herramientaSeleccionada.idHerramienta ||
        this.herramientaSeleccionada.id,
      idUsuarioGenera:
        this.movimiento.idUsuarioGenera || this.movimiento.usuarioGenera?.id,
      idUsuarioResponsable:
        this.movimiento.idUsuarioResponsable ||
        this.movimiento.usuarioResponsable?.id ||
        null,
      idTipoMovimiento:
        this.movimiento.idTipoMovimiento || this.movimiento.tipoMovimiento?.id,
      fechaMovimiento: new Date().toISOString(), // Fecha actual para el nuevo movimiento
      fechaEstimadaDevolucion: fechaDevolucion, // USAR LA FECHA OBTENIDA
      idObra: this.movimiento.idObra || this.movimiento.obra?.id || null,
      idProveedor:
        this.movimiento.idProveedor || this.movimiento.proveedor?.id || null,
      observaciones: this.observacionesAdicionales || null,
    };

    // Debug: verificar el DTO que se va a enviar
    console.debug('[ModalAgregar] DTO a enviar:', nuevoMovimiento);

    this.movimientoService.registrarPrestamo(nuevoMovimiento).subscribe({
      next: (response) => {
        this.loading = false;
        const fechaUsada =
          this.movimiento.fechaEstimadaDevolucion ||
          this.obtenerFechaDevolucionPorDefecto();
        this.alertaService.success(
          `La herramienta ${
            this.herramientaSeleccionada.codigo
          } ha sido agregada exitosamente al préstamo.<br><br><strong>Fecha de devolución:</strong> ${this.formatearFecha(
            fechaUsada
          )}`,
          '✓ Herramienta Agregada'
        );
        this.movimientoCreado.emit(response);
        this.onClose();
      },
      error: (error) => {
        this.loading = false;
        this.alertaService.error(
          error?.error?.message ||
            'Ha ocurrido un error inesperado. Por favor, intente nuevamente.',
          '✗ Error al Registrar'
        );
        console.error('Error al crear movimiento:', error);
      },
    });
  }

  // Método para obtener fecha de devolución por defecto si no existe en el movimiento original
  private obtenerFechaDevolucionPorDefecto(): string {
    // Por defecto, usar mañana como fecha de devolución
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    return manana.toISOString().split('T')[0];
  }

  // Método helper para formatear fecha en el mensaje
  private formatearFecha(fechaString: string): string {
    if (!fechaString) return 'No definida (se usará fecha por defecto)';

    try {
      const fecha = new Date(fechaString);
      return fecha.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Fecha inválida (se usará fecha por defecto)';
    }
  }

  onClose(): void {
    this.resetForm();
    this.close.emit();
  }
}

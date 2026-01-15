import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MovimientoService, CreateMovimientoDto } from '../../../../services/movimiento.service';
import { AlertaService } from '../../../../services/alerta.service';
import { CboHerramientasComponent } from "../../../../shared/components/Cbo/cbo-herramientas/cbo-herramientas.component";

@Component({
  selector: 'app-modal-agregar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CboHerramientasComponent
  ],
  templateUrl: './modal-agregar.component.html',
  styleUrl: './modal-agregar.component.css'
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
  ) { }

  ngOnInit(): void {
    if (this.isOpen) {
      this.resetForm();
    }
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
    const tipoMovimiento = this.movimiento.tipoMovimiento || this.movimiento.nombreTipoMovimiento || 'N/A';
    const confirmMessage = `¿Confirmar creación de movimiento?<br><br>Tipo: ${tipoMovimiento}<br>Herramienta: ${this.herramientaSeleccionada.nombre}<br>Código: ${this.herramientaSeleccionada.codigo}`;

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

    // Preparar el DTO para crear el movimiento
    const nuevoMovimiento: CreateMovimientoDto = {
      idHerramienta: this.herramientaSeleccionada.idHerramienta || this.herramientaSeleccionada.id,
      idUsuarioGenera: this.movimiento.idUsuarioGenera || this.movimiento.usuarioGenera?.id,
      idUsuarioResponsable: this.movimiento.idUsuarioResponsable || this.movimiento.usuarioResponsable?.id || null,
      idTipoMovimiento: this.movimiento.idTipoMovimiento || this.movimiento.tipoMovimiento?.id,
      fechaMovimiento: this.movimiento.fecha || new Date().toISOString(),
      idObra: this.movimiento.idObra || this.movimiento.obra?.id || null,
      idProveedor: this.movimiento.idProveedor || this.movimiento.proveedor?.id || null,
      observaciones: this.observacionesAdicionales || this.movimiento.observaciones || null
    };

    this.movimientoService.registrarPrestamo(nuevoMovimiento).subscribe({
      next: (response) => {
        this.loading = false;
        this.alertaService.success(
          `El movimiento de la herramienta ${this.herramientaSeleccionada.codigo} ha sido registrado exitosamente.`,
          '✓ Movimiento Registrado'
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
      }
    });
  }

  onClose(): void {
    this.resetForm();
    this.close.emit();
  }
}

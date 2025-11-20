import { Component, EventEmitter, Output, OnInit, Input, OnChanges, SimpleChanges, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertaService, UpdateAlertaMovimientoDto } from '../../../services/alerta.service';
import { MovimientoService } from '../../../services/movimiento.service';
import { AuthService } from '../../../services/auth.service';

interface Alerta {
  idAlerta: number;
  idMovimiento: number;
  nombreHerramienta: string;
  idTipoAlerta: number;
  nombreTipoAlerta: string;
  fechaGeneracion: string;
  comentario: string;
  activo: boolean;
  diasVencido?: number;
  responsableNombre?: string;
  tipoMovimiento?: string;
}

@Component({
  selector: 'app-modal-alerta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-alerta.component.html',
  styleUrls: ['../../../../styles/modal-style.css']
})
export class ModalAlertaComponent implements OnInit, OnChanges {
  @Output() close = new EventEmitter<void>();
  @Output() alertaUpdated = new EventEmitter<void>();

  @Input() alerta: Alerta | null = null;
  @Input() visible = false;

  nuevaFechaEstimada: string = '';
  nuevaComentario: string = '';
  isProcessing = false;

  constructor(
    private alertaService: AlertaService,
    private movimientoService: MovimientoService,
    private authService: AuthService,
    private elementRef: ElementRef
  ) { }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: Event | KeyboardEvent) {
    this.onCancel();
  }

  ngOnInit(): void {
    // Focus on first input when modal opens
    setTimeout(() => {
      const firstInput = this.elementRef.nativeElement.querySelector('input:not([readonly]):not([disabled])');
      if (firstInput) firstInput.focus();
    }, 150);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['alerta'] && this.alerta) {
      this.nuevaFechaEstimada = '';
      this.nuevaComentario = this.alerta.comentario ?? '';
    }
  }

  onSaveEdit(): void {
    if (!this.alerta) return;

    this.isProcessing = true;

    const alertId = this.alerta.idAlerta;
    const currentUser = this.authService.getUser();

    // Prepare update DTO for the combined endpoint
    const updateDto: UpdateAlertaMovimientoDto = {
      IdAlerta: alertId,
      Activo: false,
      Comentario: this.nuevaComentario || null,
      IdModifica: currentUser?.id || null
    };

    // Add movement data if it's a loan alert and new date is provided
    if (this.alerta.idTipoAlerta === 2 && this.nuevaFechaEstimada) {
      updateDto.IdMovimiento = this.alerta.idMovimiento;
      updateDto.FechaEstimadaDevolucion = this.nuevaFechaEstimada;
    }

    // Execute single API call
    this.alertaService.updateAlertaAndMovimiento(alertId, updateDto)
      .toPromise()
      .then((result) => {
        this.isProcessing = false;
        this.alertaService.success('Los cambios se guardaron correctamente', '¡Éxito!');
        this.alertaUpdated.emit();
        this.onCancel();
      })
      .catch((error) => {
        this.isProcessing = false;
        console.error('Error al guardar cambios:', error);
        this.alertaService.error('Ocurrió un error al guardar los cambios', 'Error');
      });
  }

  onCancel(): void {
    this.nuevaFechaEstimada = '';
    this.nuevaComentario = '';
    this.isProcessing = false;
    this.close.emit();
  }

  // Format date for datetime-local input
  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  get formattedFechaGeneracion(): string {
    if (!this.alerta?.fechaGeneracion) return '';
    const date = new Date(this.alerta.fechaGeneracion);
    return this.formatDateForInput(date);
  }

  get isFormValid(): boolean {
    // For loan alerts, require new estimated date
    if (this.alerta?.idTipoAlerta === 2) {
      return !!this.nuevaFechaEstimada;
    }
    // For maintenance alerts, no additional validation needed
    return true;
  }
}

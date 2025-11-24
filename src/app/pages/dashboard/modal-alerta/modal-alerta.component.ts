import {
  Component,
  EventEmitter,
  Output,
  OnInit,
  Input,
  OnChanges,
  SimpleChanges,
  HostListener,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AlertaService,
  UpdateAlertaMovimientoDto,
} from '../../../services/alerta.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-modal-alerta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-alerta.component.html',
  styleUrls: ['../../../../styles/modal-style.css'],
})
export class ModalAlertaComponent implements OnInit, OnChanges {
  @Output() close = new EventEmitter<void>();
  @Output() alertaUpdated = new EventEmitter<void>();

  @Input() alerta: any | null = null;
  @Input() visible = false;

  nuevaFechaEstimada: string = '';
  nuevaComentario: string = '';
  isProcessing = false;

  // Nueva propiedad: fecha mínima permitida (YYYY-MM-DD) -> mañana
  minDate: string = '';

  constructor(
    private alertaService: AlertaService,
    private authService: AuthService,
    private elementRef: ElementRef
  ) {}

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: Event | KeyboardEvent) {
    this.onCancel();
  }

  ngOnInit(): void {
    this.computeMinDate();
    setTimeout(() => {
      const firstInput = this.elementRef.nativeElement.querySelector(
        'input:not([readonly]):not([disabled])'
      );
      if (firstInput) firstInput.focus();
    }, 150);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['alerta'] && this.alerta) {
      this.nuevaFechaEstimada = '';
      this.nuevaComentario = this.alerta.comentario ?? '';
      this.computeMinDate(); // recalcular por si la apertura se hace en cambio de día
    }
  }

  // Calcula la fecha mínima (mañana) con formato YYYY-MM-DD
  private computeMinDate(): void {
    const hoy = new Date();
    const manana = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate() + 1
    );
    const yyyy = manana.getFullYear();
    const mm = String(manana.getMonth() + 1).padStart(2, '0');
    const dd = String(manana.getDate()).padStart(2, '0');
    this.minDate = `${yyyy}-${mm}-${dd}`;
  }

  // Convierte fecha 'YYYY-MM-DD' a ISO datetime para la API (00:00:00)
  private toApiDate(dateStr: string): string {
    if (!dateStr) return '';
    const iso = new Date(dateStr + 'T00:00:00').toISOString();
    return iso;
  }

  onSaveEdit(): void {
    if (!this.alerta) return;

    // Validación adicional por seguridad
    if (this.alerta.idTipoAlerta === 2 && !this.nuevaFechaEstimada) return;
    if (
      this.alerta.idTipoAlerta === 2 &&
      this.nuevaFechaEstimada < this.minDate
    )
      return;

    // preparar DTO pero NO ejecutar aún
    const updateDto: UpdateAlertaMovimientoDto = {
      IdAlerta: this.alerta.idAlerta,
      Activo: false,
      Comentario: this.nuevaComentario,
      IdModifica: this.authService.getUser()?.id || null,
    };

    if (this.alerta.idTipoAlerta === 2 && this.nuevaFechaEstimada) {
      updateDto.IdMovimiento = this.alerta.idMovimiento;
      updateDto.FechaEstimadaDevolucion = this.toApiDate(
        this.nuevaFechaEstimada
      );
    }

    // Usar AlertaService.confirm para solicitar confirmación al usuario
    this.alertaService
      .confirm(
        'Esta acción eliminará la alerta hasta que vuelva a vencer el préstamo. ¿Desea continuar?',
        'Confirmar dilatación'
      )
      .then((result: any) => {
        if (result?.isConfirmed) {
          // el usuario confirmó -> ejecutar la actualización
          this.isProcessing = true;
          this.alertaService
            .updateAlertaAndMovimiento(this.alerta!.idAlerta, updateDto)
            .toPromise()
            .then(() => {
              this.isProcessing = false;
              this.alertaService.success(
                'Los cambios se guardaron correctamente',
                '¡Éxito!'
              );
              this.alertaUpdated.emit();
              this.onCancel();
            })
            .catch((err) => {
              this.isProcessing = false;
              console.error('Error al guardar cambios:', err);
              this.alertaService.error(
                'Ocurrió un error al guardar los cambios',
                'Error'
              );
            });
        } else {
          // usuario canceló: no hacer nada
        }
      })
      .catch((err) => {
        // en caso de error con el modal de confirmación
        console.error('Error mostrando confirmación:', err);
      });
  }

  onCancel(): void {
    this.nuevaFechaEstimada = '';
    this.nuevaComentario = '';
    this.isProcessing = false;
    this.close.emit();
  }

  get formattedFechaGeneracion(): string {
    if (!this.alerta?.fechaGeneracion) return '';
    const date = new Date(this.alerta.fechaGeneracion);
    return this.formatDateForInput(date);
  }

  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // Ajustar la validación del formulario para prevenir fechas no permitidas
  get isFormValid(): boolean {
    if (this.alerta?.idTipoAlerta === 2) {
      const fechaOk =
        !!this.nuevaFechaEstimada && this.nuevaFechaEstimada >= this.minDate;
      return fechaOk && !!this.nuevaComentario.trim();
    }
    return !!this.nuevaComentario.trim();
  }

  // Formatea fecha de vencimiento para mostrar en el header (dd/MM/yyyy)
  get formattedFechaVencimiento(): string {
    const raw =
      this.alerta?.fechaVencimiento ?? this.alerta?.fecha_vencimiento ?? null;
    if (!raw) return '';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
}

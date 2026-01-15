import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-modal-historial',
  standalone: true,
  imports: [CommonModule, NgbTooltipModule],
  templateUrl: './modal-historial.component.html',
  styleUrls: ['./modal-historial.component.css'],
})
export class ModalHistorialComponent {
  @Input() data: any | null = null;
  @Output() close = new EventEmitter<void>();

  visible = true;

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    this.onClose();
  }

  onClose(): void {
    this.visible = false;
    this.close.emit();
  }

  // Determina si el movimiento corresponde a una devolución
  isDevolucion(): boolean {
    if (!this.data) return false;
    const tipo =
      this.data.idTipoMovimiento ||
      this.data.tipoMovimiento ||
      this.data.nombreTipoMovimiento ||
      '';
    if (typeof tipo === 'number') {
      return tipo === 2;
    }
    if (typeof tipo === 'string') {
      const normalized = tipo
        .toString()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();
      return normalized.includes('devol');
    }
    return false;
  }

  // Intenta obtener la fecha real de devolución desde varios posibles campos
  getFechaDevolucionReal(): string | null {
    if (!this.data) return null;
    const candidates = [
      'fechaDevolucion',
      'fechaDevolucionReal',
      'fechaRealDevolucion',
      'fechaRetorno',
      'fechaRegistroDevolucion',
      'fechaDevolucionRegistrada',
      'fecha',
    ];
    for (const key of candidates) {
      const v = this.data[key];
      if (v) return v;
    }
    // Si data contiene array de movimientos, buscar el movimiento de devolución
    if (Array.isArray(this.data.movimientos)) {
      const movDev = this.data.movimientos.find((m: any) => {
        const t =
          m.idTipoMovimiento ||
          m.tipoMovimiento ||
          m.nombreTipoMovimiento ||
          '';
        if (typeof t === 'number') return t === 2;
        if (typeof t === 'string') return t.toLowerCase().includes('devol');
        return false;
      });
      if (movDev && movDev.fecha) return movDev.fecha;
    }
    return null;
  }
}

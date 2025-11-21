import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Subject } from 'rxjs';
import { tap } from 'rxjs/operators';

declare const Swal: any;

export interface UpdateAlertaDto {
  IdAlerta: number;
  idMovimiento?: number;
  nombreHerramienta?: string;
  idTipoAlerta?: number;
  nombreTipoAlerta?: string;
  fechaGeneracion?: string;
  comentario?: string | null;
  activo?: boolean;
  diasVencido?: number;
  responsableNombre?: string | null;
  tipoMovimiento?: string | null;
  idModifica?: number | null;
}

export interface UpdateAlertaMovimientoDto {
  IdAlerta: number;
  IdMovimiento?: number;
  FechaEstimadaDevolucion?: string;
  Comentario?: string;
  Activo?: boolean;
  IdModifica?: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class AlertaService {
  private apiUrl = environment.apiUrl;

  // Subject para notificar cambios en las alertas
  private alertasActualizadas = new Subject<void>();

  constructor(private http: HttpClient) {}

  // Método para obtener el observable de cambios
  getAlertasActualizadas$() {
    return this.alertasActualizadas.asObservable();
  }

  // Método para notificar que las alertas han cambiado
  notificarCambioEnAlertas() {
    this.alertasActualizadas.next();
  }

  // Modal de confirmación
  confirm(message: string, title: string = '¿Estás seguro?'): Promise<any> {
    return Swal.fire({
      title,
      html: message,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar',
      // Evitar que SweetAlert2 enfoque automáticamente el botón confirmar
      focusConfirm: false,
      // Al abrir el modal, desenfocar cualquier elemento que pudiera venir seleccionado
      // (esto evita que el botón aparezca 'seleccionado' inicialmente).
      didOpen: () => {
        try {
          // Small timeout to allow Swal internals a terminar su trabajo
          setTimeout(() => {
            const active = document.activeElement as HTMLElement | null;
            if (active && typeof active.blur === 'function') {
              active.blur();
            }
          }, 0);
        } catch (e) {
          // Silenciar errores de compatibilidad
        }
      },
      customClass: {
        popup: 'swal2-popup swal2-themed',
        title: 'swal2-title',
        confirmButton: 'swal2-confirm',
        cancelButton: 'swal2-cancel',
      },
    });
  }

  // Modal de éxito
  success(message: string, title: string = '¡Éxito!'): void {
    Swal.fire({
      title,
      text: message,
      icon: 'success',
      confirmButtonText: 'Aceptar',
      focusConfirm: false,
      didOpen: () => {
        try {
          setTimeout(() => {
            const active = document.activeElement as HTMLElement | null;
            if (active && typeof active.blur === 'function') active.blur();
          }, 0);
        } catch (e) {}
      },
      customClass: {
        popup: 'swal2-popup swal2-themed',
        title: 'swal2-title',
        confirmButton: 'swal2-confirm',
      },
    });
  }

  // Modal de error
  error(message: string, title: string = 'Error'): void {
    Swal.fire({
      title,
      text: message,
      icon: 'error',
      confirmButtonText: 'Aceptar',
      focusConfirm: false,
      didOpen: () => {
        try {
          setTimeout(() => {
            const active = document.activeElement as HTMLElement | null;
            if (active && typeof active.blur === 'function') active.blur();
          }, 0);
        } catch (e) {}
      },
      customClass: {
        popup: 'swal2-popup swal2-themed',
        title: 'swal2-title',
        confirmButton: 'swal2-confirm',
      },
    });
  }

  // GET /api/Alerta/alertas-pendientes
  getCountAlertasPendientes() {
    return this.http.get<any>(`${this.apiUrl}/Alerta/count-alertas-pendientes`);
  }

  // GET /api/Alerta/alertas-vencidas
  getCountAlertasVencidas() {
    return this.http.get<any>(`${this.apiUrl}/Alerta/count-alertas-vencidas`);
  }

  // GET /api/Alerta - Get all alerts
  getAlertas() {
    return this.http.get<any>(`${this.apiUrl}/Alerta`);
  }

  // PUT /api/Alerta/{id} -> actualizar alerta (requiere rol SuperAdmin en el backend)
  updateAlerta(id: number, updateDto: UpdateAlertaDto) {
    return this.http.put<any>(`${this.apiUrl}/Alerta/${id}`, updateDto).pipe(
      tap(() => this.notificarCambioEnAlertas()) // Notificar cambios después de actualizar
    );
  }

  // PATCH /api/Alerta/{id}/update-with-movement -> actualizar alerta con movimiento
  updateAlertaAndMovimiento(id: number, updateDto: UpdateAlertaMovimientoDto) {
    return this.http
      .patch<any>(`${this.apiUrl}/Alerta/${id}/update-with-movement`, updateDto)
      .pipe(
        tap(() => this.notificarCambioEnAlertas()) // Notificar cambios después de actualizar
      );
  }
}

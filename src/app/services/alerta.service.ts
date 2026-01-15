import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { tap } from 'rxjs/operators';
import { catchError } from 'rxjs/operators';

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

  constructor(private http: HttpClient) {
    // Nuevo: parchear fetch global para normalizar errores tipo "Failed to fetch" y mostrar modal
    this.patchFetch();
  }

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

  // Nuevo: formateador centralizado de errores HTTP
  private formatHttpError(err: any): string {
    try {
      if (err instanceof HttpErrorResponse) {
        // Error de red / sin respuesta del servidor
        if (err.status === 0) {
          return 'No se pudo conectar con el servidor. Verifica tu conexión o intenta más tarde.';
        }
        // Si el backend devolvió un mensaje legible en body
        const backendMsg =
          (err.error &&
            (err.error.message ||
              (typeof err.error === 'string' ? err.error : null))) ||
          null;
        if (backendMsg) return backendMsg;
        // Fallback con código de estado
        return `Error ${err.status}: ${
          err.statusText || 'Error en la comunicación con el servidor'
        }`;
      } else {
        // Otros errores (p. ej. errores de fetch en algunos navegadores)
        const msg = err?.message || (typeof err === 'string' ? err : '');
        const lower = (msg || '').toLowerCase();
        if (
          lower.includes('failed to fetch') ||
          lower.includes('networkrequestfailed') ||
          lower.includes('networkerror') ||
          lower.includes('network request failed')
        ) {
          return 'No se pudo conectar con el servidor. Verifica tu conexión o intenta más tarde.';
        }
        return msg || 'Ocurrió un error de red. Intenta nuevamente.';
      }
    } catch (e) {
      return 'Ocurrió un error inesperado. Intenta nuevamente.';
    }
  }

  // Public wrapper para obtener el mensaje formateado de error HTTP
  // Usar este método desde otros servicios/componentes en lugar de
  // invocar directamente al método privado.
  public getHttpErrorMessage(err: any): string {
    return this.formatHttpError(err);
  }

  // Nuevo: mostrar el modal y re-lanzar el error como Observable
  private handleAndThrow(err: any) {
    const mensaje =
      this.formatHttpError(err) || 'Ocurrió un error. Intenta nuevamente.';
    try {
      // Mostrar modal global de error
      this.error(mensaje, 'Error de comunicación');
    } catch {
      // noop: si Swal falla no detenemos la propagación del error
    }
    return throwError(() => new Error(mensaje));
  }

  // Nuevo: parchea window.fetch para convertir errores nativos en mensajes amigables y mostrar modal
  private patchFetch() {
    try {
      if (typeof window === 'undefined') return;
      const w: any = window;
      if (!w.fetch || w.__fetchPatched) return;
      const originalFetch = w.fetch.bind(w);
      w.fetch = async (...args: any[]) => {
        try {
          return await originalFetch(...args);
        } catch (err: any) {
          const msg = err && err.message ? '' + err.message : String(err);
          const lower = msg.toLowerCase();
          if (
            lower.includes('failed to fetch') ||
            lower.includes('networkerror') ||
            lower.includes('network request failed')
          ) {
            const friendly =
              'No se pudo conectar con el servidor. Verifica tu conexión o intenta más tarde.';
            // Mostrar modal inmediato
            try {
              this.error(friendly, 'Error de comunicación');
            } catch {}
            // Reemplazamos el error crudo por uno con mensaje amigable
            throw new Error(friendly);
          }
          // Re-lanzar otros errores sin modificar
          throw err;
        }
      };
      // Marcar para evitar doble parcheo
      w.__fetchPatched = true;
    } catch {
      // noop: si algo falla al parchear, no queremos bloquear la app
    }
  }

  // GET /api/Alerta/alertas-pendientes
  getCountAlertasPendientes() {
    return this.http
      .get<any>(`${this.apiUrl}/Alerta/count-alertas-pendientes`)
      .pipe(catchError((err) => this.handleAndThrow(err)));
  }

  // GET /api/Alerta/alertas-vencidas
  getCountAlertasVencidas() {
    return this.http
      .get<any>(`${this.apiUrl}/Alerta/count-alertas-vencidas`)
      .pipe(catchError((err) => this.handleAndThrow(err)));
  }

  // GET /api/Alerta - Get all alerts
  getAlertas() {
    return this.http
      .get<any>(`${this.apiUrl}/Alerta`)
      .pipe(catchError((err) => this.handleAndThrow(err)));
  }

  // PUT /api/Alerta/{id} -> actualizar alerta (requiere rol SuperAdmin en el backend)
  updateAlerta(id: number, updateDto: UpdateAlertaDto) {
    return this.http.put<any>(`${this.apiUrl}/Alerta/${id}`, updateDto).pipe(
      tap(() => this.notificarCambioEnAlertas()), // Notificar cambios después de actualizar
      catchError((err) => this.handleAndThrow(err))
    );
  }

  // PATCH /api/Alerta/{id}/update-with-movement -> actualizar alerta con movimiento
  updateAlertaAndMovimiento(id: number, updateDto: UpdateAlertaMovimientoDto) {
    return this.http
      .patch<any>(`${this.apiUrl}/Alerta/${id}/update-with-movement`, updateDto)
      .pipe(
        tap(() => this.notificarCambioEnAlertas()), // Notificar cambios después de actualizar
        catchError((err) => this.handleAndThrow(err))
      );
  }

  exportarAlertasExcel(): Observable<Blob> {
    const url = `${this.apiUrl}/exportar-excel`;
    return this.http
      .get(url, { responseType: 'blob' })
      .pipe(catchError((err) => this.handleAndThrow(err)));
  }
}

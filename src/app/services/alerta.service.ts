import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

declare const Swal: any;

@Injectable({
  providedIn: 'root'
})
export class AlertaService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }


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
        try { setTimeout(() => { const active = document.activeElement as HTMLElement | null; if (active && typeof active.blur === 'function') active.blur(); }, 0); } catch (e) { }
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
      didOpen: () => { try { setTimeout(() => { const active = document.activeElement as HTMLElement | null; if (active && typeof active.blur === 'function') active.blur(); }, 0); } catch (e) { } },
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

  // PUT /api/Alerta/{id}/marcar-leida - Mark alert as read/unread
  marcarAlertaLeida(idAlerta: number, leida: boolean) {
    return this.http.put<any>(`${this.apiUrl}/Alerta/${idAlerta}/marcar-leida`, { leida });
  }

  // PUT /api/Alerta/marcar-multiples-leidas - Mark multiple alerts as read
  marcarMultiplesAlertasLeidas(idsAlertas: number[]) {
    return this.http.put<any>(`${this.apiUrl}/Alerta/marcar-multiples-leidas`, { idsAlertas });
  }
}

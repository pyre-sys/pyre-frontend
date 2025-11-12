import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AlertaService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Modal de confirmación
  confirm(message: string, title: string = '¿Estás seguro?'): Promise<any> {
    // Usar confirm nativo como alternativa ligera a SweetAlert2
    return new Promise<boolean>((resolve) => {
      try {
        const result = window.confirm(title + '\n\n' + message);
        resolve(result);
      } catch (e) {
        // En entornos donde window.confirm puede fallar, resolver false
        console.error('confirm fallback', e);
        resolve(false);
      }
    });
  }

  // Modal de éxito
  success(message: string, title: string = '¡Éxito!'): void {
    // Mensaje simple usando alert nativo
    try {
      window.alert(title + '\n\n' + message);
    } catch (e) {
      console.error('success alert failed', e);
    }
  }

  // Modal de error
  error(message: string, title: string = 'Error'): void {
    // Mensaje de error usando alert nativo
    try {
      window.alert(title + '\n\n' + message);
    } catch (e) {
      console.error('error alert failed', e);
    }
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
    return this.http.put<any>(
      `${this.apiUrl}/Alerta/${idAlerta}/marcar-leida`,
      { leida }
    );
  }

  // PUT /api/Alerta/marcar-multiples-leidas - Mark multiple alerts as read
  marcarMultiplesAlertasLeidas(idsAlertas: number[]) {
    return this.http.put<any>(`${this.apiUrl}/Alerta/marcar-multiples-leidas`, {
      idsAlertas,
    });
  }
}

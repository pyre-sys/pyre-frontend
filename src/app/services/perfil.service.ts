import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PerfilService {
  private baseUrl =
    (environment?.apiUrl ? environment.apiUrl : '') + '/usuario';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene los datos del usuario logueado.
   * Endpoint: GET /api/Usuario/{id}/myself
   */
  getMyself(id: number): Observable<any> {
    if (!id && id !== 0) {
      return of(null);
    }
    return this.http.get<any>(`${this.baseUrl}/${id}/myself`).pipe(
      map((resp) => {
        // Normalizar la estructura esperada { data: { ... } , ... }
        const body = resp ?? {};
        const data = body.data ?? body;
        return data;
      }),
      catchError((err) => {
        return of(null);
      })
    );
  }

  /**
   * Cambiar contraseña.
   * Endpoint: POST /api/Usuario/change-password
   * payload ejemplo: { currentPassword, newPassword }
   */
  changePassword(payload: {
    currentPassword: string;
    newPassword: string;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/change-password`, payload);
  }
}

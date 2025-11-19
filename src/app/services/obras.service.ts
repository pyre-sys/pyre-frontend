import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ObraDto {
  idObra: number;
  codigo: string;
  nombreObra: string;
  descripcion?: string;
  ubicacion?: string;
  fechaInicio?: string; // ISO string
  fechaFin?: string; // ISO string
  activa?: boolean;
  idCliente?: number;
  clienteNombre?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ObrasService {
  private apiUrl = environment.apiUrl;
  private baseUrl = `${this.apiUrl}/Obra`;

  constructor(private http: HttpClient) {}

  getObras(): Observable<{ data: ObraDto[]; total: number }> {
    return this.http.get<{ data: ObraDto[]; total: number }>(`${this.baseUrl}`);
  }

  getObraById(id: number): Observable<{ data: ObraDto }> {
    return this.http.get<{ data: ObraDto }>(`${this.baseUrl}/${id}`);
  }

  createObra(data: Partial<ObraDto>): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}`, data);
  }

  // Cambiado: incluir el id en la URL para coincidir con [HttpPut("{id}")]
  updateObra(id: number, data: Partial<ObraDto>): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, data);
  }

  deleteObra(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`);
  }

  getObrasPaged(page: number = 1, pageSize: number = 10): Observable<any> {
    // El backend devuelve un objeto con 'data' que contiene 'data', 'page', 'pageSize', etc.
    return this.http.get<any>(
      `${this.baseUrl}?page=${page}&pageSize=${pageSize}`
    );
  }

  /**
   * Obtiene obras activas para combos/autocomplete con filtros opcionales.
   * Limita a 5 resultados por defecto para eficiencia.
   * @param idCliente - ID del cliente para filtrar (opcional).
   * @param search - Término de búsqueda parcial sobre nombreObra o codigo (opcional).
   * @returns Observable con BaseResponse<ObraDto[]>.
   */
  getObrasCombo(
    idCliente?: number,
    search?: string
  ): Observable<{ success: boolean; data: ObraDto[]; message?: string }> {
    let params = new HttpParams();
    if (idCliente !== undefined) {
      params = params.set('idCliente', idCliente.toString());
    }
    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<{
      success: boolean;
      data: ObraDto[];
      message?: string;
    }>(`${this.baseUrl}/getObrasCombo`, { params });
  }
}

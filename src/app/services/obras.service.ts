import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ObraDto {
  idObra: number;
  codigo: string;
  nombreObra: string;
  descripcion?: string;
  fechaInicio?: string; // ISO string
  fechaFin?: string; // ISO string
  activa?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ObrasService {
  private apiUrl = environment.apiUrl;
  private baseUrl = `${this.apiUrl}/Obra`;

  constructor(private http: HttpClient) { }

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
}

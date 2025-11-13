import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ObraDto {
  idObra: number;
  codigo: string;
  nombreObra: string;
  ubicacion?: string;
  fechaInicio?: string; // ISO string
  fechaFin?: string; // ISO string
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

  updateObra(id: number, data: Partial<ObraDto>): Observable<any> {
    // Normalizar el payload antes de enviarlo
    const normalizedData: any = {
      Codigo: data.codigo,
      NombreObra: data.nombreObra,
      Ubicacion: data.ubicacion,
      FechaInicio: data.fechaInicio,
      FechaFin: data.fechaFin === '' ? null : data.fechaFin, // Convertir cadena vacía a null
    };

    // Eliminar propiedades no definidas (como FechaFin si es null)
    Object.keys(normalizedData).forEach(
      (key) => normalizedData[key] === undefined && delete normalizedData[key]
    );

    // Anidar los datos en createDto
    const payload = { createDto: normalizedData };

    return this.http.put<any>(`${this.baseUrl}/${id}`, payload);
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

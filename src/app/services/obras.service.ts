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
    // Normalizar claves a PascalCase y limpiar fechas/strings vacíos.
    const src: any = { ...(data || {}) };
    const body: any = {
      IdCliente: src.idCliente ?? src.IdCliente ?? src.IdCliente ?? null,
      NombreObra: src.NombreObra ?? src.nombreObra ?? src.Nombre ?? '',
      Codigo: src.Codigo ?? src.codigo ?? '',
      Descripcion: src.Descripcion ?? src.descripcion ?? '',
      Estado: src.Estado ?? src.estado ?? 'Activo',
      FechaInicio: null,
      FechaFin: null,
      Observaciones: src.Observaciones ?? src.observaciones ?? '',
      Presupuesto: src.Presupuesto ?? src.presupuesto ?? '',
      ResponsableTecnico:
        src.ResponsableTecnico ?? src.responsableTecnico ?? '',
    };

    // Normalizar fechas: '' => null, Date => 'YYYY-MM-DD', string -> extract date prefix
    ['FechaInicio', 'FechaFin'].forEach((k) => {
      const raw =
        src[k] ?? src[k.toLowerCase()] ?? src[k[0].toLowerCase() + k.slice(1)];
      if (raw === '' || raw === undefined) {
        body[k] = null;
        return;
      }
      if (raw instanceof Date) {
        body[k] = raw.toISOString().split('T')[0];
        return;
      }
      if (typeof raw === 'string') {
        const match = raw.match(/^\d{4}-\d{2}-\d{2}/);
        body[k] = match ? match[0] : raw;
        return;
      }
      body[k] = null;
    });

    // DEBUG: mostrar body final que se enviará
    console.debug('[ObrasService] createObra payload:', body);
    return this.http.post<any>(`${this.baseUrl}`, body);
  }

  // Cambiado: incluir el id en la URL para coincidir con [HttpPut("{id}")]
  updateObra(id: number, data: Partial<ObraDto>): Observable<any> {
    const src: any = { ...(data || {}) };
    const body: any = {
      IdObra: id,
      IdCliente: src.idCliente ?? src.IdCliente ?? null,
      NombreObra: src.NombreObra ?? src.nombreObra ?? '',
      Codigo: src.Codigo ?? src.codigo ?? '',
      Descripcion: src.Descripcion ?? src.descripcion ?? '',
      Estado: src.Estado ?? src.estado ?? 'Activo',
      FechaInicio: null,
      FechaFin: null,
      Observaciones: src.Observaciones ?? src.observaciones ?? '',
      Presupuesto: src.Presupuesto ?? src.presupuesto ?? '',
      ResponsableTecnico:
        src.ResponsableTecnico ?? src.responsableTecnico ?? '',
    };

    ['FechaInicio', 'FechaFin'].forEach((k) => {
      const raw =
        src[k] ?? src[k.toLowerCase()] ?? src[k[0].toLowerCase() + k.slice(1)];
      if (raw === '' || raw === undefined) {
        body[k] = null;
        return;
      }
      if (raw instanceof Date) {
        body[k] = raw.toISOString().split('T')[0];
        return;
      }
      if (typeof raw === 'string') {
        const match = raw.match(/^\d{4}-\d{2}-\d{2}/);
        body[k] = match ? match[0] : raw;
        return;
      }
      body[k] = null;
    });

    // DEBUG: mostrar body final que se enviará
    console.debug('[ObrasService] updateObra payload:', id, body);
    return this.http.put<any>(`${this.baseUrl}/${id}`, body);
  }

  deleteObra(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`);
  }

  getObrasPaged(
    page: number = 1,
    pageSize: number = 10,
    filters?: { nombre?: string; codigo?: string }
  ): Observable<any> {
    // El backend devuelve un objeto con 'data' que contiene 'data', 'page', 'pageSize', etc.
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    if (filters) {
      if (
        filters.nombre !== undefined &&
        filters.nombre !== null &&
        String(filters.nombre).trim() !== ''
      ) {
        params = params.set('nombre', String(filters.nombre).trim());
      }
      if (
        filters.codigo !== undefined &&
        filters.codigo !== null &&
        String(filters.codigo).trim() !== ''
      ) {
        params = params.set('codigo', String(filters.codigo).trim());
      }
    }
    return this.http.get<any>(`${this.baseUrl}`, { params });
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

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { CreateUserDTO } from '../models/user.dto';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  // Use environment.apiUrl for dev/prod y apuntar al endpoint real '/usuario' (lowercase según backend)
  private baseUrl = (environment?.apiUrl ? environment.apiUrl : '') + '/usuario';

  constructor(private http: HttpClient) { }

  /**
   * Obtiene usuarios paginados y opcionalmente filtrados.
   * Parámetros de filtro aceptados (opcionales): legajo, estado, nombre, apellido, rol
   * Ejemplo:
   *   // Desde el frontend pueden llamar:
   *   userService.getUsers(1, 10, { nombre: 'Juan', estado: true });
   * Equivalente a GET /api/usuario?page=1&pageSize=10&nombre=Juan&estado=true
   */
  getUsers(
    page: number = 1,
    pageSize: number = 10,
    filters?: { legajo?: string; estado?: boolean; nombre?: string; apellido?: string; rol?: number }
  ): Observable<{ data: any[]; total: number; pagination?: any }> {
    let params = new HttpParams().set('page', page.toString()).set('pageSize', pageSize.toString());

    // Añadir filtros opcionales si fueron provistos
    if (filters) {
      if (filters.legajo !== undefined && filters.legajo !== null && String(filters.legajo).trim() !== '') {
        params = params.set('legajo', String(filters.legajo));
      }
      if (filters.estado !== undefined && filters.estado !== null) {
        // enviar como 'true' / 'false'
        params = params.set('estado', String(filters.estado));
      }
      if (filters.nombre !== undefined && filters.nombre !== null && String(filters.nombre).trim() !== '') {
        params = params.set('nombre', String(filters.nombre));
      }
      if (filters.apellido !== undefined && filters.apellido !== null && String(filters.apellido).trim() !== '') {
        params = params.set('apellido', String(filters.apellido));
      }
      if (filters.rol !== undefined && filters.rol !== null && filters.rol !== 0) {
        params = params.set('rol', String(filters.rol));
      }
    }

    // Solicitamos la respuesta completa para leer headers (p. ej. X-Total-Count)
    return this.http.get<any>(`${this.baseUrl}`, { params, observe: 'response' as const }).pipe(
      map(resp => {
        const body = resp.body ?? {};
        // Intenta leer header 'X-Total-Count' o 'x-total-count'
        const totalHeader = resp.headers.get('X-Total-Count') ?? resp.headers.get('x-total-count');

        let dataArray: any[] = [];
        let total = 0;
        let pagination = null;

        // 1. Verificar si la respuesta tiene la estructura estándar de la API con data.data
        if (body.data && typeof body.data === 'object' && !Array.isArray(body.data) && body.data.data) {
          const apiData = body.data;
          dataArray = Array.isArray(apiData.data) ? apiData.data : [];

          // Extraer metadata de paginación
          pagination = {
            page: apiData.page ?? 1,
            pageSize: apiData.pageSize ?? dataArray.length,
            totalRecords: apiData.totalRecords ?? dataArray.length,
            totalPages: apiData.totalPages ?? 1,
            hasNextPage: apiData.hasNextPage ?? false,
            hasPreviousPage: apiData.hasPreviousPage ?? false
          };

          total = apiData.totalRecords ?? dataArray.length;
        }
        // 2. Verificar si es un array directo
        else if (Array.isArray(body)) {
          dataArray = body;
          total = dataArray.length;
        }
        // 3. Verificar si tiene data como array
        else if (body.data && Array.isArray(body.data)) {
          dataArray = body.data;
          total = body.total ?? dataArray.length;
        }
        // 4. Fallback para otros formatos
        else {
          dataArray = [];
          total = 0;
        }

        // Respetar el totalHeader si existe
        if (totalHeader) {
          total = Number(totalHeader);
        }

        return { data: dataArray, total, pagination };
      }),
      catchError(err => {
        return of({ data: [], total: 0 });
      })
    );
  }

  getAllUsers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/all-unpaginated`);
  }

  getUserById(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}`);
  }

  getUserByDni(dni: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/dni/${dni}`);
  }

  getActiveUsers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/active`);
  }

  createUser(user: CreateUserDTO): Observable<any> {
    return this.http.post(`${this.baseUrl}/`, user);
  }

  updateUser(id: number, user: any): Observable<any> {
    try {
      console.log(`🔄 UsuarioService.updateUser called with ID: ${id}`);
      console.log('📤 User data being sent:', user);

      // Ensure the user object has the Id property matching the URL parameter
      if (!user.Id) {
        user.Id = id;
        console.log('✅ Added Id to user object:', user.Id);
      }

      if (user.Id !== id) {
        console.warn('⚠️ Mismatch between URL ID and user.Id:', { urlId: id, userId: user.Id });
      }

      const validBody = JSON.stringify(user);
      const url = `${this.baseUrl}/${id}`;
      console.log(`🌐 PUT request to: ${url}`);

      return this.http.put(url, JSON.parse(validBody), {
        headers: { 'Content-Type': 'application/json' }
      }).pipe(
        tap(response => {
          console.log('✅ Update successful:', response);
        }),
        catchError(error => {
          console.error('❌ Update failed:', error);
          throw error;
        })
      );
    } catch (error) {
      console.error('❌ Error preparing update request:', error);
      throw new Error('El cuerpo de la solicitud no es un JSON válido.');
    }
  }

  validateCredentials(legajo: string, password: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/validate`, { legajo, password });
  }

  /**
   * Alterna el estado activo/inactivo del usuario en el backend.
   * Llama a PATCH /Usuario/{id}/toggle-activo
   * El endpoint solo espera el id en la URL y realiza el toggle server-side.
   * No se envía body (se pasa null) para respetar la API que no requiere payload.
   */
  toggleActivo(id: number): Observable<any> {
    const url = `${this.baseUrl}/${id}/toggle-activo`;
    // No enviamos body: el backend hará el toggle basándose únicamente en el id.
    return this.http.patch(url, null);
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}

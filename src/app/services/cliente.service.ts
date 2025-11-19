import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ClienteService {
  // Use environment.apiUrl for dev/prod y apuntar al endpoint real '/cliente' (lowercase según backend)
  private baseUrl =
    (environment?.apiUrl ? environment.apiUrl : '') + '/cliente';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene clientes paginados y opcionalmente filtrados.
   * Parámetros de filtro aceptados (opcionales): nombre, cuit, activo
   * Ejemplo:
   *   clienteService.getClientes(1, 10, { nombre: 'Acme', activo: true });
   */
  getClientes(
    page: number = 1,
    pageSize: number = 10,
    filters?: { nombre?: string; cuit?: string; activo?: boolean }
  ): Observable<{ data: any[]; total: number; pagination?: any }> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (filters) {
      if (
        filters.nombre !== undefined &&
        filters.nombre !== null &&
        String(filters.nombre).trim() !== ''
      ) {
        params = params.set('nombre', String(filters.nombre));
      }
      if (
        filters.cuit !== undefined &&
        filters.cuit !== null &&
        String(filters.cuit).trim() !== ''
      ) {
        params = params.set('cuit', String(filters.cuit));
      }
      if (filters.activo !== undefined && filters.activo !== null) {
        params = params.set('activo', String(filters.activo));
      }
    }

    return this.http
      .get<any>(`${this.baseUrl}`, { params, observe: 'response' as const })
      .pipe(
        map((resp) => {
          const body = resp.body ?? {};
          const totalHeader =
            resp.headers.get('X-Total-Count') ??
            resp.headers.get('x-total-count');

          let dataArray: any[] = [];
          let total = 0;
          let pagination = null;

          // 1. Respuesta con BaseResponseDto.data = PaginatedResponseDto<ClienteDto>
          if (
            body.data &&
            typeof body.data === 'object' &&
            !Array.isArray(body.data) &&
            body.data.data
          ) {
            const apiData = body.data;
            dataArray = Array.isArray(apiData.data) ? apiData.data : [];

            pagination = {
              page: apiData.page ?? 1,
              pageSize: apiData.pageSize ?? dataArray.length,
              totalRecords: apiData.totalRecords ?? dataArray.length,
              totalPages: apiData.totalPages ?? 1,
              hasNextPage: apiData.hasNextPage ?? false,
              hasPreviousPage: apiData.hasPreviousPage ?? false,
            };

            total = apiData.totalRecords ?? dataArray.length;
          }
          // 2. Si viene un array directo
          else if (Array.isArray(body)) {
            dataArray = body;
            total = dataArray.length;
          }
          // 3. Si body.data es array
          else if (body.data && Array.isArray(body.data)) {
            dataArray = body.data;
            total = body.total ?? dataArray.length;
          } else {
            dataArray = [];
            total = 0;
          }

          if (totalHeader) {
            total = Number(totalHeader);
          }

          return { data: dataArray, total, pagination };
        }),
        catchError((err) => {
          return of({ data: [], total: 0 });
        })
      );
  }

  /**
   * Obtener todos los clientes sin paginar (si existe endpoint)
   * Ruta tentativa: /api/Cliente/all-unpaginated
   * (Mantener compatibilidad con distintos backends; si no existe, ajustar caller)
   */
  getAllClientes(): Observable<any> {
    return this.http.get(`${this.baseUrl}/all-unpaginated`);
  }

  getClienteById(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}`);
  }

  /**
   * Crea un cliente con validaciones locales y manejo de errores HTTP.
   * Retorna el body (BaseResponseDto<ClienteDto>) en caso de éxito (201).
   */
  createCliente(cliente: any): Observable<any> {
    // Validación cliente-side (evitar 400 innecesarios)
    const vErr = this.validateCreateClienteLocal(cliente);
    if (vErr) {
      return throwError(() => vErr);
    }

    return this.http
      .post<any>(`${this.baseUrl}`, cliente, { observe: 'response' as const })
      .pipe(
        map((resp) => {
          // 201 Created esperado; devolver body para el caller
          return resp.body;
        }),
        catchError((err: any) => {
          // Normalizar errores para la UI
          if (!err || !err.status) {
            return throwError(() => ({
              type: 'network',
              message: 'Error de red o sin respuesta del servidor.',
            }));
          }

          if (err.status === 400) {
            const details = err.error ?? null;
            return throwError(() => ({
              type: 'validation',
              message: 'Error de validación en los datos enviados.',
              details,
            }));
          }

          if (err.status === 401) {
            return throwError(() => ({
              type: 'auth',
              message: 'No autorizado. Token inválido o expirado.',
            }));
          }

          if (err.status === 403) {
            return throwError(() => ({
              type: 'forbidden',
              message: 'Acceso denegado. Rol no autorizado.',
            }));
          }

          if (err.status === 409) {
            const details = err.error ?? null;
            return throwError(() => ({
              type: 'conflict',
              message: 'Conflicto: recurso existente (p. ej. CUIT duplicado).',
              details,
            }));
          }

          // Fallback 5xx u otros
          return throwError(() => ({
            type: 'server',
            message: 'Error del servidor. Intente nuevamente más tarde.',
            details: err.error ?? null,
          }));
        })
      );
  }

  // Validaciones locales para CreateClienteDto
  private validateCreateClienteLocal(dto: any): any | null {
    if (!dto || typeof dto !== 'object') {
      return { type: 'validation', message: 'Datos de cliente inválidos.' };
    }
    const nombre = String(dto.nombre ?? '').trim();
    if (!nombre) {
      return { type: 'validation', message: 'El campo nombre es obligatorio.' };
    }
    if (nombre.length > 200) {
      return {
        type: 'validation',
        message: 'El campo nombre supera los 200 caracteres.',
      };
    }
    if (dto.cuit && String(dto.cuit).length > 11) {
      return { type: 'validation', message: 'CUIT supera los 11 caracteres.' };
    }
    if (dto.telefono && String(dto.telefono).length > 50) {
      return {
        type: 'validation',
        message: 'Teléfono supera los 50 caracteres.',
      };
    }
    if (dto.email) {
      if (String(dto.email).length > 150) {
        return {
          type: 'validation',
          message: 'Email supera los 150 caracteres.',
        };
      }
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(String(dto.email))) {
        return { type: 'validation', message: 'Formato de email inválido.' };
      }
    }
    if (dto.direccion && String(dto.direccion).length > 255) {
      return {
        type: 'validation',
        message: 'Dirección supera los 255 caracteres.',
      };
    }
    // Por defecto activo = true si no viene
    if (dto.activo === undefined || dto.activo === null) {
      dto.activo = true;
    }
    return null;
  }

  updateCliente(id: number, cliente: any): Observable<any> {
    // Validaciones básicas de entrada
    if (!id || typeof id !== 'number' || id <= 0) {
      return throwError(() => ({
        type: 'validation',
        message: 'Id inválido. Debe ser mayor que 0.',
      }));
    }

    // Asegurar que el body contiene IdCliente / idCliente / Id y que coincide con id
    const idInBody =
      cliente?.idCliente ??
      cliente?.Id ??
      cliente?.IdCliente ??
      cliente?.id ??
      null;
    if (idInBody === null || Number(idInBody) !== Number(id)) {
      return throwError(() => ({
        type: 'validation',
        message:
          'El Id del body (IdCliente) debe existir y coincidir con el id de la ruta.',
      }));
    }

    // Validación cliente-side (longitudes, email, required)
    const vErr = this.validateUpdateClienteLocal(cliente);
    if (vErr) {
      return throwError(() => vErr);
    }

    const url = `${this.baseUrl}/${id}`;
    console.log(`🌐 ClienteService.updateCliente PUT ${url}`, cliente);

    return this.http
      .put<any>(url, cliente, { observe: 'response' as const })
      .pipe(
        map((resp) => {
          // 200 OK esperado con BaseResponseDto<ClienteDto>
          return resp.body;
        }),
        catchError((err: any) => {
          if (!err || !err.status) {
            return throwError(() => ({
              type: 'network',
              message: 'Error de red o sin respuesta del servidor.',
            }));
          }

          if (err.status === 400) {
            const details = err.error ?? null;
            return throwError(() => ({
              type: 'validation',
              message: 'Error de validación en los datos enviados.',
              details,
            }));
          }

          if (err.status === 401) {
            return throwError(() => ({
              type: 'auth',
              message: 'No autorizado. Token inválido o expirado.',
            }));
          }

          if (err.status === 403) {
            return throwError(() => ({
              type: 'forbidden',
              message: 'Acceso denegado. Rol no autorizado.',
            }));
          }

          if (err.status === 404) {
            return throwError(() => ({
              type: 'not_found',
              message: 'Cliente no encontrado.',
              details: err.error ?? null,
            }));
          }

          if (err.status === 409) {
            return throwError(() => ({
              type: 'conflict',
              message: 'Conflicto: restricción única (p. ej. CUIT duplicado).',
              details: err.error ?? null,
            }));
          }

          return throwError(() => ({
            type: 'server',
            message: 'Error del servidor. Intente nuevamente más tarde.',
            details: err.error ?? null,
          }));
        })
      );
  }

  // Validaciones locales para UpdateClienteDto
  private validateUpdateClienteLocal(dto: any): any | null {
    if (!dto || typeof dto !== 'object') {
      return { type: 'validation', message: 'Datos de cliente inválidos.' };
    }
    const idCliente = dto.idCliente ?? dto.Id ?? dto.IdCliente ?? dto.id;
    if (!idCliente || Number(idCliente) <= 0) {
      return {
        type: 'validation',
        message: 'IdCliente es requerido y debe ser mayor que 0.',
      };
    }

    const nombre = String(dto.nombre ?? '').trim();
    if (!nombre) {
      return { type: 'validation', message: 'El campo nombre es obligatorio.' };
    }
    if (nombre.length > 200) {
      return {
        type: 'validation',
        message: 'El campo nombre supera los 200 caracteres.',
      };
    }

    if (dto.cuit && String(dto.cuit).length > 11) {
      return { type: 'validation', message: 'CUIT supera los 11 caracteres.' };
    }

    if (dto.telefono && String(dto.telefono).length > 50) {
      return {
        type: 'validation',
        message: 'Teléfono supera los 50 caracteres.',
      };
    }

    if (dto.email) {
      if (String(dto.email).length > 150) {
        return {
          type: 'validation',
          message: 'Email supera los 150 caracteres.',
        };
      }
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(String(dto.email))) {
        return { type: 'validation', message: 'Formato de email inválido.' };
      }
    }

    if (dto.direccion && String(dto.direccion).length > 255) {
      return {
        type: 'validation',
        message: 'Dirección supera los 255 caracteres.',
      };
    }

    // activo puede ser true/false; si viene, asegurarse que sea booleano (no obligatorio)
    if (dto.activo !== undefined && typeof dto.activo !== 'boolean') {
      // intentar normalizar strings 'true'/'false' a boolean
      if (typeof dto.activo === 'string') {
        const lowered = dto.activo.toLowerCase();
        if (lowered === 'true' || lowered === 'false') {
          dto.activo = lowered === 'true';
        } else {
          return {
            type: 'validation',
            message: 'El campo activo debe ser booleano.',
          };
        }
      } else {
        return {
          type: 'validation',
          message: 'El campo activo debe ser booleano.',
        };
      }
    }

    return null;
  }

  /**
   * Alterna el estado activo/inactivo del cliente en el backend.
   * Llama a PATCH /cliente/{id}/toggle-activo
   * No envía body (null).
   */
  toggleActivo(id: number): Observable<any> {
    // Validación local rápida
    if (!id || id <= 0) {
      return throwError(() => new Error('Id inválido. Debe ser mayor que 0.'));
    }

    const url = `${this.baseUrl}/${id}/toggle-activo`;
    return this.http.patch(url, null);
  }

  deleteCliente(id: number): Observable<any> {
    // Validación local rápida
    if (!id || typeof id !== 'number' || id <= 0) {
      return throwError(() => ({
        type: 'validation',
        message: 'Id inválido. Debe ser mayor que 0.',
      }));
    }

    const url = `${this.baseUrl}/${id}`;
    return this.http.delete<any>(url, { observe: 'response' as const }).pipe(
      map((resp) => {
        // 200 OK esperado; devolver body (BaseResponseDto) para el caller
        return resp.body;
      }),
      catchError((err: any) => {
        if (!err || !err.status) {
          return throwError(() => ({
            type: 'network',
            message: 'Error de red o sin respuesta del servidor.',
          }));
        }

        if (err.status === 400) {
          const details = err.error ?? null;
          return throwError(() => ({
            type: 'validation',
            message: 'Solicitud inválida al eliminar el cliente.',
            details,
          }));
        }

        if (err.status === 401) {
          return throwError(() => ({
            type: 'auth',
            message: 'No autorizado. Token inválido o expirado.',
          }));
        }

        if (err.status === 403) {
          return throwError(() => ({
            type: 'forbidden',
            message: 'Acceso denegado. Rol no autorizado.',
          }));
        }

        if (err.status === 404) {
          return throwError(() => ({
            type: 'not_found',
            message: 'Cliente no encontrado.',
            details: err.error ?? null,
          }));
        }

        // Fallback 5xx u otros
        return throwError(() => ({
          type: 'server',
          message: 'Error del servidor al eliminar el cliente.',
          details: err.error ?? null,
        }));
      })
    );
  }

  /**
   * GET /api/Cliente/getClientesCombo
   * Params opcionales: q (string), activo (boolean)
   * Retorna BaseResponseDto con data = array de { idCliente, nombre }
   */
  getClientesCombo(
    q?: string,
    activo?: boolean
  ): Observable<{
    success?: boolean;
    data: Array<{ idCliente: number; nombre: string }>;
    message?: string;
  }> {
    let params = new HttpParams();
    if (q !== undefined && q !== null && String(q).trim() !== '') {
      params = params.set('q', String(q).trim());
    }
    if (activo !== undefined && activo !== null) {
      params = params.set('activo', String(activo));
    }

    const url = `${this.baseUrl}/getClientesCombo`;
    return this.http
      .get<any>(url, { params, observe: 'response' as const })
      .pipe(
        map((resp) => {
          const body = resp.body ?? {};
          // Normalizar distintos posibles formatos de respuesta
          let rawArray: any[] = [];
          if (Array.isArray(body)) {
            rawArray = body;
          } else if (body.data && Array.isArray(body.data)) {
            rawArray = body.data;
          } else if (
            body.data &&
            typeof body.data === 'object' &&
            Array.isArray(body.data.data)
          ) {
            rawArray = body.data.data;
          } else {
            rawArray = [];
          }

          const combos = rawArray.map((it) => ({
            idCliente: Number(it?.idCliente ?? it?.id ?? it?.Id ?? 0),
            nombre: String(
              it?.nombre ?? it?.Nombre ?? it?.razonSocial ?? it?.name ?? ''
            ),
          }));

          return {
            success: body?.success ?? true,
            data: combos,
            message: body?.message ?? null,
          };
        }),
        catchError((err: any) => {
          if (!err || !err.status) {
            return throwError(() => ({
              type: 'network',
              message: 'Error de red o sin respuesta del servidor.',
            }));
          }
          if (err.status === 400) {
            return throwError(() => ({
              type: 'validation',
              message: 'Parámetros inválidos para la búsqueda de clientes.',
              details: err.error ?? null,
            }));
          }
          if (err.status === 401) {
            return throwError(() => ({
              type: 'auth',
              message: 'No autorizado. Token inválido o expirado.',
            }));
          }
          if (err.status === 403) {
            return throwError(() => ({
              type: 'forbidden',
              message: 'Acceso denegado. Rol no autorizado.',
            }));
          }
          return throwError(() => ({
            type: 'server',
            message: 'Error del servidor al obtener clientes para el combo.',
            details: err.error ?? null,
          }));
        })
      );
  }
}

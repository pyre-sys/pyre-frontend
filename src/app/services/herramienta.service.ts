import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class HerramientaService {
  private baseUrl =
    (environment?.apiUrl ? environment.apiUrl : '') + '/Herramienta';

  constructor(private http: HttpClient) { }

  /**
   * Obtiene herramientas paginadas y opcionalmente filtradas.
   * Acepta dos firmas de método:
   * 1. getTools(page, pageSize, searchTerm) - Búsqueda simple con texto
   * 2. getTools(page, pageSize, filters) - Búsqueda avanzada con filtros específicos
   *
   * Ejemplos:
   *   // Búsqueda simple
   *   herramientaService.getTools(1, 10, 'martillo');
   *
   *   // Búsqueda con filtros específicos
   *   herramientaService.getTools(1, 10, { nombre: 'Martillo', estado: true });
   */
  getTools(
    page: number = 1,
    pageSize: number = 10,
    filtersOrSearch?: any
  ): Observable<{ data: any[]; total: number; pagination?: any }> {
    const pagedEndpoint = `${this.baseUrl}/paged`;

    let params = new HttpParams()
      .set('Page', page.toString())
      .set('PageSize', pageSize.toString());

    if (filtersOrSearch) {
      if (typeof filtersOrSearch === 'string') {
        if (filtersOrSearch.trim() !== '') {
          params = params.set('search', filtersOrSearch.trim());
        }
      } else if (typeof filtersOrSearch === 'object') {
        const filters = filtersOrSearch;
        if (filters.codigo && filters.codigo.trim() !== '') {
          params = params.set('codigo', filters.codigo.trim());
        }
        if (filters.nombre && filters.nombre.trim() !== '') {
          params = params.set('nombre', filters.nombre.trim());
        }
        if (filters.marca && filters.marca.trim() !== '') {
          params = params.set('marca', filters.marca.trim());
        }
        if (filters.estado !== undefined) {
          params = params.set('estado', String(filters.estado));
        }
        if (filters.search && filters.search.trim() !== '') {
          params = params.set('search', filters.search.trim());
        }
        // Add disponibilidad filter
        if (filters.idDisponibilidad !== undefined && filters.idDisponibilidad !== null) {
          params = params.set('idDisponibilidad', String(filters.idDisponibilidad));
        }
      }
    }

    return this.http.get<any>(pagedEndpoint, { params }).pipe(
      map((resp) => {
        const body = resp ?? {};

        let dataArray: any[] = [];
        let total = 0;

        if (
          body.data &&
          typeof body.data === 'object' &&
          !Array.isArray(body.data) &&
          body.data.data
        ) {
          const apiData = body.data;
          dataArray = Array.isArray(apiData.data) ? apiData.data : [];
          total = apiData.totalRecords ?? dataArray.length;
        } else if (Array.isArray(body)) {
          dataArray = body;
          total = dataArray.length;
        } else if (body.data && Array.isArray(body.data)) {
          dataArray = body.data;
          total = body.total ?? body.totalRecords ?? dataArray.length;
        } else {
          dataArray = body ?? [];
          total = body?.totalRecords ?? body?.total ?? 0;
        }

        if (Array.isArray(dataArray)) {
          dataArray = dataArray.map((item) => {
            if (item.nombreHerramienta && !item.nombre) {
              item.nombre = item.nombreHerramienta;
            }
            return item;
          });
        }

        return {
          data: dataArray,
          total: total,
          pagination: {
            page: body?.page ?? 1,
            pageSize: body?.pageSize ?? dataArray.length,
            totalRecords: total,
            totalPages:
              body?.totalPages ?? Math.ceil(total / (body?.pageSize ?? 10)),
          },
        };
      }),
      catchError((err) => {
        return of({ data: [], total: 0 });
      })
    );
  }

  getToolById(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}`).pipe(
      tap((response) =>
        console.debug('[HerramientaService] getToolById response:', response)
      ),
      map((response) => {
        // Si la respuesta viene envuelta en un objeto 'data', extraerla
        if (response && typeof response === 'object' && 'data' in response) {
          return response;
        }

        // Si no tiene la estructura esperada, envolverla como si fuera una respuesta estándar
        return { data: response };
      }),
      catchError((error) => {
        console.error('[HerramientaService] Error getting tool by id:', error);
        throw error;
      })
    );
  }

  createTool(data: any): Observable<any> {
    // Asegurarse de que el nombre se envíe como NombreHerramienta
    if (data.Nombre && !data.NombreHerramienta) {
      data.NombreHerramienta = data.Nombre;
      delete data.Nombre;
    }

    console.debug('[HerramientaService] createTool data:', data);
    return this.http.post(`${this.baseUrl}`, data);
  }

  updateTool(id: number, data: any): Observable<any> {
    try {
      // Adaptar el formato de los datos al esperado por el backend
      const adaptedData = this.adaptToolDataForBackend(id, data);
      console.debug(
        '[HerramientaService] updateTool adaptedData:',
        adaptedData
      );

      // Enviar la solicitud con el formato correcto
      return this.http
        .put(`${this.baseUrl}/${id}`, adaptedData, {
          headers: { 'Content-Type': 'application/json' },
        })
        .pipe(
          tap((response) =>
            console.debug('[HerramientaService] updateTool response:', response)
          ),
          catchError((error) => {
            console.error('[HerramientaService] updateTool error:', error);

            // Si la respuesta de error no es un objeto JSON válido, crear uno
            if (error.error && typeof error.error === 'string') {
              try {
                // Intentar parsear como JSON por si acaso
                const jsonError = JSON.parse(error.error);
                throw { ...error, error: jsonError };
              } catch (parseError) {
                // Si no es JSON, crear un objeto de error con el mensaje
                throw {
                  ...error,
                  error: {
                    message: error.error,
                    status: error.status,
                    statusText: error.statusText,
                  },
                };
              }
            }
            throw error;
          })
        );
    } catch (error) {
      console.error(
        '[HerramientaService] Error en la preparación de la solicitud:',
        error
      );
      return throwError(
        () =>
          new Error(
            typeof error === 'string'
              ? error
              : 'Error al preparar la solicitud para actualizar la herramienta'
          )
      );
    }
  }

  /**
   * Adapta los datos del formulario al formato esperado por el backend
   */
  private adaptToolDataForBackend(id: number, formData: any): any {
    let costoDolares = 0;
    if (formData.costoDolares !== null && formData.costoDolares !== undefined) {
      const valorNumerico = parseFloat(formData.costoDolares.toString());
      costoDolares = isNaN(valorNumerico) ? 0 : valorNumerico;
    } else if (
      formData.CostoDolares !== null &&
      formData.CostoDolares !== undefined
    ) {
      const valorNumerico = parseFloat(formData.CostoDolares.toString());
      costoDolares = isNaN(valorNumerico) ? 0 : valorNumerico;
    }

    // Construir payload sin forzar idDisponibilidad ni activo por defecto
    const payload: any = {
      idHerramienta: id,
      codigo: formData.codigo ?? '',
      nombreHerramienta:
        formData.nombreHerramienta ||
        formData.NombreHerramienta ||
        formData.Nombre ||
        formData.nombre ||
        '',
      idFamilia: formData.idFamilia || formData.IdFamilia || 1,
      tipo: formData.tipo || formData.Tipo || '',
      marca: formData.marca || formData.Marca || '',
      serie: formData.serie || formData.Serie || '',
      fechaDeIngreso:
        formData.fechaDeIngreso ||
        formData.FechaDeIngreso ||
        new Date().toISOString(),
      costoDolares: costoDolares,
      ubicacionFisica:
        formData.ubicacionFisica ||
        formData.UbicacionFisica ||
        formData.Ubicacion ||
        formData.ubicacion ||
        '',
      idEstadoFisico:
        formData.EstadoFisico?.idEstadoFisico || formData.idEstadoFisico || 1,
      idPlanta: formData.idPlanta || formData.IdPlanta || 1,
      ubicacion: formData.ubicacion || formData.Ubicacion || '',
      // activo y idDisponibilidad se añaden condicionalmente más abajo
    };

    // Añadir 'activo' solo si viene explícito en formData (evita sobrescribir sin querer)
    if (formData.activo !== undefined) {
      payload.activo = formData.activo;
    } else if (formData.Activo !== undefined) {
      payload.activo = formData.Activo;
    }

    // Añadir idDisponibilidad sólo si se proporciona algún indicio en formData
    const providedDisponibilidad =
      formData.idDisponibilidad !== undefined &&
        formData.idDisponibilidad !== null &&
        formData.idDisponibilidad !== ''
        ? formData.idDisponibilidad
        : formData.IdDisponibilidad !== undefined &&
          formData.IdDisponibilidad !== null &&
          formData.IdDisponibilidad !== ''
          ? formData.IdDisponibilidad
          : formData.disponibilidad ||
          formData.Disponibilidad ||
          formData.estadoDisponibilidad ||
          null;

    if (
      providedDisponibilidad !== null &&
      providedDisponibilidad !== undefined &&
      providedDisponibilidad !== ''
    ) {
      payload.idDisponibilidad = this.mapDisponibilidadToId(
        providedDisponibilidad
      );
    }

    return payload;
  }

  /**
   * Mapea el nombre del estado físico a su ID correspondiente
   */
  private mapEstadoFisicoToId(estadoFisico: string): number {
    const estadoMap: { [key: string]: number } = {
      Excelente: 1,
      Bueno: 2,
      Regular: 3,
      Malo: 4,
      'Muy malo': 5,
    };

    return estadoMap[estadoFisico] || 1; // Por defecto Excelente (1) si no se encuentra
  }

  /**
   * Mapea el nombre de la disponibilidad a su ID correspondiente
   */
  private mapDisponibilidadToId(disponibilidad: any): number {
    // Si nos pasan un número, devolverlo si es válido
    if (
      typeof disponibilidad === 'number' &&
      Number.isInteger(disponibilidad)
    ) {
      const n = disponibilidad as number;
      if (n >= 1 && n <= 5) return n;
    }

    const disponibilidadStr = (disponibilidad ?? '').toString().trim();

    const disponibilidadMap: { [key: string]: number } = {
      Disponible: 1,
      Prestada: 2,
      Mantenimiento: 3,
      Extraviada: 4,
      Bloqueada: 5,
      // Mapeos adicionales para asegurar compatibilidad con diferentes nombres
      'No disponible': 2,
      'En mantenimiento': 3,
      bloqueada: 5,
      bloqueado: 5,
    };

    // Buscar por coincidencia exacta (cuidado con mayúsculas/minúsculas)
    if (disponibilidadMap[disponibilidadStr])
      return disponibilidadMap[disponibilidadStr];

    // Intentar normalizar por contenido (case-insensitive)
    const lower = disponibilidadStr.toLowerCase();
    if (lower.includes('prest')) return 2;
    if (lower.includes('manten')) return 3;
    if (lower.includes('extra')) return 4;
    if (lower.includes('bloque')) return 5;
    if (lower.includes('disp')) return 1;

    return 1; // Por defecto Disponible (1) si no se encuentra
  }

  updateToolStatus(id: number, activo: boolean): Observable<any> {
    const url = `${this.baseUrl}/status`;
    const data = {
      idHerramienta: id,
      activo: activo,
    };

    console.debug('[HerramientaService] updateToolStatus:', { id, activo });

    return this.http
      .put(url, data, {
        headers: { 'Content-Type': 'application/json' },
      })
      .pipe(
        tap((response) =>
          console.debug(
            '[HerramientaService] updateToolStatus response:',
            response
          )
        ),
        catchError((error) => {
          console.error('[HerramientaService] updateToolStatus error:', error);
          throw error;
        })
      );
  }

  deleteTool(id: number): Observable<any> {
    return this.updateToolStatus(id, false); // Cambiamos el estado a inactivo
  }

  /**
   * Elimina lógicamente una herramienta (solo SuperAdmin)
   * Endpoint: DELETE /api/Herramienta/{id}
   */
  deleteToolLogico(id: number): Observable<any> {
    const url = `${this.baseUrl}/${id}`;

    return this.http.delete(url).pipe(
      tap((response) =>
        console.debug('[HerramientaService] deleteToolLogico response:', response)
      ),
      catchError((error) => {
        console.error('[HerramientaService] deleteToolLogico error:', error);
        throw error;
      })
    );
  }

  /**
   * @deprecated Use updateToolStatus instead
   */
  toggleActivo(id: number): Observable<any> {
    console.warn(
      '[HerramientaService] toggleActivo is deprecated, use updateToolStatus instead'
    );
    const url = `${this.baseUrl}/${id}/toggle-activo`;
    return this.http.patch(url, null);
  }

  /**
   * Alterna bloqueo/desbloqueo de la herramienta en el backend.
   * Endpoint: PUT /api/Herramienta/bloqueo/toggle/{id}
   */
  toggleBloqueo(id: number): Observable<any> {
    const url = `${this.baseUrl}/bloqueo/toggle/${id}`;
    console.debug('[HerramientaService] toggleBloqueo:', id);
    return this.http
      .put(url, null, { headers: { 'Content-Type': 'application/json' } })
      .pipe(
        tap((resp) =>
          console.debug('[HerramientaService] toggleBloqueo response:', resp)
        ),
        catchError((err) => {
          console.error('[HerramientaService] toggleBloqueo error:', err);
          throw err;
        })
      );
  }

  // Endpoints adicionales
  getCountHerramientasTotales(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/count-herramientas-totales`);
  }

  getCountHerramientasDisponibles(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/count-herramientas-disponibles`);
  }

  getCountHerramientasEnPrestamo(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/count-herramientas-en-prestamo`);
  }

  getCountHerramientasEnReparacion(): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/count-herramientas-en-reparacion`
    );
  }

  // [HttpGet("disponibilidad/{disponibilidadId}")]
  getHerramientasPorDisponibilidad(disponibilidadId: number): Observable<any> {
    console.debug('[HerramientaService] getHerramientasPorDisponibilidad:', disponibilidadId);
    return this.http.get<any>(
      `${this.baseUrl}/disponibilidad/${disponibilidadId}`
    ).pipe(
      tap((response) =>
        console.debug('[HerramientaService] getHerramientasPorDisponibilidad response:', response)
      ),
      catchError((error) => {
        console.error('[HerramientaService] getHerramientasPorDisponibilidad error:', error);
        throw error;
      })
    );
  }
  // Overload to accept multiple disponibilidad IDs
  getHerramientasPorDisponibilidadArray(
    idDisponibilidad: number[],
    search?: string
  ): Observable<any> {
    const ids = idDisponibilidad.join(',');
    let params = new HttpParams().set('ids', ids);

    if (search && search.trim() !== '') {
      params = params.set('search', search.trim());
    }

    return this.http.get<any>(`${this.baseUrl}/disponibilidad`, { params });
  }

  // [HttpGet("prestamo/usuario/{idUsuarioResponsable}")]
  getHerramientasEnPrestamoByUsuario(
    idUsuarioResponsable: number
  ): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/prestamo/usuario/${idUsuarioResponsable}`
    );
  }

  // [HttpGet("reparacion/proveedor/{idProveedor}")]
  getHerramientasEnReparacionByProveedor(idProveedor: number): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/reparacion/proveedor/${idProveedor}`
    );
  }

  // [HttpGet("estado-fisico/{estadoFisicoId}")]
  getHerramientasPorEstadoFisico(estadoFisicoId: number = 0): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/estado-fisico/${estadoFisicoId}`
    );
  }

  // [HttpGet("count-herramientas-by-estado-fisico/{estadoFisicoId}")]
  getCountHerramientasByEstadoFisico(estadoFisicoId: number): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/count-herramientas-by-estado-fisico/${estadoFisicoId}`
    );
  }

  // [HttpGet("count-herramientas-by-disponibilidad/{disponibilidadId}")]
  getCountHerramientasByDisponibilidad(
    disponibilidadId: number
  ): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/count-herramientas-by-disponibilidad/${disponibilidadId}`
    );
  }

  /**
   * Descarga el reporte de herramientas en formato Excel (XLSX) como Blob.
   * Endpoint: GET /api/Herramienta/reporteHerramientas
   */
  reporteHerramientas(): Observable<Blob> {
    const url = `${this.baseUrl}/reporteHerramientas`;
    console.debug('[HerramientaService] solicitando reporteHerramientas desde', url);
    return this.http.get(url, { responseType: 'blob' }).pipe(
      tap(() => console.debug('[HerramientaService] reporteHerramientas: respuesta recibida')),
      catchError((err) => {
        console.error('[HerramientaService] reporteHerramientas error:', err);
        throw err;
      })
    );
  }

  /**
   * Obtiene el reporte general de herramientas por usuario y proveedor
   * Endpoint: GET /api/Herramienta/herramientas-usuario
   */
  getReporteHerramientasUsuario(): Observable<any> {
    const url = `${this.baseUrl}/herramientas-usuario`;
    console.debug('[HerramientaService] getReporteHerramientasUsuario desde', url);

    return this.http.get<any>(url).pipe(
      tap((response) =>
        console.debug('[HerramientaService] getReporteHerramientasUsuario response:', response)
      ),
      catchError((error) => {
        console.error('[HerramientaService] getReporteHerramientasUsuario error:', error);
        throw error;
      })
    );
  }

}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

interface LoginResponse {
  status: number;
  message: string;
  token: string;
  usuario: {
    Id: number;
    Nombre: string;
    Email: string;
    Dni: string;
    Legajo: string;
    RolId: number;
    RolNombre: string;
    Avatar: string | null;
  };
}

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  private apiUrl = environment.apiUrl || 'http://localhost:1000/api';

  constructor(
    private http: HttpClient
  ) { }

  login(legajo: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { legajo, password });
  }
}

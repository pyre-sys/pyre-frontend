import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PerfilService } from '../../../services/perfil.service';
import { AlertaService } from '../../../services/alerta.service';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ModalPerfilComponent } from '../modal-perfil/modal-perfil.component';

@Component({
  selector: 'app-visor-perfil',
  standalone: true,
  imports: [CommonModule, NgbTooltipModule, ModalPerfilComponent],
  templateUrl: './visor-perfil.component.html',
  styleUrls: ['./visor-perfil.component.css'],
})
export class VisorPerfilComponent implements OnInit, OnDestroy {
  user: any = null;
  isLoading = false;
  showChangePasswordModal = false;

  private routerSub: Subscription | null = null;

  constructor(
    private perfilService: PerfilService,
    private alerta: AlertaService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const id = this.getLoggedUserId();
    if (!id && id !== 0) {
      this.alerta.error('No se pudo determinar el usuario logueado.');
    } else {
      this.loadProfile(id);
    }

    // Re-cargar perfil al navegar a /perfil (por ejemplo, al click en el menú cuando ya estamos en la ruta)
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((ev) => {
        if (ev.urlAfterRedirects === '/perfil') {
          const idReload = this.getLoggedUserId();
          if (idReload || idReload === 0) {
            this.loadProfile(idReload);
          }
        }
      });
  }

  ngOnDestroy(): void {
    if (this.routerSub) {
      this.routerSub.unsubscribe();
      this.routerSub = null;
    }
  }

  private loadProfile(id: number) {
    this.isLoading = true;
    this.perfilService.getMyself(id).subscribe({
      next: (data) => {
        this.isLoading = false;
        if (!data) {
          this.alerta.error('No se obtuvieron datos del perfil.');
          this.user = null;
          return;
        }
        // Si la respuesta vino envuelta en data.data al buscar duplicados
        this.user = data?.data ?? data;
      },
      error: (err) => {
        this.isLoading = false;
        this.alerta.error('Error al cargar el perfil del usuario.');
        this.user = null;
      },
    });
  }

  // Abre modal
  openChangePasswordModal() {
    this.showChangePasswordModal = true;
  }

  // Cierra modal
  closeChangePasswordModal() {
    this.showChangePasswordModal = false;
  }

  // Maneja evento save desde modal
  onChangePassword(payload: { currentPassword: string; newPassword: string }) {
    this.isLoading = true;
    // Llamar al servicio para cambiar la contraseña
    this.perfilService.changePassword(payload).subscribe({
      next: (res) => {
        this.isLoading = false;
        const msg =
          res?.message ?? 'Su contraseña ha sido cambiada exitosamente.';
        this.alerta.success(msg);
        this.closeChangePasswordModal();
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err?.error?.message || 'Error al cambiar contraseña';
        this.alerta.error(msg);
      },
    });
  }

  // Intento de obtener userId desde AuthService (preferred) o desde token/localStorage con varias claves comunes
  private getLoggedUserId(): number | null {
    // 1) Intentar obtener el usuario desde AuthService (si existe)
    try {
      const au = this.authService?.getUser?.();
      if (au) {
        const possibleIds = [
          au.id,
          au.Id,
          au.usuarioId,
          au.usuario_id,
          au.userId,
          au.user_id,
          au.sub,
        ];
        for (const p of possibleIds) {
          if (p !== undefined && p !== null && !Number.isNaN(Number(p))) {
            return Number(p);
          }
        }
      }
    } catch (e) {
      // ignore and fallback
    }

    // 2) Intentar obtener de localStorage con claves frecuentes (user/currentUser/usuario/authUser)
    try {
      const candidates = ['user', 'currentUser', 'usuario', 'authUser'];
      for (const key of candidates) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          const ids = [
            parsed?.id,
            parsed?.Id,
            parsed?.usuarioId,
            parsed?.usuario_id,
            parsed?.userId,
            parsed?.user_id,
          ];
          for (const maybe of ids) {
            if (
              maybe !== undefined &&
              maybe !== null &&
              !Number.isNaN(Number(maybe))
            ) {
              return Number(maybe);
            }
          }
        } catch {
          // if not JSON, consider direct numeric string
          const asNum = Number(raw);
          if (!Number.isNaN(asNum)) return asNum;
        }
      }
    } catch (e) {
      // fallback to token parsing
    }

    // 3) Intentar extraer del JWT (token o access_token) en localStorage
    try {
      const token =
        localStorage.getItem('token') ||
        localStorage.getItem('access_token') ||
        this.authService?.getToken?.();
      if (token) {
        const payload = this.parseJwtPayload(String(token));
        if (payload) {
          const claimKeys = [
            'id',
            'sub',
            'nameid',
            'userId',
            'user_id',
            'usuarioId',
            'usuario_id',
            'Id',
            'Id_usuario',
          ];
          for (const key of claimKeys) {
            const val = payload[key];
            if (
              val !== undefined &&
              val !== null &&
              !Number.isNaN(Number(val))
            ) {
              return Number(val);
            }
          }
        }
      }
    } catch (e) {
      // fallback
    }
    return null;
  }

  // Decodifica payload JWT (soporta base64url padding)
  private parseJwtPayload(token: string): any | null {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      let payload = parts[1];
      // Reemplazar url-safe chars
      payload = payload.replace(/-/g, '+').replace(/_/g, '/');
      // Padding
      const pad = payload.length % 4;
      if (pad === 2) payload += '==';
      else if (pad === 3) payload += '=';
      else if (pad !== 0) payload += '===';

      const decoded = atob(payload);
      // atob devuelve una cadena de bytes; convertir a string UTF-8
      try {
        // decodeURIComponent(escape()) es compatible con atob output to UTF8
        const json = decodeURIComponent(
          decoded
            .split('')
            .map((c) => {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            })
            .join('')
        );
        return JSON.parse(json);
      } catch (e) {
        // si falla el decode to utf-8, intentar parse directo
        return JSON.parse(decoded);
      }
    } catch (e) {
      return null;
    }
  }
}

import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { Roles } from './shared/enums/roles';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadChildren: () =>
      import('./pages/auth/login.routes').then((m) => m.loginRoutes),
  },
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./pages/dashboard/dashboard.routes').then(
        (m) => m.dashboardRoutes
      ),
    canActivate: [authGuard],
  },
  {
    path: 'herramienta',
    loadChildren: () =>
      import('./pages/herramienta/herramienta.routes').then(
        (m) => m.herramientaRoutes
      ),
    canActivate: [authGuard],
  },
  {
    path: 'movimientos',
    loadChildren: () =>
      import('./pages/movimientos/movimientos.routes').then(
        (m) => m.movimientosRoutes
      ),
    canActivate: [authGuard],
  },
  {
    path: 'perfil',
    loadChildren: () =>
      import('./pages/perfil/perfil.routes').then((m) => m.perfilRoutes),
    canActivate: [authGuard],
    data: { requiredAccess: [2, 3, 4] }, // Permitir acceso a roles distintos de SuperAdmin (ajusta si tu enum usa otros ids)
  },
  {
    path: 'user',
    loadChildren: () =>
      import('./pages/usuario/user.routes').then((m) => m.userRoutes),
    canActivate: [authGuard],
    data: { requiredAccess: [1, 2, 3, 4] }, // Todos los roles pueden acceder
  },
  {
    path: 'reportes',
    loadChildren: () =>
      import('./pages/reportes/reportes.routes').then((m) => m.reportesRoutes),
    canActivate: [authGuard],
    data: { requiredAccess: [Roles.SuperAdmin, Roles.Administrador] }, // SuperAdmin y Administrador pueden entrar al módulo de reportes
  },
  {
    path: 'recursos',
    loadChildren: () =>
      import('./pages/recursos/recursos.routes').then((m) => m.recursosRoutes),
  },
  {
    path: 'acceso-denegado',
    loadComponent: () =>
      import('./shared/components/access-denied/access-denied.component').then(
        (m) => m.AccessDeniedComponent
      ),
  },
  // Redirección por defecto para rutas no encontradas
  { path: '**', redirectTo: '/login' },
];

import { Routes } from '@angular/router';
import { Roles } from '../../shared/enums/roles';

export const reportesRoutes: Routes = [
  {
    path: '',
    redirectTo: 'estado',
    pathMatch: 'full'
  },
  {
    path: 'estado',
    loadComponent: () => import('./estado/estado.component').then(m => m.EstadoComponent),
    data: { requiredAccess: [Roles.SuperAdmin, Roles.Operario, Roles.Supervisor, Roles.Administrativo] }
  },
  {
    path: 'stock',
    loadComponent: () => import('./stock/stock.component').then(m => m.StockComponent),
    data: { requiredAccess: [Roles.SuperAdmin, Roles.Operario, Roles.Supervisor, Roles.Administrativo] }
  },
  {
    path: 'operario',
    loadComponent: () => import('./operario/operario.component').then(m => m.OperarioComponent),
    data: { requiredAccess: [Roles.SuperAdmin, Roles.Operario, Roles.Supervisor, Roles.Administrativo] }
  },
  {
    path: 'disponibilidad',
    loadComponent: () => import('./disponibilidad/disponibilidad.component').then(m => m.DisponibilidadComponent),
    data: { requiredAccess: [Roles.SuperAdmin, Roles.Operario, Roles.Supervisor, Roles.Administrativo] }
  }
];

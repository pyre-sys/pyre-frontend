import { Routes } from '@angular/router';
import { Roles } from '../../shared/enums/roles';

export const reportesRoutes: Routes = [
  {
    path: '',
    redirectTo: 'estado',
    pathMatch: 'full',
  },
  {
    path: 'estado',
    loadComponent: () =>
      import('./estado/estado.component').then((m) => m.EstadoComponent),
    data: {
      requiredAccess: [
        Roles.SuperAdmin,
        Roles.Operario,
        Roles.Supervisor,
        Roles.Administrativo,
      ],
    },
  },
  {
    path: 'valorizacion',
    loadComponent: () =>
      import('./valorizacion/valorizacion.component').then(
        (m) => m.ValorizacionComponent
      ),
    data: {
      requiredAccess: [
        Roles.SuperAdmin,
        Roles.Operario,
        Roles.Supervisor,
        Roles.Administrativo,
      ],
    },
  },
  {
    path: 'disponibilidad',
    loadComponent: () =>
      import('./disponibilidad/disponibilidad.component').then(
        (m) => m.DisponibilidadComponent
      ),
    data: {
      requiredAccess: [
        Roles.SuperAdmin,
        Roles.Operario,
        Roles.Supervisor,
        Roles.Administrativo,
      ],
    },
  },
  {
    path: 'herramientas-usuario',
    loadComponent: () =>
      import('./herramienta-usuario/herramienta-usuario.component').then(
        (m) => m.HerramientaUsuarioComponent
      ),
    data: {
      requiredAccess: [
        Roles.SuperAdmin,
        Roles.Operario,
        Roles.Supervisor,
        Roles.Administrativo,
      ],
    },
  },
];

import { Routes } from '@angular/router';
import { Roles } from '../../shared/enums/roles';

export const recursosRoutes: Routes = [
  {
    path: '',
    redirectTo: 'proveedores',
    pathMatch: 'full',
  },
  {
    path: 'proveedores',
    loadComponent: () =>
      import(
        './proveedores/visor-proveedores/visor-proveedores.component'
      ).then((m) => m.VisorProveedoresComponent),
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
    path: 'clientes',
    loadComponent: () =>
      import('./clientes/visor-clientes/visor-clientes.component').then(
        (m) => m.VisorClientesComponent
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
    path: 'obras',
    loadComponent: () =>
      import('./obras/visor-obras/visor-obras.component').then(
        (m) => m.VisorObrasComponent
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

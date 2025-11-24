import { Routes } from '@angular/router';

export const perfilRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./visor-perfil/visor-perfil.component').then(
            (m) => m.VisorPerfilComponent
          ),
      },
    ],
  },
];

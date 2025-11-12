import { Routes } from '@angular/router';

// Rutas para la sección "Rutinas"
export const loginRoutes: Routes = [
    { path: 'login', loadComponent: () => import('./login/login.component').then(m => m.LoginComponent) }
];

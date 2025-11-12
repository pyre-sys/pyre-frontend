import { Routes } from '@angular/router';

// Rutas para la sección "Login"
export const loginRoutes: Routes = [
    { path: '', loadComponent: () => import('./login/login.component').then(m => m.LoginComponent) }
];

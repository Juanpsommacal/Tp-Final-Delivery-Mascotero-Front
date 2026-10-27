import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { ProductosList } from './pages/productos-list/productos-list';
import { Login } from './pages/login/login';
import { authGuard } from './guards/auth-guard';
import { ProductosForm } from './pages/productos-form/productos-form';
import { adminGuard } from './guards/admin-guard';

export const routes: Routes = [
    {path: '', component: Home},
    {path: 'login', component: Login},
    {path: 'productos', component: ProductosList, canActivate: [authGuard] },
    {path: 'productos/nuevo', component: ProductosForm, canActivate: [adminGuard] },
    {path: '**', redirectTo: ''}
];

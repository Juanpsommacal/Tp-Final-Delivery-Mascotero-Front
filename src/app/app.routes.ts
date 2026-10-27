import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { ProductosList } from './pages/productos-list/productos-list';
import { Login } from './pages/login/login';
import { authGuard } from './guards/auth-guard';
import { ProductosForm } from './pages/productos-form/productos-form';
import { adminGuard } from './guards/admin-guard';
import { ProductoDetails } from './pages/producto-details/producto-details';
import { Registro } from './pages/registro/registro';

export const routes: Routes = [
    {path: '', component: Home},
    {path: 'login', component: Login},
    {path: 'registro', component: Registro},
    {path: 'productos', component: ProductosList, canActivate: [authGuard] },
    {path: 'productos/nuevo', component: ProductosForm, canActivate: [authGuard] },
    {path: 'productos/:tipo/:id', component: ProductoDetails, canActivate: [authGuard] },
    {path: 'productos/:tipo/:id/editar', component: ProductosForm, canActivate: [adminGuard] },
    {path: '**', redirectTo: ''}
];

import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { authGuard } from './guards/auth-guard';
import { adminGuard } from './guards/admin-guard';
import { Registro } from './pages/registro/registro';
import { ProductosList } from './pages/Productos/productos-list/productos-list';
import { ProductosForm } from './pages/Productos/productos-form/productos-form';
import { ProductoDetails } from './pages/Productos/producto-details/producto-details';
import { ClientesList } from './pages/Clientes/clientes-list/clientes-list';
import { ClienteDetails } from './pages/Clientes/cliente-details/cliente-details';
import { ClientesForm } from './pages/Clientes/clientes-form/clientes-form';
import { ProveedoresList } from './pages/proveedores-list/proveedores-list';
import { ProveedoresForm } from './pages/proveedores-form/proveedores-form';
import { OfertaList } from './pages/Oferta/oferta-list/oferta-list';
import { OfertasForm } from './pages/Oferta/ofertas-form/ofertas-form';
import { OfertaDetails } from './pages/Oferta/oferta-details/oferta-details';


export const routes: Routes = [
    {path: '', component: Home},
    {path: 'login', component: Login},
    {path: 'registro', component: Registro},
    {path: 'productos', component: ProductosList, canActivate: [authGuard] },
    {path: 'productos/nuevo', component: ProductosForm, canActivate: [authGuard] },
    {path: 'productos/:tipo/:id', component: ProductoDetails, canActivate: [authGuard] },
    {path: 'productos/:tipo/:id/editar', component: ProductosForm, canActivate: [adminGuard] },
    {path: 'clientes', component: ClientesList, canActivate: [authGuard]},
    {path: 'clientes/nuevo', component: ClientesForm, canActivate: [authGuard]},
    {path: 'clientes/:id', component: ClienteDetails, canActivate: [authGuard]},
    {path: 'clientes/editar/:id', component: ClientesForm, canActivate: [authGuard]},
    {path: 'proveedores', component: ProveedoresList,canActivate: [authGuard]},
    {path: 'proveedores/nuevo', component: ProveedoresForm,canActivate: [authGuard]},
    {path: 'proveedores/:id/editar', component: ProveedoresForm,canActivate: [authGuard]},
    {path: 'ofertas', component: OfertaList, canActivate: [authGuard]},
    {path: 'ofertas/nueva', component: OfertasForm, canActivate: [authGuard]},
    {path: 'ofertas/:id', component: OfertaDetails, canActivate: [authGuard]},
    {path: 'ofertas/:id/editar', component: OfertasForm, canActivate: [authGuard]},
    {path: 'ofertas/editar/:id', component: OfertasForm, canActivate: [authGuard]},
    {path: '**', redirectTo: ''}
];

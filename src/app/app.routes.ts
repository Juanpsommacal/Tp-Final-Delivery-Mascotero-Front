import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { authGuard } from './guards/auth-guard';
import { adminGuard } from './guards/admin-guard';
import { Registro } from './pages/registro/registro';
import { ProductosList } from './pages/productos/productos-list/productos-list';
import { ProductosForm } from './pages/productos/productos-form/productos-form';
import { ProductoDetails } from './pages/productos/producto-details/producto-details';
import { ClientesList } from './pages/clientes/clientes-list/clientes-list';
import { ClienteDetails } from './pages/clientes/cliente-details/cliente-details';
import { ClientesForm } from './pages/clientes/clientes-form/clientes-form';
import { ProveedoresList } from './pages/proveedores-list/proveedores-list';
import { ProveedoresForm } from './pages/proveedores-form/proveedores-form';
import { OfertaList } from './pages/oferta/oferta-list/oferta-list';
import { OfertasForm } from './pages/oferta/ofertas-form/ofertas-form';
import { OfertaDetails } from './pages/oferta/oferta-details/oferta-details';
import { PedidosList } from './pages/pedidos/pedidos-list/pedidos-list';
import { PedidosForm } from './pages/pedidos/pedidos-form/pedidos-form';
import { PedidoDetails } from './pages/pedidos/pedido-details/pedido-details';
import { PagosList } from './pages/pagos/pagos-list/pagos-list';
import { ComprasList } from './pages/compras/compras-list/compras-list';
import { ComprasForm } from './pages/compras/compras-form/compras-form';
import { CompraDetails } from './pages/compras/compra-details/compra-details';
import { Reportes } from './pages/reportes/reportes';


export const routes: Routes = [
    {path: '', component: Home, canActivate: [authGuard]},
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
    {path: 'pedidos', component: PedidosList, canActivate: [authGuard]},
    {path: 'pedidos/nuevo', component: PedidosForm, canActivate: [authGuard]},
    {path: 'pedidos/:id', component: PedidoDetails, canActivate: [authGuard]},
    {path: 'pagos', component: PagosList, canActivate: [authGuard]},
    {path: 'compras', component: ComprasList, canActivate: [authGuard]},
    {path: 'compras/nueva', component: ComprasForm, canActivate: [authGuard]},
    {path: 'compras/:id', component: CompraDetails, canActivate: [authGuard]},
    {path: 'reportes', component: Reportes, canActivate: [adminGuard]},
    {path: '**', redirectTo: ''}
];

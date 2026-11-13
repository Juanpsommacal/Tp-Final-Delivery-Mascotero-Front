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
import { UsuariosList } from './pages/usuarios/usuarios-list/usuarios-list';
import { Reparto } from './pages/reparto/reparto';


export const routes: Routes = [
    {path: '', title: 'Inicio', component: Home, canActivate: [authGuard]},
    {path: 'login', title: 'Iniciar sesión', component: Login},
    {path: 'registro', title: 'Crear cuenta', component: Registro},
    {path: 'productos', title: 'Productos', component: ProductosList, canActivate: [authGuard] },
    {path: 'productos/nuevo', title: 'Nuevo producto', component: ProductosForm, canActivate: [authGuard] },
    {path: 'productos/:tipo/:id', title: 'Producto', component: ProductoDetails, canActivate: [authGuard] },
    {path: 'productos/:tipo/:id/editar', title: 'Editar producto', component: ProductosForm, canActivate: [adminGuard] },
    {path: 'clientes', title: 'Clientes', component: ClientesList, canActivate: [authGuard]},
    {path: 'clientes/nuevo', title: 'Nuevo cliente', component: ClientesForm, canActivate: [authGuard]},
    {path: 'clientes/:id', title: 'Cliente', component: ClienteDetails, canActivate: [authGuard]},
    {path: 'clientes/editar/:id', title: 'Editar cliente', component: ClientesForm, canActivate: [authGuard]},
    {path: 'proveedores', title: 'Proveedores', component: ProveedoresList,canActivate: [authGuard]},
    {path: 'proveedores/nuevo', title: 'Nuevo proveedor', component: ProveedoresForm,canActivate: [authGuard]},
    {path: 'proveedores/:id/editar', title: 'Editar proveedor', component: ProveedoresForm,canActivate: [authGuard]},
    {path: 'ofertas', title: 'Ofertas', component: OfertaList, canActivate: [authGuard]},
    {path: 'ofertas/nueva', title: 'Nueva oferta', component: OfertasForm, canActivate: [authGuard]},
    {path: 'ofertas/:id', title: 'Oferta', component: OfertaDetails, canActivate: [authGuard]},
    {path: 'ofertas/:id/editar', title: 'Editar oferta', component: OfertasForm, canActivate: [authGuard]},
    {path: 'pedidos', title: 'Pedidos', component: PedidosList, canActivate: [authGuard]},
    {path: 'pedidos/nuevo', title: 'Nuevo pedido', component: PedidosForm, canActivate: [authGuard]},
    {path: 'pedidos/:id', title: 'Pedido', component: PedidoDetails, canActivate: [authGuard]},
    {path: 'reparto', title: 'Reparto', component: Reparto, canActivate: [authGuard]},
    {path: 'pagos', title: 'Pagos', component: PagosList, canActivate: [authGuard]},
    {path: 'compras', title: 'Compras', component: ComprasList, canActivate: [authGuard]},
    {path: 'compras/nueva', title: 'Nueva compra', component: ComprasForm, canActivate: [authGuard]},
    {path: 'compras/:id', title: 'Compra', component: CompraDetails, canActivate: [authGuard]},
    {path: 'reportes', title: 'Reportes', component: Reportes, canActivate: [adminGuard]},
    {path: 'usuarios', component: UsuariosList, canActivate: [adminGuard]},
    {path: '**', redirectTo: ''}
];

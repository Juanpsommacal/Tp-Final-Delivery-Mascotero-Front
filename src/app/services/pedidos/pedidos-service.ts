import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '../../../environments/environment';
import Pedido, { FaltanteProducto, PedidoRequest } from '../../models/Pedido';
import { EstadoPago, EstadoPedido } from '../../models/Enums';
import { parametros } from '../../utils/http-util';
import Pagina, { ConsultaPagina } from '../../models/Pagina';

export type PaginaPedidos = Pagina<Pedido> & { saldoFiltrado: number }

export interface FiltrosPedidos {
    q: string
    estado: EstadoPedido | ''
    filtroPago: EstadoPago | 'CON_DEUDA' | ''
    cancelados: boolean
    // Vacío o sin definir = sin límite de ese lado
    desde?: string
    hasta?: string
}

@Service()
export class PedidosService {

    private http = inject(HttpClient)
    private url = `${environment.apiUrl}/pedidos`

    getPedidosDeCliente(clienteId: string | number) {
        return this.http.get<Pedido[]>(`${this.url}/cliente/${clienteId}`)
    }

    getPagina(consulta: ConsultaPagina, { q, estado, filtroPago, cancelados, desde, hasta }: FiltrosPedidos) {
        const params = parametros({
            ...consulta, q, estado, cancelados, desde, hasta,
            conDeuda: filtroPago === 'CON_DEUDA',
            estadoPago: filtroPago === 'CON_DEUDA' ? '' : filtroPago,
        })
        return this.http.get<PaginaPedidos>(`${this.url}/pagina`, { params })
    }

    getPedidoById(id: string | number) {
        return this.http.get<Pedido>(`${this.url}/${id}`)
    }

    createPedido(pedido: PedidoRequest) {
        return this.http.post<Pedido>(this.url, pedido)
    }

    // En el back el DELETE no borra: pasa el pedido a CANCELADO y devuelve el stock
    cancelarPedido(id: string | number) {
        return this.http.delete<void>(`${this.url}/${id}`)
    }

    // Guarda que se le mandó al cliente un recordatorio del saldo por WhatsApp
    registrarRecordatorio(id: string | number) {
        return this.http.patch<Pedido>(`${this.url}/${id}/recordatorio`, null)
    }

    getContadores() {
        return this.http.get<Record<EstadoPedido, number>>(`${this.url}/contadores`)
    }

    // Lo que hay que conseguir para completar los pedidos en espera
    getFaltantes() {
        return this.http.get<FaltanteProducto[]>(`${this.url}/faltantes`)
    }

    getReparto(fecha: string) {
        return this.http.get<Pedido[]>(`${this.url}/reparto`, { params: { fecha } })
    }

    guardarOrdenReparto(pedidoIds: number[]) {
        return this.http.put<void>(`${this.url}/reparto/orden`, { pedidoIds })
    }

    // Llegó la mercadería: reserva el stock y el pedido queda listo para coordinar
    confirmarMercaderia(id: string | number) {
        return this.http.patch<Pedido>(`${this.url}/${id}/mercaderia`, null)
    }

    programarEntrega(id: string | number, fechaEntrega: string) {
        return this.http.patch<Pedido>(`${this.url}/${id}/programar`, { fechaEntrega })
    }

    volverACoordinar(id: string | number) {
        return this.http.patch<Pedido>(`${this.url}/${id}/a-coordinar`, null)
    }

    entregarPedido(id: string | number) {
        return this.http.patch<Pedido>(`${this.url}/${id}/entregar`, null)
    }

}

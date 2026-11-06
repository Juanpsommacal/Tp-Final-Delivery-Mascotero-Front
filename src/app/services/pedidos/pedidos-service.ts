import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '../../../environments/environment';
import Pedido, { PedidoRequest } from '../../models/Pedido';

@Service()
export class PedidosService {

    private http = inject(HttpClient)
    private url = `${environment.apiUrl}/pedidos`

    getAllPedidos() {
        return this.http.get<Pedido[]>(this.url)
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

    entregarPedido(id: string | number) {
        return this.http.patch<Pedido>(`${this.url}/${id}/entregar`, null)
    }

}

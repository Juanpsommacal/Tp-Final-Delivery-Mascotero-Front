import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import Cliente, { ClienteRequest } from '../../models/Cliente';
import { parametros } from '../../utils/http-util';
import Pagina, { ConsultaPagina } from '../../models/Pagina';

export interface FilaCliente {
    cliente: Cliente
    pedidos: number
    deuda: number
    // Fecha (yyyy-MM-dd) e id del último pedido no cancelado; null si nunca pidió
    ultimoPedido: string | null
    ultimoPedidoId: number | null
}
import { DireccionRequest } from '../../models/Direccion';
import { environment } from '../../../environments/environment';

@Service()
export class ClientesService {

    private http = inject(HttpClient)
    private url = `${environment.apiUrl}/clientes`

    getPagina(consulta: ConsultaPagina, q: string, conDeuda: boolean) {
        return this.http.get<Pagina<FilaCliente>>(`${this.url}/pagina`, { params: parametros({ ...consulta, q, conDeuda }) })
    }

    getClienteById(id: string) {
        return this.http.get<Cliente>(`${this.url}/${id}`)
    }

    createCliente(cliente: ClienteRequest) {
        return this.http.post<Cliente>(this.url, cliente)
    }

    updateCliente(id: string, cliente: ClienteRequest) {
        return this.http.patch<Cliente>(`${this.url}/${id}`, cliente)
    }

    deleteCliente(id: string) {
        return this.http.delete<void>(`${this.url}/${id}`)
    }
    

    addDireccion(clienteId: string, direccion: DireccionRequest) {
        return this.http.post<Cliente>(`${this.url}/${clienteId}/direcciones`, direccion)
    }

    // Asocia una direccion que ya existe en la BDD (por ejemplo, la de otro cliente que vive en el mismo lugar)
    asociarDireccionExistente(clienteId: string, direccionId: string) {
        return this.http.post<Cliente>(`${this.url}/${clienteId}/direcciones/${direccionId}`, null)
    }

    removeDireccion(clienteId: string, direccionId: string) {
        return this.http.delete<Cliente>(`${this.url}/${clienteId}/direcciones/${direccionId}`)
    }

}

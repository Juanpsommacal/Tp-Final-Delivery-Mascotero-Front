import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import Cliente, { ClienteRequest } from '../../models/Cliente';
import { DireccionRequest } from '../../models/Direccion';
import { HtmlTagDefinition } from '@angular/compiler';

@Service()
export class ClientesService {

    private http = inject(HttpClient)
    private url = 'http://localhost:8080/api/clientes'

    getAllClientes() {
        return this.http.get<Cliente[]>(this.url)
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

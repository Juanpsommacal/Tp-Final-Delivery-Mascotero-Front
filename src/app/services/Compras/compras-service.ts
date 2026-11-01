import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '../../../environments/environment';
import Compra, { CompraRequest } from '../../models/Compra';

@Service()
export class ComprasService {

    private http = inject(HttpClient)
    private url = `${environment.apiUrl}/compras`

    getAllCompras() {
        return this.http.get<Compra[]>(this.url)
    }

    getCompraById(id: string | number) {
        return this.http.get<Compra>(`${this.url}/${id}`)
    }

    createCompra(compra: CompraRequest) {
        return this.http.post<Compra>(this.url, compra)
    }

    // Recibir es lo que suma la cantidad comprada al stock de cada producto
    recibirCompra(id: string | number) {
        return this.http.patch<Compra>(`${this.url}/${id}/recibir`, null)
    }

    // Solo compras pendientes. No toca el stock porque todavia no se habia sumado
    cancelarCompra(id: string | number) {
        return this.http.patch<Compra>(`${this.url}/${id}/cancelar`, null)
    }

}

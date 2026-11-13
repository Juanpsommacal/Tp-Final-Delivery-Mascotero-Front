import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '../../../environments/environment';
import Compra, { CompraRequest } from '../../models/Compra';
import { parametros } from '../../utils/http-util';
import Pagina, { ConsultaPagina } from '../../models/Pagina';

export type PaginaCompras = Pagina<Compra> & { totalPendiente: number }

@Service()
export class ComprasService {

    private http = inject(HttpClient)
    private url = `${environment.apiUrl}/compras`

    // Último precio pagado por cada producto, para sugerirlo en una compra nueva
    getUltimosPrecios() {
        return this.http.get<{ productoId: number, precioUnitario: number }[]>(`${this.url}/ultimos-precios`)
    }

    getProductosDeProveedor(proveedorId: string | number) {
        return this.http.get<number[]>(`${this.url}/proveedor/${proveedorId}/productos`)
    }

    getPagina(consulta: ConsultaPagina, filtros: { q: string, estado: string, canceladas: boolean }) {
        return this.http.get<PaginaCompras>(`${this.url}/pagina`, { params: parametros({ ...consulta, ...filtros }) })
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

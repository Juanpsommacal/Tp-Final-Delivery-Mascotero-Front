import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '../../../environments/environment';
import Pago, { PagoRequest } from '../../models/Pago';

// Los pagos no se editan ni se borran: son registros de plata
@Service()
export class PagosService {

    private http = inject(HttpClient)
    private url = `${environment.apiUrl}/pagos`

    getAllPagos() {
        return this.http.get<Pago[]>(this.url)
    }

    getPagosByCliente(clienteId: string | number) {
        return this.http.get<Pago[]>(`${this.url}/cliente/${clienteId}`)
    }

    createPago(pago: PagoRequest) {
        return this.http.post<Pago>(this.url, pago)
    }

}

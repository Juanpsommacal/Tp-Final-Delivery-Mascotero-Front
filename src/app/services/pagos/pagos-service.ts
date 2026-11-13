import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '../../../environments/environment';
import Pago, { PagoRequest } from '../../models/Pago';
import { parametros } from '../../utils/http-util';
import Pagina, { ConsultaPagina } from '../../models/Pagina';
import { MetodoPago } from '../../models/Enums';

export type PaginaPagos = Pagina<Pago> & {
    totalFiltrado: number
    totalPorMetodo: { metodo: MetodoPago, total: number }[]
}

// Los pagos no se editan ni se borran: son registros de plata
@Service()
export class PagosService {

    private http = inject(HttpClient)
    private url = `${environment.apiUrl}/pagos`

    // metodos: null = todos; "" = ninguno elegido, y el back devuelve vacío
    getPagina(consulta: ConsultaPagina, { metodos, ...filtros }: { q: string, desde: string, hasta: string, metodos: string | null }) {
        let params = parametros({ ...consulta, ...filtros })
        if (metodos !== null) params = params.set('metodos', metodos)
        return this.http.get<PaginaPagos>(`${this.url}/pagina`, { params })
    }

    createPago(pago: PagoRequest) {
        return this.http.post<Pago>(this.url, pago)
    }

}

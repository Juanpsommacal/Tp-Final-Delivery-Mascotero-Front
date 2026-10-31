import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Oferta, OfertaDetalle, OfertaRequest } from '../../models/Oferta';

@Service()
export class OfertasService {

    private http = inject(HttpClient);
    private url = `${environment.apiUrl}/ofertas`;

    getAllOfertas() {
        return this.http.get<Oferta[]>(this.url);
    }

    getOfertaById(id: string | number) {
        return this.http.get<OfertaDetalle>(`${this.url}/${id}`);
    }

    createOferta(oferta: OfertaRequest) {
        return this.http.post<Oferta>(this.url, oferta);
    }

    updateOferta(id: string | number, oferta: OfertaRequest) {
        return this.http.put<Oferta>(`${this.url}/${id}`, oferta);
    }

    deleteOferta(id: string | number) {
        return this.http.delete<void>(`${this.url}/${id}`);
    }

    removerProductoDeOferta(ofertaId: string | number, productoId: string | number) {
        return this.http.patch<OfertaDetalle | void>(
            `${this.url}/${ofertaId}/producto/${productoId}/remove`,
            null
        );
    }

    agregarProductoAOferta(ofertaId: string | number, productoId: string | number) {
        return this.http.patch<OfertaDetalle | void>(
            `${this.url}/${ofertaId}/producto/${productoId}`,
            null
        );
    }

}

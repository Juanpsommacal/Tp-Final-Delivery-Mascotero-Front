import { inject, Service } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Proveedor, ProveedorRequest } from '../../models/Proveedor';

@Service()
export class ProveedoresService {

    private http = inject(HttpClient);
    private url = `${environment.apiUrl}/proveedores`;

    getAll() {
        return this.http.get<Proveedor[]>(this.url);
    }

    getById(id: string) {
        return this.http.get<Proveedor>(`${this.url}/${id}`);
    }

    create(proveedor: ProveedorRequest) {
        return this.http.post<Proveedor>(this.url, proveedor);
    }

    update(id: string, proveedor: ProveedorRequest) {
        return this.http.patch<Proveedor>(`${this.url}/${id}`, proveedor);
    }

    delete(id: string) {
        return this.http.delete<void>(`${this.url}/${id}`);
    }
}

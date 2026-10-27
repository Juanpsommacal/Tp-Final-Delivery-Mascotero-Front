import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import Producto from '../models/Producto';

@Service()
export class ProductosService {

    private http = inject(HttpClient);
    private url = 'http://localhost:8080/api/productos';

    getAllProductos() {
        return this.http.get<Producto[]>(this.url)
    }

    deleteProducto(id: string) {
        return this.http.delete<void>(`${this.url}/${id}`);
    }

}

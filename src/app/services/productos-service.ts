import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import Producto from '../models/Producto';
import Alimento from '../models/Alimento';
import Antipulgas from '../models/Antipulgas';
import { TipoProducto } from '../models/Enums';

export type ProductoDetalle = Alimento | Antipulgas
export type ProductoRequest = Omit<Alimento, 'id' | 'precioOferta'> | Omit<Antipulgas, 'id' | 'precioOferta'>

@Service()
export class ProductosService {

    private http = inject(HttpClient);
    private url = 'http://localhost:8080/api';

    // El listado es general, pero el resto del CRUD va al endpoint de cada tipo
    private endpoints: Record<TipoProducto, string> = {
        ALIMENTO: 'alimentos',
        ANTIPULGAS: 'antipulgas'
    }

    private urlDe(tipo: TipoProducto) {
        return `${this.url}/${this.endpoints[tipo]}`
    }

    getAllProductos() {
        return this.http.get<Producto[]>(`${this.url}/productos`)
    }

    getProductoById(tipo: TipoProducto, id: number) {
        return this.http.get<ProductoDetalle>(`${this.urlDe(tipo)}/${id}`)
    }

    createProducto(tipo: TipoProducto, producto: ProductoRequest) {
        return this.http.post<ProductoDetalle>(this.urlDe(tipo), producto)
    }

    updateProducto(tipo: TipoProducto, id: number, producto: ProductoRequest) {
        return this.http.patch<ProductoDetalle>(`${this.urlDe(tipo)}/${id}`, producto)
    }

    deleteProducto(tipo: TipoProducto, id: number) {
        return this.http.delete<void>(`${this.urlDe(tipo)}/${id}`);
    }

}

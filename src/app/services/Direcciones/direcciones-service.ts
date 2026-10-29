import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '../../../environments/environment';
import Direccion from '../../models/Direccion';

@Service()
export class DireccionesService {

    private http = inject(HttpClient)
    private url = `${environment.apiUrl}/direcciones`

    getAll() {
        return this.http.get<Direccion[]>(this.url)
    }

}

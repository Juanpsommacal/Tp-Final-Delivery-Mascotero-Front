import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Usuario } from '../../models/Usuario';

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/usuarios`;

  getUsuarios() {
    return this.http.get<Usuario[]>(this.url);
  }

  getUsuario(id: number) {
    return this.http.get<Usuario>(`${this.url}/${id}`);
  }

  elevateRole(id: number) {
    return this.http.patch<Usuario>(`${this.url}/elevate/${id}`, {});
  }

  revokeRole(id: number) {
    return this.http.patch<Usuario>(`${this.url}/revoke/${id}`, {});
  }

  activateUser(id: number) {
    return this.http.patch<Usuario>(`${this.url}/activate/${id}`, {});
  }

  deactivateUser(id: number) {
    return this.http.patch<Usuario>(`${this.url}/deactivate/${id}`, {});
  }
}


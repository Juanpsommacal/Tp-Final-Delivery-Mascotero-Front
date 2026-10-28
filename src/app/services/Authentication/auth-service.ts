import { HttpClient } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

interface LoginRequest {
    email: string
    password: string
}

interface LoginResponse {
    token: string
}

interface RegisterRequest {
    nombre: string
    apellido: string
    email: string
    password: string
}

@Service()
export class AuthService {

    private http = inject(HttpClient)
    private router = inject(Router)
    private url = 'http://localhost:8080/api/auth'
    
    private token = signal<string | null>(localStorage.getItem('token'))
    readonly logueado = computed(() => this.token() !== null)

    login(datos: LoginRequest) {
        return this.http.post<LoginResponse>(`${this.url}/login`, datos).pipe(
            tap(respuesta => {
                localStorage.setItem('token', respuesta.token)
                this.token.set(respuesta.token)
            })
        )
    }

    register(datos: RegisterRequest) {
        return this.http.post(`${this.url}/register`, datos)
    }

    getToken(): string | null {
        return this.token();
    }

    limpiarSesion() {
        localStorage.removeItem('token')
        this.token.set(null)
    }

    logout() {
        this.limpiarSesion()
        this.router.navigate(['/login'])
    }

    private leerPayload(): { exp?: number; role?: string[] } | null {
        const token = this.token();
    
        if (!token) return null;
    
        try {
            const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            return JSON.parse(atob(base64));
        } catch (e) {
            return null;
        }
    }

    tokenVigente(): boolean {
        const payload = this.leerPayload();
        return !!payload?.exp && payload.exp * 1000 > Date.now();
    }

    tieneRol(rol: 'ADMIN' | 'USER'): boolean {
        return this.leerPayload()?.role?.includes(`ROLE_${rol}`) ?? false
    }


}

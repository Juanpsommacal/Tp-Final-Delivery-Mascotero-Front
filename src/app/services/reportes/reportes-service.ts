import { inject, Service } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { PedidosPorEstado, ProductoMasVendido, TicketPromedio, VentasPorMes, VentasPorRango } from '../../models/Reportes';
import { catchError, of, throwError } from 'rxjs';

@Service()
export class ReportesService {

    private http = inject(HttpClient)
    private url = `${environment.apiUrl}/reportes`

    getVentasPorMes(anio: number, mes: number) {
        return this.http.get<VentasPorMes>(`${this.url}/calcular-total-ventas-por-mes`, { params: { anio, mes } }).pipe(
            catchError((error: HttpErrorResponse) => this.sinDatos<VentasPorMes | null>(error, null))
        )
    }

    getTicketPromedio(anio: number, mes: number) {
        return this.http.get<TicketPromedio>(`${this.url}/calcular-ticket-promedio-mes`, { params: { anio, mes } }).pipe(
            catchError((error: HttpErrorResponse) => this.sinDatos<TicketPromedio | null>(error, null))
        )
    }

    getPedidosPorEstado(anio: number, mes: number) {
        return this.http.get<PedidosPorEstado[]>(`${this.url}/buscar-cantidad-pedidos-por-estado-por-mes`, { params: { anio, mes } }).pipe(
            catchError((error: HttpErrorResponse) => this.sinDatos<PedidosPorEstado[]>(error, []))
        )
    }

    // Las fechas van como yyyy-MM-dd, que es lo que entrega <input type="date"> y lo que espera el LocalDate del back
    getVentasPorRango(fechaInicio: string, fechaFin: string) {
        return this.http.get<VentasPorRango>(`${this.url}/calcular-ventas-por-rango`, { params: { fechaInicio, fechaFin } }).pipe(
            catchError((error: HttpErrorResponse) => this.sinDatos<VentasPorRango | null>(error, null))
        )
    }

    getTop5MasVendidos() {
        return this.http.get<ProductoMasVendido[]>(`${this.url}/buscar-top-5-mas-vendidos`).pipe(
            catchError((error: HttpErrorResponse) => this.sinDatos<ProductoMasVendido[]>(error, []))
        )
    }

    // El back responde 400 o 404 cuando el periodo no tiene datos: no es una falla, es "sin datos".
    // Cualquier otro error (backend apagado, 403, 500...) se vuelve a lanzar para mostrarlo.
    private sinDatos<V>(error: HttpErrorResponse, vacio: V) {
        return error.status === 400 || error.status === 404
            ? of(vacio)
            : throwError(() => error)
    }



}

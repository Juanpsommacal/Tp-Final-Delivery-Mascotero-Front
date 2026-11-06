import { EstadoPedido } from "./Enums"

export interface VentasPorMes {
    anio: number
    mes: number
    cantidadPedidos: number
    montoTotal: number | null
}

export interface VentasPorRango {
    fechaInicio: string
    fechaFin: string
    cantidadPedidos: number
    totalVentas: number | null
}

export interface TicketPromedio {
    anio: number
    mes: number
    cantidadPedidos: number
    totalVentas: number
    ticketPromedio: number
}

export interface PedidosPorEstado {
    estado: EstadoPedido
    cantidad: number
}

export interface ProductoMasVendido {
    productoId: string
    nombreProducto: string
    cantidadVendida: number
}
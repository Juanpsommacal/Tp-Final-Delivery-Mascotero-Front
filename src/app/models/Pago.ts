import { MetodoPago } from './Enums'

export default interface Pago {
    id: number
    fecha: string
    monto: number
    metodoPago: MetodoPago
    pedidoId: number
    clienteId: number
    nombreCliente: string
}

// Mismo formato que PagoCreateRequestDTO
export interface PagoRequest {
    pedidoId: number
    monto: number
    metodoPago: MetodoPago
}

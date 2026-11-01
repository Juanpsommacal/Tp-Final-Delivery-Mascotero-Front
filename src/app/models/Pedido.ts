import { EstadoPago, EstadoPedido } from './Enums'
import Pago from './Pago'

export default interface Pedido {
    id: number
    clienteId: number
    nombreCliente: string
    fecha: string
    estadoPedido: EstadoPedido
    montoTotal: number
    estadoPago: EstadoPago
    direccionCompleta: string
    pisoDepto: string
    detallePedido: DetallePedido[]
    pagos: Pago[]
}

export interface DetallePedido {
    nombreProducto: string
    cantidad: number
    precioUnitario: number
    descuentoAplicado: number | null
    precioDescuento: number
    subtotal: number
}

// Mismo formato que PedidoCreateRequestDTO: la direccion va con sus datos, no por ID
export interface PedidoRequest {
    clienteId: number
    direccion: {
        calle: string
        numero: number
        piso: number | null
        departamento: string | null
        observaciones: string | null
    }
    detalles: DetallePedidoRequest[]
}

export interface DetallePedidoRequest {
    productoId: number
    cantidad: number
}

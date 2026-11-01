import { EstadoCompra } from './Enums'

export default interface Compra {
    id: number
    proveedorId: number
    nombreProveedor: string
    fecha: string
    estadoCompra: EstadoCompra
    montoTotal: number
    detalleResponseDTO: DetalleCompra[]
}

export interface DetalleCompra {
    productoId: number
    nombreProducto: string
    cantidad: number
    precioUnitario: number
    precioTotal: number
}

// Mismo formato que CompraCreateRequestDTO
export interface CompraRequest {
    proveedorId: number
    detalle: DetalleCompraRequest[]
}

export interface DetalleCompraRequest {
    productoId: number
    cantidad: number
    precioUnitario: number
}

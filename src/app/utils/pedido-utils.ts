import Pedido from "../models/Pedido";

export function saldoDe(pedido: Pedido): number {
    const pagado = pedido.pagos.reduce((suma, pago) => suma + pago.monto, 0)
    return Math.round((pedido.montoTotal - pagado) * 100) / 100
}

export function tieneDeuda(pedido: Pedido): boolean {
    return pedido.estadoPago === 'DEUDA' || pedido.estadoPago === 'DEUDA_PARCIAL'
}

// Mismos valores que los enums del back. Para sumar un tipo de producto nuevo, agregarlo en TIPOS_PRODUCTO.

export const TIPOS_PRODUCTO = ['ALIMENTO', 'ANTIPULGAS'] as const
export type TipoProducto = typeof TIPOS_PRODUCTO[number]

export const TIPOS_ANIMAL = ['PERRO', 'GATO'] as const
export type TipoAnimal = typeof TIPOS_ANIMAL[number]

export const UNIDADES_MEDIDA = ['GRAMOS', 'KILOGRAMOS'] as const
export type UnidadMedida = typeof UNIDADES_MEDIDA[number]

export const ETAPAS_VIDA = ['CACHORRO', 'ADULTO', 'GERONTE'] as const
export type EtapaVida = typeof ETAPAS_VIDA[number]

export const TIPOS_ANTIPULGAS = ['PIPETA', 'COMPRIMIDO'] as const
export type TipoAntipulgas = typeof TIPOS_ANTIPULGAS[number]

export const ESTADOS_PEDIDO = ['PENDIENTE', 'ENTREGADO', 'CANCELADO'] as const
export type EstadoPedido = typeof ESTADOS_PEDIDO[number]

export const ESTADOS_PAGO = ['PENDIENTE', 'DEUDA', 'DEUDA_PARCIAL', 'PAGADO', 'PEDIDO_CANCELADO'] as const
export type EstadoPago = typeof ESTADOS_PAGO[number]

export const METODOS_PAGO = ['EFECTIVO', 'LINK_DE_PAGO', 'TRANSFERENCIA'] as const
export type MetodoPago = typeof METODOS_PAGO[number]

export const ESTADOS_COMPRA = ['PENDIENTE', 'RECIBIDA', 'CANCELADA'] as const
export type EstadoCompra = typeof ESTADOS_COMPRA[number]

// En las rutas el tipo va en minuscula (/productos/alimento/3)
export function tipoDesdeRuta(valor: string | null): TipoProducto | null {
    const tipo = valor?.toUpperCase()
    return TIPOS_PRODUCTO.find(t => t === tipo) ?? null
}

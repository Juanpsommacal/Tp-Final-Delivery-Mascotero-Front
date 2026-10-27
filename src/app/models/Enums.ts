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

// En las rutas el tipo va en minuscula (/productos/alimento/3)
export function tipoDesdeRuta(valor: string | null): TipoProducto | null {
    const tipo = valor?.toUpperCase()
    return TIPOS_PRODUCTO.find(t => t === tipo) ?? null
}

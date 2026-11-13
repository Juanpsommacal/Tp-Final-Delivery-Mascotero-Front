import { TipoAnimal, TipoProducto } from './Enums'

export default interface Producto {
    id?: number
    nombre: string
    descripcion: string | null
    precio: number
    precioOferta?: number | null
    stock: number
    marca: string
    activo?: boolean
    tipoProducto?: TipoProducto
    tipoAnimal?: TipoAnimal
    // "3 kg" en alimentos, "De 10 a 20 kg" en antipulgas
    presentacion?: string | null
}

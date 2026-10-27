import { TipoProducto } from './Enums'

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
}

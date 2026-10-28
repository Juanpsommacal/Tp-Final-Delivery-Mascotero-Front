import Direccion from "./Direccion"

export default interface Cliente {
    id?: string
    nombre: string
    apellido: string
    telefono: string
    direcciones: Direccion[]
}

export type ClienteRequest = Pick<Cliente, 'nombre' | 'apellido' | 'telefono'>
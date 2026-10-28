export default interface Direccion {
    id?: string
    direccionCompleta: string
    pisoDepto: string
    observaciones: string | null
}

export interface DireccionRequest {
    calle: string
    numero: number
    piso: number | null
    departamento: string | null
    observaciones: string | null
}
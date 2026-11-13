// Una página de resultados del back. "pagina" arranca en 0
export default interface Pagina<T> {
    contenido: T[]
    pagina: number
    tamanio: number
    totalElementos: number
    totalPaginas: number
}

// Lo que todo listado le pide al back; "orden" tiene la forma "saldo-desc"
export interface ConsultaPagina {
    page: number
    size: number
    orden: string
}

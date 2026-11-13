export interface ProductoEnOferta {
    id: number;
    marcaYNombre: string;
    precioConDescuento: number;
}

export interface OfertaDetalle {
    id: number | string;
    nombre: string;
    descripcion: string;
    porcentaje: number;
    fechaInicio: string;
    fechaFin: string;
    productos?: ProductoEnOferta[];
    productosIds?: number[] | string;
}

export interface Oferta {
    id?: number | string;
    nombre: string;
    descripcion: string;
    porcentaje: number;
    fechaInicio: string | Date;
    fechaFin: string | Date;
    productosIds?: number[] | string;
    productos?: ProductoEnOferta[];
}

export interface OfertaRequest {
    nombre: string;
    descripcion: string;
    porcentaje: number;
    fechaInicio: string;
    fechaFin: string;
    productosIds: number[];
}

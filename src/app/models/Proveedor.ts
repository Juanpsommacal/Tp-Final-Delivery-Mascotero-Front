export interface Proveedor {
    id: string;
    nombre: string;
    telefono: string;
    activo: boolean;
}

export type ProveedorRequest = Omit<Proveedor, 'id'>;

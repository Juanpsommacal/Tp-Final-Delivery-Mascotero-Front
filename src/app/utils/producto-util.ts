import Producto from '../models/Producto';
import { coincideBusqueda } from './busqueda-util';

/**
 * Busca un producto por "marca + nombre", que es como se suele escribir (ej: "Proplan adulto mediano").
 * - Cada palabra escrita tiene que aparecer en la marca o en el nombre, en cualquier orden.
 * - Tambien se compara sin espacios, para que "proplan" encuentre la marca "Pro Plan".
 */
export function coincideProducto(producto: Producto, busqueda: string): boolean {
  return coincideBusqueda(`${producto.marca} ${producto.nombre}`, busqueda);
}

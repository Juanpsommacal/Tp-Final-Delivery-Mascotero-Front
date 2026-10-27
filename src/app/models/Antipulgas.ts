import { TipoAnimal, TipoAntipulgas } from './Enums'
import Producto from './Producto'

export default interface Antipulgas extends Producto {
    tipoAnimal: TipoAnimal
    kgMin: number
    kgMax: number
    tipoAntipulgas: TipoAntipulgas
}

import { EtapaVida, TipoAnimal, UnidadMedida } from './Enums'
import Producto from './Producto'

export default interface Alimento extends Producto {
    peso: number
    unidadMedida: UnidadMedida
    etapaVida: EtapaVida
    tipoAnimal: TipoAnimal
}

import { Pipe, PipeTransform } from '@angular/core';

const conCentavos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const sinCentavos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 })

/**
 * Único formato de plata de la app: $ 12.345 o $ 12.345,50.
 * Los centavos aparecen solo cuando existen, así un mismo monto se ve igual en todas las pantallas.
 */
export function formatearPesos(valor: number | null | undefined): string {
  if (valor == null || isNaN(valor)) return ''
  const redondeado = Math.round(valor * 100) / 100
  return Number.isInteger(redondeado) ? sinCentavos.format(redondeado) : conCentavos.format(redondeado)
}

@Pipe({ name: 'pesos' })
export class PesosPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    return formatearPesos(valor)
  }
}

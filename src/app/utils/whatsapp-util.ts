import { formatearPesos } from '../pipes/pesos-pipe';
import Pedido from '../models/Pedido';
import { DATOS_PAGO } from '../config/datos-pago';

export type PlantillaWhatsapp = 'detalle' | 'saldo'


/**
 * Pasa un teléfono argentino al formato que pide wa.me: 549 + característica + número, solo dígitos.
 * Acepta las formas más comunes de cargarlo:
 *   +54 9 223 555-1234 · 54 223 5551234 · 0223 15 555-1234 · 223 5551234 · 11 1512345678
 * Devuelve null si no se puede armar un número válido (por ejemplo, si falta la característica).
 */
export function normalizarTelefono(telefono: string | null | undefined): string | null {
  let digitos = (telefono ?? '').replace(/\D/g, '')
  if (!digitos) return null

  // Ya viene en formato internacional
  if (digitos.startsWith('549') && digitos.length === 13) return digitos
  if (digitos.startsWith('54') && digitos.length === 12) return '549' + digitos.slice(2)

  // Formato nacional: se saca el 0 de larga distancia
  if (digitos.startsWith('0')) digitos = digitos.slice(1)

  // El 15 de celular va después de la característica (de 2, 3 o 4 dígitos)
  if (digitos.length === 12) {
    for (const largoArea of [2, 3, 4]) {
      if (digitos.slice(largoArea, largoArea + 2) === '15') {
        digitos = digitos.slice(0, largoArea) + digitos.slice(largoArea + 2)
        break
      }
    }
  }

  // Característica + número siempre suman 10 dígitos en Argentina
  return digitos.length === 10 ? '549' + digitos : null
}

// 5492235551234 -> +54 9 223 555-1234 (solo para mostrar a quién se le manda)
export function formatearTelefono(normalizado: string): string {
  const nacional = normalizado.slice(3)
  return `+54 9 ${nacional.slice(0, 3)} ${nacional.slice(3, 6)}-${nacional.slice(6)}`
}

export function linkWhatsapp(telefonoNormalizado: string, mensaje: string): string {
  return `https://wa.me/${telefonoNormalizado}?text=${encodeURIComponent(mensaje)}`
}

function primerNombre(nombreCompleto: string): string {
  return nombreCompleto.trim().split(/\s+/)[0] ?? ''
}

function fecha(iso: string): string {
  const [anio, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${anio}`
}

function lineaDatosPago(): string {
  const partes = [
    DATOS_PAGO.alias ? `Alias: ${DATOS_PAGO.alias}` : '',
    DATOS_PAGO.cbu ? `CBU: ${DATOS_PAGO.cbu}` : '',
    DATOS_PAGO.titular ? `Titular: ${DATOS_PAGO.titular}` : '',
  ].filter(Boolean)
  return partes.length ? `\n\nPara transferir:\n${partes.join('\n')}` : ''
}

export function saldoPedido(pedido: Pedido): number {
  const pagado = pedido.pagos.reduce((suma, pago) => suma + pago.monto, 0)
  return Math.round((pedido.montoTotal - pagado) * 100) / 100
}

export function mensajeDetalle(pedido: Pedido): string {
  const productos = pedido.detallePedido
    .map(d => `• ${d.cantidad} × ${d.nombreProducto} — ${formatearPesos(d.subtotal)}`)
    .join('\n')
  const saldo = saldoPedido(pedido)
  const lineaSaldo = pedido.pagos.length > 0 && saldo > 0
    ? `\nYa pagaste ${formatearPesos(pedido.montoTotal - saldo)}, quedan ${formatearPesos(saldo)}.`
    : ''

  return `¡Hola ${primerNombre(pedido.nombreCliente)}! Te paso el detalle de tu pedido #${pedido.id} de Delivery Mascotero:\n\n` +
    `${productos}\n\n` +
    `Total: ${formatearPesos(pedido.montoTotal)}${lineaSaldo}\n` +
    `Entrega: ${pedido.direccionCompleta}\n\n` +
    `¡Gracias por tu compra!`
}

export function mensajeSaldo(pedido: Pedido): string {
  const saldo = saldoPedido(pedido)
  const pagado = pedido.montoTotal - saldo
  const detallePagado = pagado > 0
    ? ` (total ${formatearPesos(pedido.montoTotal)}, pagado ${formatearPesos(pagado)})`
    : ''

  return `¡Hola ${primerNombre(pedido.nombreCliente)}! Te escribimos de Delivery Mascotero por el pedido #${pedido.id} del ${fecha(pedido.fecha)}.\n\n` +
    `Quedó un saldo pendiente de ${formatearPesos(saldo)}${detallePagado}.\n` +
    `Podés pagarlo en efectivo, por transferencia o con link de pago.` +
    lineaDatosPago() +
    `\n\n¡Gracias!`
}

export function mensajePara(plantilla: PlantillaWhatsapp, pedido: Pedido): string {
  return plantilla === 'saldo' ? mensajeSaldo(pedido) : mensajeDetalle(pedido)
}

// "hoy", "ayer" o "hace 3 días", para el aviso de último recordatorio
export function haceCuanto(isoFechaHora: string): string {
  const fechaRecordatorio = new Date(isoFechaHora)
  const hoy = new Date()
  const inicio = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const dias = Math.round((inicio(hoy) - inicio(fechaRecordatorio)) / 86_400_000)
  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'ayer'
  return `hace ${dias} días`
}

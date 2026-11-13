const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Mantiene el Tab dentro de un modal: del último elemento vuelve al primero y viceversa.
 * Se llama desde el (keydown) del contenedor del modal.
 */
export function atraparFoco(evento: KeyboardEvent, contenedor: HTMLElement): void {
  if (evento.key !== 'Tab') return

  const elementos = Array.from(contenedor.querySelectorAll<HTMLElement>(ENFOCABLES))
  if (elementos.length === 0) return

  const primero = elementos[0]
  const ultimo = elementos[elementos.length - 1]

  if (evento.shiftKey && document.activeElement === primero) {
    evento.preventDefault()
    ultimo.focus()
  } else if (!evento.shiftKey && document.activeElement === ultimo) {
    evento.preventDefault()
    primero.focus()
  }
}

/**
 * Convierte un porcentaje numérico a su valor visual entero.
 * - Si viene en formato decimal fraccionario menor a 1 (ej: 0.1 -> 10, 0.25 -> 25), lo multiplica por 100.
 * - Si viene en formato porcentual estándar (ej: 1 -> 1, 20 -> 20, 100 -> 100), conserva el valor directamente.
 */
export function formatearPorcentajeVisual(porcentaje?: number | null): number {
  if (porcentaje == null || isNaN(porcentaje)) return 0;
  if (porcentaje > 0 && porcentaje < 1) {
    return Math.round(porcentaje * 100);
  }
  return Math.round(porcentaje);
}

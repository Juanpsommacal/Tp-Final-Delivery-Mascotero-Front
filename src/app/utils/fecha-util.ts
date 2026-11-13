import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Retorna una fecha en formato local ISO (YYYY-MM-DD).
 * Si no se proporciona fecha, utiliza la fecha actual.
 */
export function getFechaLocalISO(fecha: Date = new Date()): string {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validador para controles de formulario:
 * Verifica que la fecha ingresada no sea anterior a hoy (hora local).
 */
export function fechaNoAnteriorAHoy(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const hoyStr = getFechaLocalISO();
    return control.value < hoyStr ? { fechaAnterior: true } : null;
  };
}

/**
 * Validador para grupos de formulario (FormGroup):
 * Verifica que la fecha de fin no sea anterior a la fecha de inicio.
 */
export function fechaFinPosterior(
  campoInicio = 'fechaInicio',
  campoFin = 'fechaFin'
): ValidatorFn {
  return (grupo: AbstractControl): ValidationErrors | null => {
    const inicio = grupo.get(campoInicio)?.value;
    const fin = grupo.get(campoFin)?.value;
    if (!inicio || !fin) return null;
    return fin < inicio ? { fechaInvalida: true } : null;
  };
}


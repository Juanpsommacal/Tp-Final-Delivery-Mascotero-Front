import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Mismo @Pattern que UsuarioCreateRequestDTO para nombre y apellido
export const SOLO_LETRAS = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]+$/

// Validacion solo del front: el back recibe una sola contraseña
export function clavesIguales(): ValidatorFn {
    return (grupo: AbstractControl): ValidationErrors | null => {
        const password = grupo.get('password')?.value
        const repetir = grupo.get('repetirPassword')?.value
        if (!password || !repetir) return null

        return password !== repetir ? { clavesDistintas: true } : null
    }
}

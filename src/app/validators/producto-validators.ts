import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Equivalente a @NotBlank del back: Validators.required deja pasar un texto con solo espacios
export function noVacio(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const valor = control.value
        return typeof valor === 'string' && valor.length > 0 && valor.trim().length === 0
            ? { noVacio: true }
            : null
    }
}

// Equivalente a @Digits(integer, fraction) del back
export function digitos(entero: number, fraccion: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const valor = control.value
        if (valor === null || valor === undefined || valor === '') return null

        const [parteEntera, parteDecimal = ''] = Math.abs(Number(valor)).toString().split('.')

        return parteEntera.length > entero || parteDecimal.length > fraccion
            ? { digitos: { entero, fraccion } }
            : null
    }
}

// Mismo chequeo que InvalidWeightRangeException en AntipulgasService
export function rangoPeso(): ValidatorFn {
    return (grupo: AbstractControl): ValidationErrors | null => {
        const kgMin = grupo.get('kgMin')?.value
        const kgMax = grupo.get('kgMax')?.value
        if (kgMin === null || kgMax === null) return null

        return kgMin > kgMax ? { rangoPeso: true } : null
    }
}

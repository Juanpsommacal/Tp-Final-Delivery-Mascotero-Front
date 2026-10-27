import { Pipe, PipeTransform } from '@angular/core';

// KILOGRAMOS -> Kilogramos
@Pipe({
  name: 'formatoEnum',
})
export class FormatoEnumPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    if (!valor) return ''
    const texto = valor.replace(/_/g, ' ').toLowerCase()
    return texto.charAt(0).toUpperCase() + texto.slice(1)
  }
}

import { HttpParams } from '@angular/common/http';

type Valor = string | number | boolean | null | undefined

// Arma los query params sin los filtros que no están en uso (vacíos, null o en false)
export function parametros(valores: Record<string, Valor>): HttpParams {
  let params = new HttpParams();
  for (const [clave, valor] of Object.entries(valores)) {
    if (valor !== null && valor !== undefined && valor !== '' && valor !== false) {
      params = params.set(clave, String(valor));
    }
  }
  return params;
}

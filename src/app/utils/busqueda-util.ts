// Minusculas y sin tildes, para que "cachorro" encuentre "Cachórro"
export function normalizar(valor: string): string {
  return valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * Cada palabra escrita tiene que aparecer en el texto, en cualquier orden (ej: "perez luro 1234").
 * Tambien se compara sin espacios, para que "proplan" encuentre "Pro Plan".
 */
export function coincideBusqueda(texto: string, busqueda: string): boolean {
  const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return true;

  const textoNormalizado = normalizar(texto);
  const textoSinEspacios = textoNormalizado.replace(/\s+/g, '');

  return palabras.every(palabra => textoNormalizado.includes(palabra) || textoSinEspacios.includes(palabra));
}

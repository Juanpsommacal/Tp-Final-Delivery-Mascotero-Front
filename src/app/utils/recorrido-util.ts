// Google Maps admite hasta 9 paradas intermedias en un mismo link
const MAX_PARADAS_POR_LINK = 9

interface Recorrido {
  origen: string
  destino: string
  paradas: string[]
  ciudad?: string
}

function linkDeTramo(puntos: string[]): string {
  const params = [
    'api=1',
    `origin=${encodeURIComponent(puntos[0])}`,
    `destination=${encodeURIComponent(puntos[puntos.length - 1])}`,
    'travelmode=driving',
  ]
  const intermedios = puntos.slice(1, -1)
  if (intermedios.length > 0) params.push(`waypoints=${intermedios.map(encodeURIComponent).join('%7C')}`)
  return `https://www.google.com/maps/dir/?${params.join('&')}`
}

/**
 * Arma los links de Google Maps respetando el orden elegido.
 * Si hay más paradas de las que entran en un link, se divide en tramos: cada uno arranca donde terminó el anterior.
 */
export function linksRecorrido({ origen, destino, paradas, ciudad }: Recorrido): string[] {
  if (paradas.length === 0) return []

  const conCiudad = (direccion: string) => [direccion, ciudad].filter(Boolean).join(', ')
  const puntos = [origen, ...paradas, destino].map(conCiudad)

  const links: string[] = []
  let inicio = 0
  while (inicio < puntos.length - 1) {
    const fin = Math.min(inicio + MAX_PARADAS_POR_LINK + 1, puntos.length - 1)
    links.push(linkDeTramo(puntos.slice(inicio, fin + 1)))
    inicio = fin
  }
  return links
}

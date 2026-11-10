import { linksRecorrido } from './recorrido-util';

describe('linksRecorrido', () => {
  const parametros = (link: string) => new URL(link).searchParams
  const paradas = (cantidad: number) => Array.from({ length: cantidad }, (_, i) => `Calle ${i + 1}`)

  it('sin paradas no arma ningún link', () => {
    expect(linksRecorrido({ origen: 'A', destino: 'B', paradas: [] })).toEqual([])
  })

  it('sale del origen, llega al destino y respeta el orden elegido', () => {
    const [link] = linksRecorrido({ origen: 'Córdoba 3056', destino: 'Calabria 3480', paradas: ['Luro 100', 'Colón 200'] })
    const p = parametros(link)
    expect(p.get('origin')).toBe('Córdoba 3056')
    expect(p.get('destination')).toBe('Calabria 3480')
    expect(p.get('waypoints')).toBe('Luro 100|Colón 200')
    expect(p.get('api')).toBe('1')
  })

  it('agrega la ciudad a cada dirección', () => {
    const [link] = linksRecorrido({ origen: 'A 1', destino: 'B 2', paradas: ['C 3'], ciudad: 'Mar del Plata' })
    expect(parametros(link).get('origin')).toBe('A 1, Mar del Plata')
    expect(parametros(link).get('waypoints')).toBe('C 3, Mar del Plata')
  })

  it('con 9 paradas entra en un solo link', () => {
    const links = linksRecorrido({ origen: 'O', destino: 'D', paradas: paradas(9) })
    expect(links.length).toBe(1)
    expect(parametros(links[0]).get('waypoints')!.split('|').length).toBe(9)
  })

  it('con más paradas encadena tramos sin saltear ninguna', () => {
    const lista = paradas(23)
    const links = linksRecorrido({ origen: 'O', destino: 'D', paradas: lista })
    expect(links.length).toBeGreaterThan(1)

    const recorrido: string[] = []
    links.forEach((link, i) => {
      const p = parametros(link)
      const intermedios = p.get('waypoints')?.split('|') ?? []
      expect(intermedios.length).toBeLessThanOrEqual(9)
      if (i === 0) recorrido.push(p.get('origin')!)
      else expect(p.get('origin')).toBe(recorrido.at(-1))
      recorrido.push(...intermedios, p.get('destination')!)
    })
    expect(recorrido).toEqual(['O', ...lista, 'D'])
  })
})

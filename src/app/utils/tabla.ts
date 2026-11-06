import { computed, effect, inject, signal, untracked, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

type ValorOrden = string | number

export interface OpcionesTabla<T, C extends string> {
  // Filas ya filtradas
  filas: () => T[]
  // Cómo se compara cada columna ordenable
  columnas: Record<C, (fila: T) => ValorOrden>
  ordenInicial: NoInfer<C>
  ascendenteInicial?: boolean
  // Columnas de texto: al elegirlas arrancan de la A a la Z. El resto (números, fechas) del más grande al más chico
  columnasTexto?: NoInfer<C>[]
  porPagina?: number
  // Cuando cambia lo que devuelve (búsqueda, filtros) se vuelve a la página 1
  reiniciarPaginaCon?: () => unknown
}

/**
 * Orden por columnas y paginación de un listado. Se crea como campo del componente
 * (necesita contexto de inyección para el effect que reinicia la página).
 */
export class TablaOrdenable<T, C extends string> {

  readonly orden: WritableSignal<C>
  readonly ascendente: WritableSignal<boolean>
  readonly pagina = signal(1)
  readonly porPagina: number

  readonly ordenadas
  readonly totalPaginas
  readonly paginaActual
  readonly filasPagina
  readonly rango

  constructor(private opciones: OpcionesTabla<T, C>) {
    this.orden = signal(opciones.ordenInicial)
    this.ascendente = signal(opciones.ascendenteInicial ?? false)
    this.porPagina = opciones.porPagina ?? 20

    this.ordenadas = computed(() => {
      const valor = this.opciones.columnas[this.orden()]
      const signo = this.ascendente() ? 1 : -1
      return [...this.opciones.filas()].sort((a, b) => {
        const va = valor(a), vb = valor(b)
        if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb, 'es') * signo
        return va < vb ? -signo : va > vb ? signo : 0
      })
    })

    this.totalPaginas = computed(() => Math.max(1, Math.ceil(this.opciones.filas().length / this.porPagina)))

    // Si con un filtro quedan menos páginas, no se queda en una página vacía
    this.paginaActual = computed(() => Math.min(this.pagina(), this.totalPaginas()))

    this.filasPagina = computed(() => {
      const inicio = (this.paginaActual() - 1) * this.porPagina
      return this.ordenadas().slice(inicio, inicio + this.porPagina)
    })

    this.rango = computed(() => {
      const total = this.opciones.filas().length
      if (total === 0) return { desde: 0, hasta: 0, total }
      const desde = (this.paginaActual() - 1) * this.porPagina + 1
      return { desde, hasta: Math.min(desde + this.porPagina - 1, total), total }
    })

    const reiniciar = opciones.reiniciarPaginaCon
    if (reiniciar) {
      let primeraVez = true
      effect(() => {
        reiniciar()
        // La primera corrida es la carga inicial: respeta la página que vino por URL
        if (primeraVez) { primeraVez = false; return }
        untracked(() => this.pagina.set(1))
      })
    }
  }

  ordenarPor(columna: C) {
    if (this.orden() === columna) {
      this.ascendente.update(valor => !valor)
    } else {
      this.orden.set(columna)
      this.ascendente.set(this.opciones.columnasTexto?.includes(columna) ?? false)
    }
    this.pagina.set(1)
  }

  ariaOrden(columna: C): 'ascending' | 'descending' | 'none' {
    if (this.orden() !== columna) return 'none'
    return this.ascendente() ? 'ascending' : 'descending'
  }

  flecha(columna: C): string {
    if (this.orden() !== columna) return ''
    return this.ascendente() ? '▲' : '▼'
  }

  irAPagina(numero: number) {
    this.pagina.set(Math.min(Math.max(1, numero), this.totalPaginas()))
  }

  // "nombre-asc" para la URL; null si es el orden de siempre
  get ordenParaUrl(): string | null {
    const esInicial = this.orden() === this.opciones.ordenInicial
      && this.ascendente() === (this.opciones.ascendenteInicial ?? false)
    return esInicial ? null : `${this.orden()}-${this.ascendente() ? 'asc' : 'desc'}`
  }

  leerOrdenDeUrl(valor: string | null) {
    const [columna, sentido] = (valor ?? '').split('-')
    if (columna && columna in this.opciones.columnas) {
      this.orden.set(columna as C)
      this.ascendente.set(sentido === 'asc')
    }
  }

  // Para el select "Ordenar por" del celular
  readonly ordenActual = computed(() => `${this.orden()}-${this.ascendente() ? 'asc' : 'desc'}`)

  ordenarComo(valor: string) {
    this.leerOrdenDeUrl(valor)
    this.pagina.set(1)
  }
}

type Campo = WritableSignal<string> | WritableSignal<boolean>

/**
 * Guarda los filtros, el orden y la página en la URL (?q=...&orden=...&pagina=2),
 * así sobreviven a entrar a un detalle y volver. Llamar desde el constructor o como campo.
 */
export function filtrosEnUrl(campos: Record<string, Campo>, tabla?: TablaOrdenable<any, any>) {
  const router = inject(Router)
  const q = inject(ActivatedRoute).snapshot.queryParamMap

  // Valores por defecto: no se escriben en la URL
  const iniciales = Object.fromEntries(Object.entries(campos).map(([clave, s]) => [clave, s()]))

  for (const [clave, s] of Object.entries(campos)) {
    const valor = q.get(clave)
    if (valor === null) continue
    if (typeof iniciales[clave] === 'boolean') (s as WritableSignal<boolean>).set(valor === '1')
    else (s as WritableSignal<string>).set(valor)
  }
  if (tabla) {
    tabla.leerOrdenDeUrl(q.get('orden'))
    tabla.pagina.set(Number(q.get('pagina')) || 1)
  }

  effect(() => {
    const params: Record<string, string | null> = {}
    for (const [clave, s] of Object.entries(campos)) {
      const valor = s()
      params[clave] = valor === iniciales[clave] ? null : typeof valor === 'boolean' ? '1' : valor
    }
    if (tabla) {
      params['orden'] = tabla.ordenParaUrl
      // La página pedida, no la recortada: mientras cargan los datos hay una sola página
      params['pagina'] = tabla.pagina() > 1 ? String(tabla.pagina()) : null
    }
    untracked(() => router.navigate([], { queryParams: params, replaceUrl: true }))
  })
}

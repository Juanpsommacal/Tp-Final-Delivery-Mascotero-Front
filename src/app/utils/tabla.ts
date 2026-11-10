import { HttpErrorResponse } from '@angular/common/http';
import { computed, effect, inject, Signal, signal, untracked, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, debounce, EMPTY, Observable, Subject, switchMap, tap, timer } from 'rxjs';
import Pagina, { ConsultaPagina } from '../models/Pagina';

type ValorOrden = string | number

// Espera antes de buscar: que no salga un pedido al back por cada letra
const DEMORA_BUSQUEDA_MS = 300

interface ConfigTabla<C extends string> {
  columnas: readonly C[]
  ordenInicial: NoInfer<C>
  ascendenteInicial?: boolean
  // Columnas de texto: al elegirlas arrancan de la A a la Z. El resto (números, fechas) del más grande al más chico
  columnasTexto?: NoInfer<C>[]
  porPagina?: number
}

// Orden por columnas y número de página: lo que comparten las tablas en memoria y las paginadas por el back
export abstract class TablaBase<C extends string> {

  readonly orden: WritableSignal<C>
  readonly ascendente: WritableSignal<boolean>
  readonly pagina = signal(1)
  readonly porPagina: number

  abstract readonly totalPaginas: Signal<number>
  abstract readonly paginaActual: Signal<number>
  abstract readonly rango: Signal<{ desde: number, hasta: number, total: number }>

  protected constructor(private config: ConfigTabla<C>) {
    this.orden = signal(config.ordenInicial)
    this.ascendente = signal(config.ascendenteInicial ?? false)
    this.porPagina = config.porPagina ?? 20
  }

  ordenarPor(columna: C) {
    if (this.orden() === columna) {
      this.ascendente.update(valor => !valor)
    } else {
      this.orden.set(columna)
      this.ascendente.set(this.config.columnasTexto?.includes(columna) ?? false)
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
    const esInicial = this.orden() === this.config.ordenInicial
      && this.ascendente() === (this.config.ascendenteInicial ?? false)
    return esInicial ? null : `${this.orden()}-${this.ascendente() ? 'asc' : 'desc'}`
  }

  leerOrdenDeUrl(valor: string | null) {
    const [columna, sentido] = (valor ?? '').split('-')
    if (columna && this.config.columnas.includes(columna as C)) {
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

export interface OpcionesTabla<T, C extends string> extends Omit<ConfigTabla<C>, 'columnas'> {
  // Filas ya filtradas
  filas: () => T[]
  // Cómo se compara cada columna ordenable
  columnas: Record<C, (fila: T) => ValorOrden>
  // Cuando cambia lo que devuelve (búsqueda, filtros) se vuelve a la página 1
  reiniciarPaginaCon?: () => unknown
}

/**
 * Orden por columnas y paginación de un listado que ya está entero en memoria. Se crea como campo
 * del componente (necesita contexto de inyección para el effect que reinicia la página).
 */
export class TablaOrdenable<T, C extends string> extends TablaBase<C> {

  readonly ordenadas
  readonly totalPaginas
  readonly paginaActual
  readonly filasPagina
  readonly rango

  constructor(private opciones: OpcionesTabla<T, C>) {
    super({ ...opciones, columnas: Object.keys(opciones.columnas) as C[] })

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
}

export interface OpcionesTablaServidor<R extends Pagina<any>, C extends string> extends ConfigTabla<C> {
  // Trae una página aplicando los filtros actuales
  cargar: (consulta: ConsultaPagina) => Observable<R>
  // Texto del buscador: sus cambios esperan a que se deje de escribir
  busqueda?: () => string
  // Devuelve el resto de los filtros: si cambian se vuelve a la página 1 y se recarga
  filtros?: () => unknown
  alError: (error: HttpErrorResponse, primeraCarga: boolean) => void
}

/**
 * Listado que el back entrega de a una página: búsqueda, filtros y orden se resuelven allá.
 * Se crea como campo del componente y hace la primera carga solo.
 */
export class TablaServidor<R extends Pagina<any>, C extends string> extends TablaBase<C> {

  // La última respuesta, para leer los totales que manda cada listado
  readonly respuesta = signal<R | null>(null)
  // Solo la primera carga muestra el esqueleto; después la tabla queda visible mientras llega lo nuevo
  readonly cargando = signal(true)
  readonly actualizando = signal(false)

  readonly filasPagina = computed<R['contenido']>(() => this.respuesta()?.contenido ?? [])
  readonly totalPaginas = computed(() => Math.max(1, this.respuesta()?.totalPaginas ?? 1))
  readonly paginaActual = computed(() => Math.min(this.pagina(), this.totalPaginas()))
  readonly rango = computed(() => {
    const respuesta = this.respuesta()
    if (!respuesta || respuesta.contenido.length === 0) return { desde: 0, hasta: 0, total: respuesta?.totalElementos ?? 0 }
    const desde = respuesta.pagina * respuesta.tamanio + 1
    return { desde, hasta: desde + respuesta.contenido.length - 1, total: respuesta.totalElementos }
  })

  constructor(opciones: OpcionesTablaServidor<R, C>) {
    super(opciones)

    const solicitudes = new Subject<boolean>()
    solicitudes.pipe(
      debounce(demorar => timer(demorar ? DEMORA_BUSQUEDA_MS : 0)),
      tap(() => this.actualizando.set(true)),
      // switchMap descarta la respuesta anterior si llega una consulta más nueva
      switchMap(() => opciones.cargar({
        page: this.pagina() - 1,
        size: this.porPagina,
        orden: this.ordenActual(),
      }).pipe(catchError(error => {
        opciones.alError(error, this.cargando())
        this.cargando.set(false)
        this.actualizando.set(false)
        return EMPTY
      }))),
      takeUntilDestroyed(),
    ).subscribe(respuesta => {
      // La página pedida ya no existe (vino por URL o se borraron datos): se va a la última
      if (this.pagina() > Math.max(1, respuesta.totalPaginas)) {
        this.pagina.set(Math.max(1, respuesta.totalPaginas))
        return
      }
      this.respuesta.set(respuesta)
      this.cargando.set(false)
      this.actualizando.set(false)
    })

    let filtrosPrevios: string | null = null
    let busquedaPrevia: string | null = null
    effect(() => {
      const pagina = this.pagina()
      this.ordenActual()
      const busqueda = opciones.busqueda?.() ?? ''
      const filtros = JSON.stringify([busqueda, opciones.filtros?.()])

      untracked(() => {
        // Con otros filtros se vuelve a la página 1; este effect corre de nuevo y recién ahí se carga
        if (filtrosPrevios !== null && filtros !== filtrosPrevios && pagina !== 1) {
          filtrosPrevios = filtros
          this.pagina.set(1)
          return
        }
        const demorar = busquedaPrevia !== null && busqueda !== busquedaPrevia
        filtrosPrevios = filtros
        busquedaPrevia = busqueda
        solicitudes.next(demorar)
      })
    })
  }

  // Refleja un cambio en una fila ya cargada sin volver a pedir la página
  actualizarFilas(cambio: (fila: R['contenido'][number]) => R['contenido'][number]) {
    this.respuesta.update(respuesta => respuesta ? { ...respuesta, contenido: respuesta.contenido.map(cambio) } : respuesta)
  }
}

type Campo = WritableSignal<string> | WritableSignal<boolean>

/**
 * Guarda los filtros, el orden y la página en la URL (?q=...&orden=...&pagina=2),
 * así sobreviven a entrar a un detalle y volver. Llamar desde el constructor o como campo.
 */
export function filtrosEnUrl(campos: Record<string, Campo>, tabla?: TablaBase<any>) {
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

import { Component, input } from '@angular/core';
import { TablaOrdenable } from '../../utils/tabla';

// Anterior / Siguiente debajo de una tabla. No se muestra si entra todo en una página
@Component({
  selector: 'app-paginacion',
  template: `
    @if (tabla().totalPaginas() > 1) {
      <nav class="paginacion" [attr.aria-label]="'Páginas de ' + nombre()">
        <span class="info-paginacion">{{ tabla().rango().desde }}–{{ tabla().rango().hasta }} de {{ tabla().rango().total }}</span>
        <div class="botones-paginacion">
          <button type="button" class="boton boton-secundario"
                  (click)="tabla().irAPagina(tabla().paginaActual() - 1)" [disabled]="tabla().paginaActual() === 1">
            Anterior
          </button>
          <span class="pagina-actual">Página {{ tabla().paginaActual() }} de {{ tabla().totalPaginas() }}</span>
          <button type="button" class="boton boton-secundario"
                  (click)="tabla().irAPagina(tabla().paginaActual() + 1)" [disabled]="tabla().paginaActual() >= tabla().totalPaginas()">
            Siguiente
          </button>
        </div>
      </nav>
    }
  `,
})
export class Paginacion {
  tabla = input.required<TablaOrdenable<any, any>>()
  nombre = input('resultados')
}

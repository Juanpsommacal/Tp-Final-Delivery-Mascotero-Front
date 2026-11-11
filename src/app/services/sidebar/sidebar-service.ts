import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SidebarService {
  private readonly colapsadoSignal = signal<boolean>(this.leerEstadoInicial());

  // Señal pública de solo lectura para componentes
  readonly colapsado = this.colapsadoSignal.asReadonly();

  constructor() {
    this.actualizarBodyClase(this.colapsadoSignal());
  }

  private leerEstadoInicial(): boolean {
    if (typeof localStorage === 'undefined') {
      return false;
    }
    return localStorage.getItem('sidebar_colapsado') === 'true';
  }

  toggle(): void {
    const nuevo = !this.colapsadoSignal();
    this.colapsadoSignal.set(nuevo);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('sidebar_colapsado', String(nuevo));
    }
    this.actualizarBodyClase(nuevo);
  }

  setColapsado(valor: boolean): void {
    this.colapsadoSignal.set(valor);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('sidebar_colapsado', String(valor));
    }
    this.actualizarBodyClase(valor);
  }

  private actualizarBodyClase(colapsado: boolean): void {
    if (typeof document !== 'undefined') {
      if (colapsado) {
        document.body.classList.add('sidebar-compacto');
      } else {
        document.body.classList.remove('sidebar-compacto');
      }
    }
  }
}


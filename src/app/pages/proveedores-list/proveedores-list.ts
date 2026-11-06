import { OrdenMobile, OpcionOrden } from '../../components/orden-mobile/orden-mobile';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProveedoresService } from '../../services/proveedores/proveedores-service';
import { ConfirmacionService } from '../../services/confirmacion/confirmacion-service';
import { AlertaService } from '../../services/alerta/alerta-service';
import { Proveedor } from '../../models/Proveedor';
import { extraerMensajeError } from '../../utils/error-util';
import { coincideBusqueda } from '../../utils/busqueda-util';
import { SkeletonLista } from '../../components/skeleton-lista/skeleton-lista';
import { Paginacion } from '../../components/paginacion/paginacion';
import { filtrosEnUrl, TablaOrdenable } from '../../utils/tabla';

// Proveedores no tiene pantalla de detalle: editar y eliminar quedan en la fila
@Component({
  imports: [RouterLink, SkeletonLista, Paginacion, OrdenMobile],
  selector: 'app-proveedores-list',
  styleUrl: './proveedores-list.css',
  templateUrl: './proveedores-list.html',
})
export class ProveedoresList implements OnInit {
  private proveedoresService = inject(ProveedoresService);
  private confirmacionService = inject(ConfirmacionService);
  private alertaService = inject(AlertaService);

  proveedores = signal<Proveedor[]>([]);
  busqueda = signal('');
  cargando = signal(true);
  eliminandoId = signal<string | null>(null);
  // El back devuelve todos, también los dados de baja: se ocultan salvo que se prenda el switch
  mostrarInactivos = signal(false);

  proveedoresFiltrados = computed(() => {
    const texto = this.busqueda();
    return this.proveedores().filter((p) =>
      (this.mostrarInactivos() || p.activo) &&
      coincideBusqueda(`${p.nombre} ${p.telefono ?? ''}`, texto)
    );
  });

  // Opciones del select "Ordenar por" que se ve en el celular
  readonly opcionesOrden: OpcionOrden[] = [
    { valor: 'nombre-asc', etiqueta: 'Nombre (A–Z)' },
    { valor: 'nombre-desc', etiqueta: 'Nombre (Z–A)' },
    { valor: 'id-desc', etiqueta: 'Más nuevos primero' },
  ]

  tabla = new TablaOrdenable({
    filas: this.proveedoresFiltrados,
    columnas: {
      id: (p: Proveedor) => Number(p.id),
      nombre: (p: Proveedor) => p.nombre.toLowerCase(),
    },
    ordenInicial: 'nombre',
    ascendenteInicial: true,
    columnasTexto: ['nombre'],
    reiniciarPaginaCon: () => [this.busqueda(), this.mostrarInactivos()],
  });

  constructor() {
    filtrosEnUrl({ q: this.busqueda, inactivos: this.mostrarInactivos }, this.tabla);
  }

  ngOnInit(): void {
    this.proveedoresService.getAll().subscribe({
      next: (data) => {
        this.proveedores.set(data);
        this.cargando.set(false);
      },
      error: (error) => {
        console.error('Error al cargar proveedores:', error);
        this.alertaService.error('No se pudieron cargar los proveedores');
        this.cargando.set(false);
      },
    });
  }

  limpiarFiltros() {
    this.busqueda.set('');
    this.mostrarInactivos.set(false);
  }

  async eliminarProveedor(proveedor: Proveedor) {
    const confirmar = await this.confirmacionService.confirmar({
      titulo: 'Eliminar proveedor',
      mensaje: `¿Seguro que querés eliminar al proveedor "${proveedor.nombre}"? Queda dado de baja y ya no se le pueden cargar compras.`,
      textoConfirmar: 'Eliminar',
      tipo: 'peligro',
    });
    if (!confirmar) return;

    this.eliminandoId.set(proveedor.id);
    this.proveedoresService.delete(proveedor.id).subscribe({
      next: () => {
        this.alertaService.exito(`${proveedor.nombre} quedó dado de baja.`, 'Proveedor eliminado');
        // En el back es una baja lógica: queda inactivo, no se borra
        this.proveedores.update((lista) =>
          lista.map((p) => (p.id === proveedor.id ? { ...p, activo: false } : p))
        );
        this.eliminandoId.set(null);
      },
      error: (error) => {
        console.error('Error al eliminar proveedor:', error);
        this.alertaService.error(extraerMensajeError(error));
        this.eliminandoId.set(null);
      },
    });
  }
}

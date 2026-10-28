import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ProveedoresService } from '../../services/proveedores/proveedores-service';
import { Proveedor } from '../../models/Proveedor';
import { RouterLink } from '@angular/router';
import { extraerMensajeError } from '../../utils/error-util';

@Component({
  imports: [RouterLink],
  selector: 'app-proveedores-list',
  styleUrl: './proveedores-list.css',
  templateUrl: './proveedores-list.html',
})
export class ProveedoresList implements OnInit {
  private proveedoresService = inject(ProveedoresService);

  readonly itemsPorPagina = 10;

  proveedores = signal<Proveedor[]>([]);
  busqueda = signal('');
  paginaActual = signal(1);
  cargando = signal(true);
  eliminandoId = signal<string | null>(null);

  // Filtro por nombre reactivo
  proveedoresFiltrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    if (!texto) {
      return this.proveedores();
    }
    return this.proveedores().filter((p) =>
      p.nombre.toLowerCase().includes(texto)
    );
  });

  // Total de páginas calculadas
  totalPaginas = computed(() => {
    return Math.ceil(this.proveedoresFiltrados().length / this.itemsPorPagina) || 1;
  });

  // Proveedores a mostrar en la página actual (máximo 10)
  proveedoresPaginados = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.itemsPorPagina;
    return this.proveedoresFiltrados().slice(inicio, inicio + this.itemsPorPagina);
  });

  // Lista de números de página
  paginas = computed(() => {
    const total = this.totalPaginas();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  // Índices para el texto informativo de paginación
  inicioRango = computed(() => {
    if (this.proveedoresFiltrados().length === 0) return 0;
    return (this.paginaActual() - 1) * this.itemsPorPagina + 1;
  });

  finRango = computed(() => {
    return Math.min(
      this.paginaActual() * this.itemsPorPagina,
      this.proveedoresFiltrados().length
    );
  });

  ngOnInit(): void {
    this.getAllProveedores();
  }

  private getAllProveedores() {
    this.cargando.set(true);
    this.proveedoresService.getAll().subscribe({
      next: (data) => {
        this.proveedores.set(data);
        this.cargando.set(false);
      },
      error: (error) => {
        console.error('Error al cargar proveedores:', error);
        alert('Error: No se pudo cargar los proveedores');
        this.cargando.set(false);
      },
    });
  }

  cambiarBusqueda(texto: string) {
    this.busqueda.set(texto);
    this.paginaActual.set(1); // Reiniciar a la primera página al buscar
  }

  cambiarPagina(pagina: number) {
    if (pagina >= 1 && pagina <= this.totalPaginas()) {
      this.paginaActual.set(pagina);
    }
  }

  paginaAnterior() {
    this.cambiarPagina(this.paginaActual() - 1);
  }

  paginaSiguiente() {
    this.cambiarPagina(this.paginaActual() + 1);
  }

  eliminarProveedor(proveedor: Proveedor) {
    const confirmar = confirm(`¿Estás seguro de que deseas eliminar al proveedor "${proveedor.nombre}"?`);
    if (!confirmar) return;

    this.eliminandoId.set(proveedor.id);
    this.proveedoresService.delete(proveedor.id).subscribe({
      next: () => {
        alert('Proveedor eliminado correctamente');
        this.proveedores.update((lista) => lista.filter((p) => p.id !== proveedor.id));
        this.eliminandoId.set(null);
        if (this.paginaActual() > this.totalPaginas()) {
          this.paginaActual.set(this.totalPaginas());
        }
      },
      error: (error) => {
        console.error('Error al eliminar proveedor:', error);
        alert(`Error: ${extraerMensajeError(error)}`);
        this.eliminandoId.set(null);
      },
    });
  }
}

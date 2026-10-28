import { Component, computed, OnInit, signal } from '@angular/core';
import Producto from '../../models/Producto';
import { ProductosService } from '../../services/productos/productos-service';
import { Router, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { TipoProducto, TIPOS_PRODUCTO } from '../../models/Enums';
import { FormatoEnumPipe } from '../../pipes/formato-enum-pipe';

@Component({
  imports: [RouterLink, CurrencyPipe, FormatoEnumPipe],
  selector: 'app-productos-list',
  styleUrl: './productos-list.css',
  templateUrl: './productos-list.html',
})
export class ProductosList implements OnInit{

  tipos = TIPOS_PRODUCTO

  productos = signal<Producto[]>([])
  busqueda = signal('')
  filtroTipo = signal<TipoProducto | ''>('')

  productosFiltrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase()
    const tipo = this.filtroTipo()

    return this.productos().filter(producto =>
      (!tipo || producto.tipoProducto === tipo) &&
      producto.nombre.toLowerCase().includes(texto)
    )
  })

  constructor(private productoService: ProductosService,
              private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarProductos();
  }

  cargarProductos() {

    this.productoService.getAllProductos().subscribe({
      next: (data) => this.productos.set(data),
      error: () => {
        alert('Error: No se pudieron cargar los productos')
        this.router.navigate(['/'])
      }
    })
  }

  cambiarFiltroTipo(valor: string) {
    this.filtroTipo.set(valor as TipoProducto | '')
  }

}

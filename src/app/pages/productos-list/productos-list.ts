import { Component, OnInit, signal } from '@angular/core';
import Producto from '../../models/Producto';
import { ProductosService } from '../../services/productos-service';
import { Router, RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  selector: 'app-productos-list',
  styleUrl: './productos-list.css',
  templateUrl: './productos-list.html',
})
export class ProductosList implements OnInit{

  productos = signal<Producto[]>([])

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


  eliminarProducto(id: string) {
    this.productoService.deleteProducto(id).subscribe({
      next: () => {
        alert('Producto eliminado correctamente')
        this.cargarProductos();
      },
      error: () => {
        alert('Error: No se pudo eliminar el producto elegido')
        this.router.navigate(['/productos'])
      }
    })
  }

}

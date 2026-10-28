import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ClientesService } from '../../../services/Clientes/clientes-service';
import Cliente from '../../../models/Cliente';
import { Router, RouterLink } from '@angular/router';
import { extraerMensajeError } from '../../../utils/error-util';

@Component({
  imports: [RouterLink],
  selector: 'app-clientes-list',
  styleUrl: './clientes-list.css',
  templateUrl: './clientes-list.html',
})
export class ClientesList implements OnInit{

  private clienteService = inject(ClientesService)
  private router = inject(Router)

  clientes = signal<Cliente[]>([])
  busqueda = signal('')

  clientesFiltrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase()

    return this.clientes().filter(cliente => 
      `${cliente.nombre} ${cliente.apellido} ${cliente.telefono}`.toLowerCase().includes(texto)
    )
  })

  ngOnInit(): void {
    this.cargarClientes()
  }

  cargarClientes() {
    this.clienteService.getAllClientes().subscribe({
      next: (data) => this.clientes.set(data),
      error: (error) => {
        alert(`Error: ${extraerMensajeError(error)}`)
        this.router.navigate(['/'])
      }
    })
  }

}

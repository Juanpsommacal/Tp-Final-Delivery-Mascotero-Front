import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProveedoresService } from '../../services/proveedores/proveedores-service';
import { ProveedorRequest } from '../../models/Proveedor';
import { noVacio } from '../../validators/producto-validators';
import { extraerMensajeError } from '../../utils/error-util';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-proveedores-form',
  styleUrl: './proveedores-form.css',
  templateUrl: './proveedores-form.html',
})
export class ProveedoresForm implements OnInit {
  private fb = inject(FormBuilder);
  private proveedoresService = inject(ProveedoresService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  id = signal<string | null>(null);
  guardando = signal(false);
  cargando = signal(false);
  mensaje = signal('');

  formulario = this.fb.group({
    nombre: ['', [Validators.required, noVacio(), Validators.maxLength(100)]],
    telefono: [
      '',
      [Validators.required, noVacio(), Validators.pattern(/^[0-9]+$/), Validators.maxLength(30)],
    ],
    activo: [true, [Validators.required]],
  });

  private mensajes: Record<string, Record<string, string>> = {
    nombre: {
      required: 'El nombre no puede estar vacío',
      noVacio: 'El nombre no puede estar vacío',
      maxlength: 'El nombre no puede exceder los 100 caracteres',
    },
    telefono: {
      required: 'El teléfono no puede estar vacío',
      noVacio: 'El teléfono no puede estar vacío',
      pattern: 'El teléfono solo puede contener números',
      maxlength: 'El teléfono no puede exceder los 30 caracteres',
    },
  };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.id.set(id);
    this.cargarProveedor(id);
  }

  cargarProveedor(id: string) {
    this.cargando.set(true);
    this.proveedoresService.getById(id).subscribe({
      next: (proveedor) => {
        this.formulario.patchValue({
          nombre: proveedor.nombre,
          telefono: proveedor.telefono,
          activo: proveedor.activo,
        });
        this.cargando.set(false);
      },
      error: (error) => {
        console.error('Error al cargar proveedor:', error);
        alert('Error: No se pudo cargar el proveedor');
        this.router.navigate(['/proveedores']);
      },
    });
  }

  mensajeError(campo: string): string | null {
    const control = this.formulario.get(campo);
    if (!control?.touched || !control.errors) return null;

    const error = Object.keys(control.errors)[0];
    return this.mensajes[campo]?.[error] ?? 'Valor inválido';
  }

  filtrarSoloNumeros(event: Event) {
    const input = event.target as HTMLInputElement;
    const soloDigitos = input.value.replace(/\D/g, '');
    if (input.value !== soloDigitos) {
      input.value = soloDigitos;
      this.formulario.controls.telefono.setValue(soloDigitos);
    }
  }

  guardar() {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.mensaje.set('');

    const valores = this.formulario.getRawValue();
    const proveedorDatos: ProveedorRequest = {
      nombre: valores.nombre!.trim(),
      telefono: valores.telefono!.trim(),
      activo: Boolean(valores.activo),
    };

    const id = this.id();
    const peticion = id
      ? this.proveedoresService.update(id, proveedorDatos)
      : this.proveedoresService.create(proveedorDatos);

    peticion.subscribe({
      next: () => {
        alert(id ? 'Proveedor actualizado correctamente' : 'Proveedor creado correctamente');
        this.router.navigate(['/proveedores']);
      },
      error: (error) => {
        this.mensaje.set(extraerMensajeError(error));
        this.guardando.set(false);
      },
    });
  }

  volver() {
    this.router.navigate(['/proveedores']);
  }
}

import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UsuariosService } from '../../../services/usuarios/usuarios-service';
import { AlertaService } from '../../../services/alerta/alerta-service';
import { ConfirmacionService } from '../../../services/confirmacion/confirmacion-service';
import { RoleType, Usuario } from '../../../models/Usuario';
import { extraerMensajeError } from '../../../utils/error-util';

@Component({
  imports: [CommonModule],
  selector: 'app-usuarios-list',
  styleUrl: './usuarios-list.css',
  templateUrl: './usuarios-list.html',
})
export class UsuariosList implements OnInit {
  private usuariosService = inject(UsuariosService);
  private alertaService = inject(AlertaService);
  private confirmacionService = inject(ConfirmacionService);
  private router = inject(Router);

  usuarios = signal<Usuario[]>([]);
  cargando = signal(true);
  procesandoId = signal<number | null>(null);

  busqueda = signal('');
  filtroRol = signal<'TODOS' | 'ADMIN' | 'USER'>('TODOS');

  usuariosFiltrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const rol = this.filtroRol();

    return this.usuarios().filter((u) => {
      const coincideRol = rol === 'TODOS' || u.Role === rol;
      const coincideTexto =
        `${u.nombre} ${u.apellido} ${u.email}`.toLowerCase().includes(texto);

      return coincideRol && coincideTexto;
    });
  });

  totalAdmins = computed(
    () => this.usuarios().filter((u) => u.Role === 'ADMIN').length
  );
  totalUsers = computed(
    () => this.usuarios().filter((u) => u.Role === 'USER').length
  );

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.cargando.set(true);
    this.usuariosService.getUsuarios().subscribe({
      next: (data) => {
        this.usuarios.set(data);
        this.cargando.set(false);
      },
      error: async (error) => {
        this.cargando.set(false);
        await this.alertaService.error(extraerMensajeError(error));
        this.router.navigate(['/']);
      },
    });
  }

  async cambiarRol(usuario: Usuario): Promise<void> {
    const esAdminActual = usuario.Role === 'ADMIN';
    const nuevoRol: RoleType = esAdminActual ? 'USER' : 'ADMIN';

    const confirmado = await this.confirmacionService.confirmar({
      titulo: esAdminActual ? 'Revocar Administrador' : 'Hacer Administrador',
      mensaje: esAdminActual
        ? `¿Deseas quitarle el rol de ADMIN a ${usuario.nombre} ${usuario.apellido}? Pasará a tener rol USER.`
        : `¿Deseas otorgar permisos de ADMIN a ${usuario.nombre} ${usuario.apellido}?`,
      tipo: esAdminActual ? 'peligro' : 'advertencia',
      textoConfirmar: esAdminActual ? 'Sí, revocar a USER' : 'Sí, hacer ADMIN',
      textoCancelar: 'Cancelar',
    });

    if (!confirmado) return;

    this.procesandoId.set(usuario.id);

    const accion$ = esAdminActual
      ? this.usuariosService.revokeRole(usuario.id)
      : this.usuariosService.elevateRole(usuario.id);

    accion$.subscribe({
      next: (usuarioActualizado) => {
        this.procesandoId.set(null);
        this.usuarios.update((lista) =>
          lista.map((u) => (u.id === usuario.id ? usuarioActualizado : u))
        );
        this.alertaService.exito(
          `Rol actualizado correctamente a ${nuevoRol} para ${usuario.nombre}.`
        );
      },
      error: async (error) => {
        this.procesandoId.set(null);
        await this.alertaService.error(extraerMensajeError(error));
      },
    });
  }

  async toggleEstado(usuario: Usuario): Promise<void> {
    const activo = usuario.active;

    const confirmado = await this.confirmacionService.confirmar({
      titulo: activo ? 'Dar de baja usuario' : 'Activar usuario',
      mensaje: activo
        ? `¿Seguro que deseas desactivar la cuenta de ${usuario.nombre} ${usuario.apellido}?`
        : `¿Deseas reactivar la cuenta de ${usuario.nombre} ${usuario.apellido}?`,
      tipo: activo ? 'peligro' : 'info',
      textoConfirmar: activo ? 'Desactivar' : 'Activar',
    });

    if (!confirmado) return;

    this.procesandoId.set(usuario.id);

    const accion$ = activo
      ? this.usuariosService.deactivateUser(usuario.id)
      : this.usuariosService.activateUser(usuario.id);

    accion$.subscribe({
      next: (usuarioActualizado) => {
        this.procesandoId.set(null);
        this.usuarios.update((lista) =>
          lista.map((u) => (u.id === usuario.id ? usuarioActualizado : u))
        );
        this.alertaService.exito(
          `Usuario ${activo ? 'desactivado' : 'activado'} correctamente.`
        );
      },
      error: async (error) => {
        this.procesandoId.set(null);
        await this.alertaService.error(extraerMensajeError(error));
      },
    });
  }
}

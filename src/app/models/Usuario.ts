export type RoleType = 'SUPERADMIN' | 'ADMIN' | 'USER';

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  Role: RoleType;
  active: boolean;
}

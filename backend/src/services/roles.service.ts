import { prisma } from '../prisma';

export interface DefaultRoleDefinition {
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
}

export const DEFAULT_ROLES: DefaultRoleDefinition[] = [
  {
    name: 'ADMIN',
    displayName: 'Administrador',
    description: 'Acceso total a todos los módulos del sistema, personal, finanzas y ajustes.',
    permissions: ['pos', 'inventory', 'settings', 'reports', 'users', 'orders', 'ai', 'billing', 'security'],
    isSystem: true,
  },
  {
    name: 'CASHIER',
    displayName: 'Cajero',
    description: 'Atención y cobro en Punto de Venta (POS), consulta de stock y emisión de tickets.',
    permissions: ['pos', 'orders', 'inventory.view'],
    isSystem: true,
  },
  {
    name: 'WAREHOUSE',
    displayName: 'Almacén',
    description: 'Gestión física de inventario, recepción de mercancía y preparación de pedidos.',
    permissions: ['inventory', 'orders.status'],
    isSystem: true,
  },
  {
    name: 'ACCOUNTANT',
    displayName: 'Contabilidad',
    description: 'Auditoría tributaria, consulta de reportes, facturación fiscal y cierres de caja.',
    permissions: ['reports', 'billing', 'orders.view'],
    isSystem: false,
  },
  {
    name: 'MANAGER',
    displayName: 'Encargado de Tienda',
    description: 'Supervisión de piso de venta, arqueo de caja y reabastecimiento de existencias.',
    permissions: ['pos', 'inventory', 'orders', 'reports'],
    isSystem: false,
  },
];

export class RolesService {
  static async ensureDefaultRoles(): Promise<void> {
    try {
      for (const r of DEFAULT_ROLES) {
        await prisma.role.upsert({
          where: { name: r.name },
          update: {},
          create: {
            name: r.name,
            displayName: r.displayName,
            description: r.description,
            permissions: JSON.stringify(r.permissions),
            isSystem: r.isSystem,
          },
        });
      }
    } catch (err) {
      console.error('Error al inicializar roles por defecto:', err);
    }
  }

  static async listRoles() {
    await this.ensureDefaultRoles();
    const roles = await prisma.role.findMany({
      orderBy: [{ isSystem: 'desc' }, { displayName: 'asc' }],
    });
    return roles.map((r) => ({
      ...r,
      permissions: (() => {
        try { return JSON.parse(r.permissions); } catch { return []; }
      })(),
    }));
  }

  static async createRole(data: { name: string; displayName: string; description?: string; permissions?: string[] }) {
    const formattedName = data.name.toUpperCase().trim().replace(/\s+/g, '_');
    const existing = await prisma.role.findUnique({ where: { name: formattedName } });
    if (existing) {
      throw new Error(`Ya existe un rol con el identificador "${formattedName}"`);
    }

    const created = await prisma.role.create({
      data: {
        name: formattedName,
        displayName: data.displayName.trim(),
        description: data.description?.trim() || null,
        permissions: JSON.stringify(data.permissions || []),
        isSystem: false,
      },
    });

    return {
      ...created,
      permissions: data.permissions || [],
    };
  }

  static async updateRole(id: string, data: { displayName?: string; description?: string; permissions?: string[] }) {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new Error('Rol no encontrado');
    }

    const updated = await prisma.role.update({
      where: { id },
      data: {
        ...(data.displayName && { displayName: data.displayName.trim() }),
        ...(data.description !== undefined && { description: data.description?.trim() || null }),
        ...(data.permissions && { permissions: JSON.stringify(data.permissions) }),
      },
    });

    return {
      ...updated,
      permissions: (() => {
        try { return JSON.parse(updated.permissions); } catch { return []; }
      })(),
    };
  }

  static async deleteRole(id: string) {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new Error('Rol no encontrado');
    }
    if (role.isSystem) {
      throw new Error('No se pueden eliminar los roles predeterminados del sistema');
    }

    // Verificar si hay usuarios asignados a este rol
    const usersCount = await prisma.user.count({ where: { role: role.name } });
    if (usersCount > 0) {
      throw new Error(`No se puede eliminar el rol porque tiene ${usersCount} usuario(s) asignado(s)`);
    }

    await prisma.role.delete({ where: { id } });
    return { success: true, message: `Rol "${role.displayName}" eliminado exitosamente` };
  }
}

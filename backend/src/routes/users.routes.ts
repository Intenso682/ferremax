import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { AuthService } from '../services/auth.service';
import { RolesService } from '../services/roles.service';

export const usersRouter = Router();

// ==========================================
// 1. GESTIÓN DE EMPLEADOS / USUARIOS
// ==========================================

// Listar todos los empleados
usersRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });

    const roles = await RolesService.listRoles();
    const roleMap = new Map(roles.map((r) => [r.name, r]));

    const enrichedUsers = users.map((u) => {
      const r = roleMap.get(u.role);
      return {
        ...u,
        roleDisplayName: r ? r.displayName : u.role,
        roleDescription: r ? r.description : '',
        permissions: r ? r.permissions : [],
      };
    });

    res.json(enrichedUsers);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener lista de personal' });
  }
});

// Registrar nuevo empleado
usersRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, role, phone, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Nombre, correo electrónico y contraseña son obligatorios' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      res.status(400).json({ error: 'Ya existe un usuario con este correo electrónico' });
      return;
    }

    const passwordHash = await AuthService.hashPassword(String(password).trim());
    const userRole = role ? String(role).toUpperCase().trim() : 'CASHIER';

    const newUser = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: cleanEmail,
        phone: phone ? String(phone).trim() : null,
        role: userRole,
        passwordHash,
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      message: 'Empleado registrado exitosamente',
      user: newUser,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al registrar empleado' });
  }
});

// Modificar empleado existente
usersRouter.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { name, email, role, phone, active, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Empleado no encontrado' });
      return;
    }

    const updateData: any = {};
    if (name) updateData.name = String(name).trim();
    if (email) {
      const cleanEmail = String(email).trim().toLowerCase();
      if (cleanEmail !== existing.email) {
        const emailTaken = await prisma.user.findUnique({ where: { email: cleanEmail } });
        if (emailTaken) {
          res.status(400).json({ error: 'El correo electrónico ya está en uso por otro empleado' });
          return;
        }
        updateData.email = cleanEmail;
      }
    }
    if (role) updateData.role = String(role).toUpperCase().trim();
    if (phone !== undefined) updateData.phone = phone ? String(phone).trim() : null;
    if (active !== undefined) updateData.active = Boolean(active);
    if (password && String(password).trim().length > 0) {
      updateData.passwordHash = await AuthService.hashPassword(String(password).trim());
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        updatedAt: true,
      },
    });

    res.json({
      message: 'Empleado actualizado con éxito',
      user: updated,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al actualizar empleado' });
  }
});

// Eliminar o alternar estado de un empleado
usersRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { permanent } = req.query;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: 'Empleado no encontrado' });
      return;
    }

    // No permitir eliminar al último ADMIN
    if (user.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN', active: true } });
      if (adminCount <= 1 && (permanent === 'true' || user.active)) {
        res.status(400).json({ error: 'No es posible desactivar ni eliminar al único Administrador activo del sistema' });
        return;
      }
    }

    if (permanent === 'true') {
      await prisma.user.delete({ where: { id } });
      res.json({ message: 'Empleado eliminado definitivamente del sistema' });
    } else {
      const updated = await prisma.user.update({
        where: { id },
        data: { active: !user.active },
        select: { id: true, name: true, active: true },
      });
      res.json({
        message: updated.active ? 'Empleado reactivado con éxito' : 'Empleado desactivado',
        user: updated,
      });
    }
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al procesar solicitud de empleado' });
  }
});

// ==========================================
// 2. GESTIÓN DE ROLES Y PERMISOS
// ==========================================

// Listar todos los roles
usersRouter.get('/roles/list', async (_req: Request, res: Response): Promise<void> => {
  try {
    const roles = await RolesService.listRoles();
    // Contar usuarios por cada rol
    const counts = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    });
    const countMap = new Map(counts.map((c) => [c.role, c._count.id]));

    const enriched = roles.map((r) => ({
      ...r,
      userCount: countMap.get(r.name) || 0,
    }));

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener roles' });
  }
});

// Crear nuevo rol
usersRouter.post('/roles', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, displayName, description, permissions } = req.body;
    if (!name || !displayName) {
      res.status(400).json({ error: 'Código identificador y nombre descriptivo del rol son obligatorios' });
      return;
    }

    const role = await RolesService.createRole({
      name,
      displayName,
      description,
      permissions: Array.isArray(permissions) ? permissions : [],
    });

    res.status(201).json({
      message: 'Rol creado con éxito',
      role,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al crear rol' });
  }
});

// Modificar rol
usersRouter.put('/roles/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { displayName, description, permissions } = req.body;

    const role = await RolesService.updateRole(id, {
      displayName,
      description,
      permissions,
    });

    res.json({
      message: 'Rol actualizado con éxito',
      role,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al actualizar rol' });
  }
});

// Eliminar rol
usersRouter.delete('/roles/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const result = await RolesService.deleteRole(id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al eliminar rol' });
  }
});

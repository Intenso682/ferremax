import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

export const categoriesRouter = Router();

// Listado de categorías con cantidad de productos
categoriesRouter.get('/', async (_req, res): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al listar categorías' });
  }
});

// Crear categoría (Admin / Almacén)
categoriesRouter.post('/', requireAuth, requireRole(['ADMIN', 'WAREHOUSE']), async (req, res): Promise<void> => {
  try {
    const { name, description, icon } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Nombre de categoría requerido' });
      return;
    }

    const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        icon,
      },
    });

    res.status(201).json(category);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al crear categoría' });
  }
});

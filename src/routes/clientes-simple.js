import express, { Request, Response } from 'express';
import Cliente from '../models/Cliente';

const router = express.Router();

// GET /api/clientes - Obtener todos los clientes
router.get('/', async (req: Request, res: Response) => {
  try {
    const clientes = await Cliente.find().sort({ fechaRegistro: -1 });
    
    res.json({
      success: true,
      count: clientes.length,
      data: clientes
    });
  } catch (error: any) {
    console.error('Error obteniendo clientes:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener clientes'
    });
  }
});

// POST /api/clientes - Crear nuevo cliente
router.post('/', async (req: Request, res: Response) => {
  try {
    const { codigoCasillero, nombre, email, telefono, identidad, direccion } = req.body;
    
    const cliente = await Cliente.create({
      codigoCasillero: codigoCasillero.toUpperCase(),
      nombre,
      email: email.toLowerCase(),
      telefono,
      identidad,
      direccion
    });
    
    res.status(201).json({
      success: true,
      data: cliente,
      message: 'Cliente creado exitosamente'
    });
  } catch (error: any) {
    console.error('Error creando cliente:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al crear cliente'
    });
  }
});

export default router;
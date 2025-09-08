import express, { Request, Response } from 'express';
import Cliente from '../models/Cliente';
import Cobro from '../models/Cobro';

const router = express.Router();

// GET /api/clientes/buscar/:nombre - DEBE IR ANTES de /:id
router.get('/buscar/:nombre', async (req: Request, res: Response) => {
  try {
    const clientes = await Cliente.find({
      nombre: { $regex: req.params.nombre, $options: 'i' },
      activo: true
    })
    .select('nombre codigoCasillero email')
    .limit(10);
    
    res.json({
      success: true,
      data: clientes
    });
  } catch (error: any) {
    console.error('Error buscando clientes:', error);
    res.status(500).json({
      success: false,
      error: 'Error al buscar clientes'
    });
  }
});

// GET /api/clientes - Obtener todos los clientes
router.get('/', async (req: Request, res: Response) => {
  try {
    const { activo, buscar } = req.query;
    
    let filtro: any = {};
    
    if (activo !== undefined) {
      filtro.activo = activo === 'true';
    }
    
    if (buscar) {
      filtro.$or = [
        { nombre: { $regex: buscar, $options: 'i' } },
        { codigoCasillero: { $regex: buscar, $options: 'i' } },
        { email: { $regex: buscar, $options: 'i' } },
        { identidad: { $regex: buscar, $options: 'i' } }
      ];
    }
    
    const clientes = await Cliente.find(filtro).sort({ fechaRegistro: -1 });
    
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

// GET /api/clientes/:id - Obtener un cliente específico
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    
    if (!cliente) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }
    
    const cobros = await Cobro.find({ cliente: cliente._id })
      .sort({ fechaCobro: -1 })
      .limit(10);
    
    res.json({
      success: true,
      data: {
        cliente,
        cobrosRecientes: cobros
      }
    });
  } catch (error: any) {
    console.error('Error obteniendo cliente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener cliente'
    });
  }
});

// POST /api/clientes - Crear nuevo cliente
router.post('/', async (req: Request, res: Response) => {
  try {
    const { codigoCasillero, nombre, email, telefono, identidad, direccion } = req.body;
    
    // Verificar duplicados
    const existeCodigo = await Cliente.findOne({ codigoCasillero: codigoCasillero.toUpperCase() });
    if (existeCodigo) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe un cliente con ese código de casillero'
      });
    }
    
    const existeEmail = await Cliente.findOne({ email: email.toLowerCase() });
    if (existeEmail) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe un cliente con ese email'
      });
    }
    
    const existeIdentidad = await Cliente.findOne({ identidad });
    if (existeIdentidad) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe un cliente con esa identidad'
      });
    }
    
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

// PUT /api/clientes/:id - Actualizar cliente
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { codigoCasillero, email, identidad } = req.body;
    
    const clienteActual = await Cliente.findById(req.params.id);
    if (!clienteActual) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }
    
    // Verificar duplicados solo si se están cambiando
    if (codigoCasillero && codigoCasillero.toUpperCase() !== clienteActual.codigoCasillero) {
      const existe = await Cliente.findOne({ codigoCasillero: codigoCasillero.toUpperCase() });
      if (existe) {
        return res.status(400).json({
          success: false,
          error: 'Ya existe un cliente con ese código de casillero'
        });
      }
    }
    
    if (email && email.toLowerCase() !== clienteActual.email) {
      const existe = await Cliente.findOne({ email: email.toLowerCase() });
      if (existe) {
        return res.status(400).json({
          success: false,
          error: 'Ya existe un cliente con ese email'
        });
      }
    }
    
    if (identidad && identidad !== clienteActual.identidad) {
      const existe = await Cliente.findOne({ identidad });
      if (existe) {
        return res.status(400).json({
          success: false,
          error: 'Ya existe un cliente con esa identidad'
        });
      }
    }
    
    // Actualizar datos
    if (req.body.codigoCasillero) req.body.codigoCasillero = req.body.codigoCasillero.toUpperCase();
    if (req.body.email) req.body.email = req.body.email.toLowerCase();
    
    const cliente = await Cliente.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      data: cliente,
      message: 'Cliente actualizado exitosamente'
    });
  } catch (error: any) {
    console.error('Error actualizando cliente:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al actualizar cliente'
    });
  }
});

// DELETE /api/clientes/:id - Desactivar cliente
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    
    if (!cliente) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }
    
    const cobrosPendientes = await Cobro.countDocuments({
      cliente: cliente._id,
      estado: 'pendiente'
    });
    
    if (cobrosPendientes > 0) {
      return res.status(400).json({
        success: false,
        error: `No se puede desactivar el cliente. Tiene ${cobrosPendientes} cobros pendientes`
      });
    }
    
    cliente.activo = false;
    await cliente.save();
    
    res.json({
      success: true,
      message: 'Cliente desactivado exitosamente'
    });
  } catch (error: any) {
    console.error('Error desactivando cliente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al desactivar cliente'
    });
  }
});

export default router;
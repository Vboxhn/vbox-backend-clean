import express, { Request, Response } from 'express';
import Cobro from '../models/Cobro';
import Cliente from '../models/Cliente';
import htmlPdf from 'html-pdf-node';

const router = express.Router();

// GET /api/cobros - Obtener todos los cobros
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, estado, cliente } = req.query;
    
    let filtro: any = {};
    
    if (estado) {
      filtro.estado = estado;
    }
    
    if (cliente) {
      filtro.cliente = cliente;
    }
    
    const cobros = await Cobro.find(filtro)
      .populate('cliente', 'nombre email telefono codigoCasillero identidad direccion')
      .sort({ fechaCobro: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));
    
    const total = await Cobro.countDocuments(filtro);
    
    res.json({
      success: true,
      data: cobros,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('Error obteniendo cobros:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener cobros'
    });
  }
});

// GET /api/cobros/:id - Obtener un cobro específico
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const cobro = await Cobro.findById(req.params.id)
      .populate('cliente', 'nombre email telefono codigoCasillero identidad direccion');
    
    if (!cobro) {
      return res.status(404).json({
        success: false,
        error: 'Cobro no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: cobro
    });
  } catch (error: any) {
    console.error('Error obteniendo cobro:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener cobro'
    });
  }
});

// POST /api/cobros - Crear nuevo cobro
router.post('/', async (req: Request, res: Response) => {
  try {
    const cobro = await Cobro.create(req.body);
    
    const cobroCompleto = await Cobro.findById(cobro._id)
      .populate('cliente', 'nombre email telefono codigoCasillero');
    
    res.status(201).json({
      success: true,
      data: cobroCompleto,
      message: 'Cobro creado exitosamente'
    });
  } catch (error: any) {
    console.error('Error creando cobro:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al crear cobro'
    });
  }
});

// PUT /api/cobros/:id - Actualizar cobro
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const cobro = await Cobro.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('cliente', 'nombre email telefono codigoCasillero');
    
    if (!cobro) {
      return res.status(404).json({
        success: false,
        error: 'Cobro no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: cobro,
      message: 'Cobro actualizado exitosamente'
    });
  } catch (error: any) {
    console.error('Error actualizando cobro:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al actualizar cobro'
    });
  }
});

// DELETE /api/cobros/:id - Eliminar cobro
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const cobro = await Cobro.findByIdAndDelete(req.params.id);
    
    if (!cobro) {
      return res.status(404).json({
        success: false,
        error: 'Cobro no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Cobro eliminado exitosamente'
    });
  } catch (error: any) {
    console.error('Error eliminando cobro:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar cobro'
    });
  }
});

// GET /api/cobros/:id/pdf - Generar PDF del cobro
router.get('/:id/pdf', async (req: Request, res: Response) => {
  try {
    const cobro = await Cobro.findById(req.params.id)
      .populate('cliente', 'nombre email telefono codigoCasillero identidad direccion');
    
    if (!cobro) {
      return res.status(404).json({
        success: false,
        error: 'Cobro no encontrado'
      });
    }
    
    const htmlContent = generatePDFTemplate(cobro);
    
    const options = {
      format: 'A4',
      border: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      }
    };
    
    const file = { content: htmlContent };
    const pdfBuffer = await htmlPdf.generatePdf(file, options);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Factura-VBOX-${cobro.nombreCliente}-${cobro._id}.pdf"`);
    res.send(pdfBuffer);
    
  } catch (error: any) {
    console.error('Error generando PDF:', error);
    res.status(500).json({
      success: false,
      error: 'Error al generar PDF'
    });
  }
});

// GET /api/cobros/buscar-cliente/:nombre - Buscar clientes para cobros
router.get('/buscar-cliente/:nombre', async (req: Request, res: Response) => {
  try {
    const clientes = await Cliente.find({
      nombre: { $regex: req.params.nombre, $options: 'i' },
      activo: true
    })
    .select('nombre codigoCasillero email telefono')
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

// GET /api/cobros/estadisticas/dashboard - Estadísticas para dashboard
router.get('/estadisticas/dashboard', async (req: Request, res: Response) => {
  try {
    const año = new Date().getFullYear();
    
    // Estadísticas generales
    const totalCobros = await Cobro.countDocuments();
    const cobrosPendientes = await Cobro.countDocuments({ estado: 'pendiente' });
    const cobrosPagados = await Cobro.countDocuments({ estado: 'pagado' });
    
    // Ingresos del mes actual
    const inicioMes = new Date(año, new Date().getMonth(), 1);
    const finMes = new Date(año, new Date().getMonth() + 1, 0);
    
    const ingresosMes = await Cobro.aggregate([
      {
        $match: {
          fechaCobro: { $gte: inicioMes, $lte: finMes },
          estado: 'pagado'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);
    
    // Estadísticas por servicio
    const servicios = await Cobro.aggregate([
      {
        $group: {
          _id: '$tipoServicio',
          cantidad: { $sum: 1 },
          total: { $sum: '$total' }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        resumen: {
          totalCobros,
          cobrosPendientes,
          cobrosPagados,
          ingresosMes: ingresosMes[0]?.total || 0
        },
        servicios
      }
    });
  } catch (error: any) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas'
    });
  }
});

// Función para generar el HTML del PDF
function generatePDFTemplate(cobro: any): string {
  const cliente = cobro.cliente;
  const fecha = new Date(cobro.fechaCobro).toLocaleDateString('es-HN');
  const trackings = Array.isArray(cobro.trackings) ? cobro.trackings : [cobro.trackings].filter(Boolean);
  
  let detallesTarifa = '';
  if (cobro.tipoServicio === 'maritimo') {
    if (cobro.pesoACobrar <= 4) {
      detallesTarifa = `Marítimo 0-4 lb: L. 350.00`;
    } else {
      detallesTarifa = `Marítimo ${cobro.pesoACobrar.toFixed(2)} lb × $2.70`;
    }
  } else if (cobro.tipoServicio === 'aereo_standard') {
    if (cobro.pesoACobrar <= 2) {
      detallesTarifa = `Aéreo Standard 0-2 lb: L. 350.00`;
    } else {
      detallesTarifa = `Aéreo Standard ${cobro.pesoACobrar.toFixed(2)} lb × $5.50`;
    }
  } else if (cobro.tipoServicio === 'aereo_express') {
    if (cobro.pesoACobrar <= 1.5) {
      detallesTarifa = `Aéreo Express 0-1.5 lb: $12.00`;
    } else {
      detallesTarifa = `Aéreo Express ${cobro.pesoACobrar.toFixed(2)} lb × $10.00`;
    }
  } else {
    detallesTarifa = `Tarifa personalizada`;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Factura VBOX - ${cliente.nombre}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #1e3c72; color: white; padding: 30px; text-align: center; }
        .logo { font-size: 48px; font-weight: bold; margin-bottom: 10px; }
        .tagline { font-size: 16px; opacity: 0.9; }
        .invoice-info { display: flex; justify-content: space-between; padding: 20px; }
        .client-info { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .service-details { margin: 20px 0; }
        .billing-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .billing-table th { background: #1e3c72; color: white; padding: 15px; }
        .billing-table td { padding: 15px; border-bottom: 1px solid #ddd; }
        .total-row { background: #f8f9fa; font-weight: bold; font-size: 18px; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; margin-top: 30px; }
        .tracking-item { background: #f0f4f8; padding: 8px; margin: 5px; border-radius: 4px; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">VBOX</div>
        <div class="tagline">Servicio de Courier y Casillero Virtual</div>
        <div>San Pedro Sula, Honduras</div>
      </div>

      <div class="invoice-info">
        <div>
          <h2>FACTURA DE SERVICIO</h2>
          <p>Comprobante de cobro</p>
        </div>
        <div>
          <h2>Nº ${cobro._id.toString().slice(-8).toUpperCase()}</h2>
          <p>Fecha: ${fecha}</p>
          <p>Estado: ${cobro.estado.toUpperCase()}</p>
        </div>
      </div>

      <div class="client-info">
        <h3>INFORMACIÓN DEL CLIENTE</h3>
        <p><strong>Nombre:</strong> ${cliente.nombre}</p>
        <p><strong>Casillero:</strong> ${cliente.codigoCasillero}</p>
        <p><strong>Identidad:</strong> ${cliente.identidad}</p>
        <p><strong>Teléfono:</strong> ${cliente.telefono}</p>
        <p><strong>Email:</strong> ${cliente.email}</p>
        <p><strong>Dirección:</strong> ${cliente.direccion}</p>
      </div>

      <div class="service-details">
        <h3>DETALLES DEL SERVICIO</h3>
        <p><strong>Tipo:</strong> ${cobro.tipoServicio.replace('_', ' ').toUpperCase()}</p>
        <p><strong>Peso a cobrar:</strong> ${cobro.pesoACobrar.toFixed(2)} lb</p>
        <p><strong>Descripción:</strong> ${cobro.descripcion}</p>
        <p><strong>Tasa del dólar:</strong> L. ${cobro.tasaDolar.toFixed(2)}</p>
        
        <h4>Trackings:</h4>
        ${trackings.map(tracking => `<span class="tracking-item">${tracking}</span>`).join('')}
      </div>

      <table class="billing-table">
        <thead>
          <tr>
            <th>Concepto</th>
            <th>Detalles</th>
            <th>Peso</th>
            <th>Monto</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Servicio de Courier</td>
            <td>${detallesTarifa}</td>
            <td>${cobro.pesoACobrar.toFixed(2)} lb</td>
            <td>L. ${cobro.costoEnvio.toFixed(2)}</td>
          </tr>
          ${cobro.descuento > 0 ? `
          <tr>
            <td>Descuento</td>
            <td>${cobro.descuento}% aplicado</td>
            <td>-</td>
            <td>- L. ${(cobro.costoEnvio * cobro.descuento / 100).toFixed(2)}</td>
          </tr>
          ` : ''}
          <tr class="total-row">
            <td colspan="3"><strong>TOTAL A PAGAR</strong></td>
            <td><strong>L. ${cobro.total.toFixed(2)}</strong></td>
          </tr>
        </tbody>
      </table>

      <div class="footer">
        <h4>VBOX - Tu Courier de Confianza</h4>
        <p>Gracias por confiar en nuestros servicios</p>
        <p>Generado: ${new Date().toLocaleString('es-HN')}</p>
      </div>
    </body>
    </html>
  `;
}

export default router;
import mongoose, { Document, Schema } from 'mongoose';

export interface ICobro extends Document {
  cliente: mongoose.Types.ObjectId;
  nombreCliente: string;
  tipoServicio: 'maritimo' | 'aereo_standard' | 'aereo_express' | 'otro';
  trackings: string[];
  descripcion: string;
  peso: number;
  pesoVolumetrico?: number;
  pesoACobrar: number;
  tarifaAplicada: number;
  costoEnvio: number;
  descuento?: number;
  total: number;
  estado: 'pendiente' | 'pagado' | 'cancelado';
  metodoPago?: 'efectivo' | 'transferencia' | 'tarjeta';
  fechaCobro: Date;
  fechaPago?: Date;
  observaciones?: string;
  tasaDolar: number;
  semana: number;
  año: number;
}

const CobroSchema = new Schema<ICobro>({
  cliente: {
    type: Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true
  },
  nombreCliente: {
    type: String,
    required: true
  },
  tipoServicio: {
    type: String,
    enum: ['maritimo', 'aereo_standard', 'aereo_express', 'otro'],
    required: true
  },
  trackings: [{
    type: String,
    required: true
  }],
  descripcion: {
    type: String,
    required: true
  },
  peso: {
    type: Number,
    required: true
  },
  pesoVolumetrico: {
    type: Number
  },
  pesoACobrar: {
    type: Number,
    required: true
  },
  tarifaAplicada: {
    type: Number,
    required: true
  },
  costoEnvio: {
    type: Number,
    required: true
  },
  descuento: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  estado: {
    type: String,
    enum: ['pendiente', 'pagado', 'cancelado'],
    default: 'pendiente'
  },
  metodoPago: {
    type: String,
    enum: ['efectivo', 'transferencia', 'tarjeta']
  },
  fechaCobro: {
    type: Date,
    default: Date.now
  },
  fechaPago: {
    type: Date
  },
  observaciones: {
    type: String
  },
  tasaDolar: {
    type: Number,
    required: true
  },
  semana: {
    type: Number
  },
  año: {
    type: Number
  }
}, {
  timestamps: true,
  versionKey: false
});

// Calcular semana del año antes de guardar
CobroSchema.pre('save', function(next) {
  const fecha = this.fechaCobro || new Date();
  const inicioAño = new Date(fecha.getFullYear(), 0, 1);
  const dias = Math.floor((fecha.getTime() - inicioAño.getTime()) / (24 * 60 * 60 * 1000));
  this.semana = Math.ceil((dias + 1) / 7);
  this.año = fecha.getFullYear();
  next();
});

export default mongoose.model<ICobro>('Cobro', CobroSchema);
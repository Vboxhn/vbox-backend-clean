import mongoose, { Document, Schema } from 'mongoose';

export interface ICliente extends Document {
  codigoCasillero: string;
  nombre: string;
  email: string;
  telefono: string;
  identidad: string;
  direccion: string;
  fechaRegistro: Date;
  activo: boolean;
  saldoPendiente: number;
}

const ClienteSchema = new Schema<ICliente>({
  codigoCasillero: {
    type: String,
    required: [true, 'El código de casillero es obligatorio'],
    unique: true,
    uppercase: true,
    trim: true
  },
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'El email es obligatorio'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Por favor ingrese un email válido']
  },
  telefono: {
    type: String,
    required: [true, 'El teléfono es obligatorio'],
    trim: true
  },
  identidad: {
    type: String,
    required: [true, 'La identidad es obligatoria'],
    unique: true,
    trim: true
  },
  direccion: {
    type: String,
    required: [true, 'La dirección es obligatoria'],
    trim: true
  },
  fechaRegistro: {
    type: Date,
    default: Date.now
  },
  activo: {
    type: Boolean,
    default: true
  },
  saldoPendiente: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  versionKey: false
});

export default mongoose.model<ICliente>('Cliente', ClienteSchema);
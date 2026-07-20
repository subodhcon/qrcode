import mongoose from 'mongoose';

const qrCodeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  data: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  imagePath: { type: String },
  locationId: { type: String },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

export const QRCode = mongoose.model('QRCode', qrCodeSchema);

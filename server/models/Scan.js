import mongoose from 'mongoose';

const scanSchema = new mongoose.Schema({
  qrCodeId: { type: String, required: true },
  scannedAt: { type: Date, default: Date.now }
});

export const Scan = mongoose.model('Scan', scanSchema);

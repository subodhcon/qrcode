import mongoose from 'mongoose';

const medicalCenterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  description: { type: String },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

export const MedicalCenter = mongoose.model('MedicalCenter', medicalCenterSchema);

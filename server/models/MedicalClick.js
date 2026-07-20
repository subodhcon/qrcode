import mongoose from 'mongoose';

const medicalClickSchema = new mongoose.Schema({
  medicalCenterId: { type: String, required: true },
  clickedAt: { type: Date, default: Date.now }
});

export const MedicalClick = mongoose.model('MedicalClick', medicalClickSchema);

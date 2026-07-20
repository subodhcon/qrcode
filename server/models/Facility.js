import mongoose from 'mongoose';

const facilitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  description: { type: String },
  type: { 
    type: String, 
    enum: ['Medical', 'Toilet', 'Police', 'Help'], 
    default: 'Medical' 
  },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

export const Facility = mongoose.model('Facility', facilitySchema);

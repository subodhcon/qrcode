import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  type: { type: String },
  description: { type: String }
}, { timestamps: true });

export const Location = mongoose.model('Location', locationSchema);

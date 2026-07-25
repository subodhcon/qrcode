import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  emoji: { type: String, required: true },
  keyword: { type: String, required: true },
  googleType: { type: String },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

export const Category = mongoose.model('Category', categorySchema);

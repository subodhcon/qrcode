import mongoose from 'mongoose';

const navigationClickSchema = new mongoose.Schema({
  locationId: { type: String, required: true },
  clickedAt: { type: Date, default: Date.now }
});

export const NavigationClick = mongoose.model('NavigationClick', navigationClickSchema);

import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  phone: { type: String, default: '' },
  category: { 
    type: String, 
    enum: ['Incorrect Info', 'Damaged Signboard', 'Suggestion', 'Other'],
    required: true 
  },
  locationContext: { type: String, default: '' },
  message: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['New', 'Resolved'], 
    default: 'New' 
  }
}, { timestamps: true });

export const Feedback = mongoose.model('Feedback', feedbackSchema);

import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Male' },
  relation: { type: String, default: 'Member' },
  photoUrl: { type: String }
}, { _id: false });

const touristSchema = new mongoose.Schema({
  registrationNo: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['individual', 'group'],
    default: 'individual',
    index: true
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone/WhatsApp number is required'],
    trim: true,
    index: true
  },
  countryCode: {
    type: String,
    default: '+91'
  },
  emergencyContact: {
    name: { type: String, default: '' },
    phone: { type: String, required: [true, 'Emergency contact phone is required'] },
    relation: { type: String, default: 'Relative / Guide' }
  },
  photoUrl: {
    type: String,
    default: ''
  },
  photoPublicId: {
    type: String,
    default: ''
  },
  idCardPhotoUrl: {
    type: String,
    default: ''
  },
  idCardPublicId: {
    type: String,
    default: ''
  },
  idCardType: {
    type: String,
    enum: ['Aadhaar', 'Passport', 'Voter ID', 'Driving License', 'National ID', 'Other'],
    default: 'Aadhaar'
  },
  idCardNumber: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  },
  city: {
    type: String,
    default: ''
  },
  state: {
    type: String,
    default: ''
  },
  country: {
    type: String,
    default: 'India',
    index: true
  },
  // Group Specific Details
  groupName: {
    type: String,
    default: ''
  },
  totalMembers: {
    type: Number,
    default: 1
  },
  members: [memberSchema],

  visitPurpose: {
    type: String,
    default: 'Bodh Gaya Pilgrimage / दर्शन'
  },
  status: {
    type: String,
    enum: ['Active', 'Completed', 'Cancelled'],
    default: 'Active',
    index: true
  },
  registeredBy: {
    type: String,
    default: 'Admin Desk'
  }
}, {
  timestamps: true
});

// Helper static method to generate next unique registration number
touristSchema.statics.generateRegistrationNo = async function(type = 'individual') {
  const currentYear = new Date().getFullYear();
  const prefix = type === 'group' ? `BG-GRP-${currentYear}` : `BG-TR-${currentYear}`;
  
  // Find highest current sequence number for this year
  const count = await this.countDocuments({
    registrationNo: new RegExp(`^${prefix}`)
  });

  const randomSalt = Math.floor(1000 + Math.random() * 9000);
  const sequence = String(count + 1).padStart(4, '0');
  return `${prefix}-${sequence}${randomSalt.toString().slice(-2)}`;
};

export const Tourist = mongoose.models.Tourist || mongoose.model('Tourist', touristSchema);
export default Tourist;

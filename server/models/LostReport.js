import mongoose from 'mongoose';

const lostReportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  touristId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tourist',
    default: null
  },
  passId: {
    type: String,
    default: '',
    trim: true,
    index: true
  },
  touristName: {
    type: String,
    required: [true, 'Tourist/Pilgrim name is required'],
    trim: true
  },
  phone: {
    type: String,
    default: '',
    trim: true
  },
  countryCode: {
    type: String,
    default: '+91'
  },
  photoUrl: {
    type: String,
    default: ''
  },
  groupName: {
    type: String,
    default: '',
    trim: true
  },
  emergencyContact: {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    relation: { type: String, default: '' }
  },
  counterNo: {
    type: Number,
    required: [true, 'Counter number is required'],
    min: 1,
    max: 10,
    index: true
  },
  counterName: {
    type: String,
    required: [true, 'Counter name/location is required'],
    trim: true
  },
  reportedBy: {
    type: String,
    default: 'Counter Volunteer',
    trim: true
  },
  volunteerPhone: {
    type: String,
    default: '',
    trim: true
  },
  notes: {
    type: String,
    default: '',
    trim: true
  },
  status: {
    type: String,
    enum: ['Reported', 'Rescue Dispatched', 'Reunited', 'Closed'],
    default: 'Reported',
    index: true
  },
  assignedRescuer: {
    type: String,
    default: '',
    trim: true
  },
  reunitedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

const LostReport = mongoose.model('LostReport', lostReportSchema);
export default LostReport;

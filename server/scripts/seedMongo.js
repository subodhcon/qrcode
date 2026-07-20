import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Location } from '../models/Location.js';
import { Facility } from '../models/Facility.js';
import { QRCode } from '../models/QRCode.js';
import { connectMongo } from '../config/mongo.js';

async function seed() {
  await connectMongo();

  console.log('Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Location.deleteMany({}),
    Facility.deleteMany({}),
    QRCode.deleteMany({})
  ]);

  console.log('Seeding new data...');

  // 1. Seed Admin User
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync('admin123', salt);
  const admin = await User.create({
    email: 'admin@example.com',
    password: hashedPassword
  });
  console.log('Admin seeded:', admin.email);

  const hashedPassword2 = bcrypt.hashSync('Password!123', salt);
  const admin2 = await User.create({
    email: 'admin@gmail.com',
    password: hashedPassword2
  });
  console.log('Second Admin seeded:', admin2.email);

  // 2. Seed Location (Kushwaha Haveli)
  const location = await Location.create({
    name: 'Kushwaha Haveli',
    slug: 'kushwaha-haveli',
    latitude: 26.5819369,
    longitude: 85.5436774,
    type: 'Gate',
    description: 'Main Entrance - Kushwaha Haveli'
  });
  console.log('Location seeded:', location.name);

  // 3. Seed Facilities (Multiple entries of each type)
  // --- MEDICAL CARE ---
  const clinic1 = await Facility.create({
    name: 'Haveli First-Aid Point',
    latitude: 26.5823,
    longitude: 85.5442,
    description: 'Immediate first-aid care, bandage, and local support.',
    type: 'Medical',
    status: 'Active'
  });
  console.log('Medical facility seeded:', clinic1.name);

  const clinic2 = await Facility.create({
    name: 'Sitamarhi Emergency Care Clinic',
    latitude: 26.5828,
    longitude: 85.5436,
    description: '24/7 Primary Emergency Care Clinic with active doctors.',
    type: 'Medical',
    status: 'Active'
  });
  console.log('Medical facility seeded:', clinic2.name);

  const clinic3 = await Facility.create({
    name: 'Red Cross Pharmacy & Clinic',
    latitude: 26.5835,
    longitude: 85.5430,
    description: 'Red Cross medical assistance point and pharmacy.',
    type: 'Medical',
    status: 'Active'
  });
  console.log('Medical facility seeded:', clinic3.name);

  // --- RESTROOMS / TOILETS ---
  const restroom1 = await Facility.create({
    name: 'Haveli Public Restrooms',
    latitude: 26.5821,
    longitude: 85.5439,
    description: 'Clean public restrooms and hygiene facility.',
    type: 'Toilet',
    status: 'Active'
  });
  console.log('Restroom facility seeded:', restroom1.name);

  const restroom2 = await Facility.create({
    name: 'Haveli South Restrooms',
    latitude: 26.5816,
    longitude: 85.5432,
    description: 'Secondary toilets located in the south wing.',
    type: 'Toilet',
    status: 'Active'
  });
  console.log('Restroom facility seeded:', restroom2.name);

  // --- SECURITY / POLICE ---
  const police1 = await Facility.create({
    name: 'Haveli Security Guard Post',
    latitude: 26.5818,
    longitude: 85.5435,
    description: 'Local security assistance desk at the main gate.',
    type: 'Police',
    status: 'Active'
  });
  console.log('Security facility seeded:', police1.name);

  const police2 = await Facility.create({
    name: 'Area Police Assistance Booth',
    latitude: 26.5810,
    longitude: 85.5428,
    description: 'Sitamarhi Police checkpoint and assistance booth.',
    type: 'Police',
    status: 'Active'
  });
  console.log('Security facility seeded:', police2.name);

  // --- HELP DESKS ---
  const helpdesk1 = await Facility.create({
    name: 'Haveli Visitor Information Desk',
    latitude: 26.5815,
    longitude: 85.5434,
    description: 'Help desk for local information and event navigation.',
    type: 'Help',
    status: 'Active'
  });
  console.log('Help Desk facility seeded:', helpdesk1.name);

  const helpdesk2 = await Facility.create({
    name: 'Sitamarhi Tourism Help Center',
    latitude: 26.5825,
    longitude: 85.5450,
    description: 'Tourism assistance and local guides support desk.',
    type: 'Help',
    status: 'Active'
  });
  console.log('Help Desk facility seeded:', helpdesk2.name);

  // 4. Seed QR Code referencing Location
  const qr = await QRCode.create({
    title: 'Kushwaha Haveli Access QR',
    slug: 'kushwaha-haveli-access-qr',
    data: 'https://qrcode-ljrv.vercel.app/location/kushwaha-haveli',
    status: 'active',
    imagePath: '/qrcodes/kushwaha-haveli-access-qr.png',
    locationId: location._id.toString()
  });
  console.log('QR Code seeded:', qr.title);

  console.log('✅ Seeding completed!');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});

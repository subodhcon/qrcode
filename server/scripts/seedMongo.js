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

  // 2. Seed Location
  const location = await Location.create({
    name: 'Main Gate',
    slug: 'main-gate',
    latitude: 51.505,
    longitude: -0.09,
    type: 'Gate',
    description: 'Campus Main Gate Location'
  });
  console.log('Location seeded:', location.name);

  // 3. Seed Facilities (Medical, Toilet, Police, Help)
  const clinic = await Facility.create({
    name: 'Campus Emergency Clinic',
    latitude: 51.506,
    longitude: -0.091,
    description: 'Primary emergency care clinic for visitors and staff.',
    type: 'Medical',
    status: 'Active'
  });
  console.log('Medical facility seeded:', clinic.name);

  const restroom = await Facility.create({
    name: 'Main Gate Restrooms',
    latitude: 51.5052,
    longitude: -0.0902,
    description: 'Public restroom facility located near the entrance.',
    type: 'Toilet',
    status: 'Active'
  });
  console.log('Restroom facility seeded:', restroom.name);

  const police = await Facility.create({
    name: 'Campus Police Station',
    latitude: 51.507,
    longitude: -0.092,
    description: 'Campus security headquarters and emergency dispatch.',
    type: 'Police',
    status: 'Active'
  });
  console.log('Security facility seeded:', police.name);

  const helpdesk = await Facility.create({
    name: 'Visitor Info Desk',
    latitude: 51.5055,
    longitude: -0.0898,
    description: 'Help desk and information center.',
    type: 'Help',
    status: 'Active'
  });
  console.log('Help Desk facility seeded:', helpdesk.name);

  // 4. Seed QR Code referencing Location
  const qr = await QRCode.create({
    title: 'Main Gate Access QR',
    slug: 'main-gate-access-qr',
    data: 'http://localhost:5173/location/main-gate',
    status: 'active',
    imagePath: '/qrcodes/main-gate-access-qr.png',
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

import mongoose from 'mongoose';
import { Location } from '../models/Location.js';
import { Facility } from '../models/Facility.js';
import { QRCode } from '../models/QRCode.js';
import { connectMongo } from '../config/mongo.js';

async function clearData() {
  await connectMongo();

  console.log('Clearing location, facility, and QR code data...');
  try {
    const results = await Promise.all([
      Location.deleteMany({}),
      Facility.deleteMany({}),
      QRCode.deleteMany({})
    ]);
    
    console.log(`🧹 Cleanup completed successfully!`);
    console.log(`Deleted Locations count: ${results[0].deletedCount}`);
    console.log(`Deleted Facilities count: ${results[1].deletedCount}`);
    console.log(`Deleted QR Codes count: ${results[2].deletedCount}`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Cleanup failed:', err);
    process.exit(1);
  }
}

clearData().catch(err => {
  console.error('❌ Connection failed:', err);
  process.exit(1);
});

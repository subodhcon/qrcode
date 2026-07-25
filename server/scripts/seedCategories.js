import mongoose from 'mongoose';
import { Category } from '../models/Category.js';
import { connectMongo } from '../config/mongo.js';

async function seedCategories() {
  await connectMongo();

  console.log('Clearing old categories...');
  await Category.deleteMany({});

  console.log('Seeding default active categories...');
  const defaults = [
    {
      name: 'Medical',
      emoji: '🚑',
      keyword: 'hospital|clinic|doctor',
      googleType: 'hospital'
    },
    {
      name: 'Restrooms',
      emoji: '🚻',
      keyword: 'toilet|restroom',
      googleType: ''
    },
    {
      name: 'Security',
      emoji: '🚨',
      keyword: 'police',
      googleType: 'police'
    },
    {
      name: 'Help Desk',
      emoji: 'ℹ️',
      keyword: 'information|help desk|tourist',
      googleType: ''
    }
  ];

  await Category.insertMany(defaults);
  console.log('✅ Default categories successfully seeded!');
  process.exit(0);
}

seedCategories().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});

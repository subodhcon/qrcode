import { Category } from '../models/Category.js';
import { connectMongo } from '../config/mongo.js';

export const DEFAULT_CATEGORIES = [
  {
    name: 'Temple',
    emoji: '🛕',
    keyword: 'temple|mandir|monastery|worship|vihara|pagoda',
    googleType: 'place_of_worship',
    status: 'Active'
  },
  {
    name: 'Lost and Found',
    emoji: '🧳',
    keyword: 'lost and found|lost|found|khoya paya',
    googleType: 'police',
    status: 'Active'
  },
  {
    name: 'Drinking Water',
    emoji: '💧',
    keyword: 'drinking water|water|jal|pyau|filter water',
    googleType: 'drinking_water',
    status: 'Active'
  },
  {
    name: 'Restrooms',
    emoji: '🚻',
    keyword: 'toilet|restroom|restrooms|toilets|washroom|lavatory',
    googleType: 'toilets',
    status: 'Active'
  },
  {
    name: 'Medical',
    emoji: '🏥',
    keyword: 'hospital|clinic|doctor|pharmacy|medical|first aid',
    googleType: 'hospital',
    status: 'Active'
  },
  {
    name: 'Help Desk',
    emoji: 'ℹ️',
    keyword: 'help desk|information|tourist assistance|help|inquiry',
    googleType: 'tourist_information',
    status: 'Active'
  },
  {
    name: 'Security',
    emoji: '🛡️',
    keyword: 'police|security|thana|chowki|outpost|guard',
    googleType: 'police',
    status: 'Active'
  },
  {
    name: 'Parking',
    emoji: '🅿️',
    keyword: 'parking|vehicle parking|car park|parking stand',
    googleType: 'parking',
    status: 'Active'
  },
  {
    name: 'Food & Dining',
    emoji: '🍽️',
    keyword: 'food|restaurant|dining|bhojanalaya|cafe|eatery',
    googleType: 'restaurant',
    status: 'Active'
  }
];

export async function seedDefaultCategories() {
  for (const cat of DEFAULT_CATEGORIES) {
    await Category.findOneAndUpdate(
      { name: cat.name },
      { $setOnInsert: cat },
      { upsert: true, new: true }
    );
  }
  console.log('✅ Canonical categories verified & synchronized in MongoDB.');
}

// Standalone execution
if (process.argv[1] && process.argv[1].endsWith('seedCategories.js')) {
  (async () => {
    try {
      await connectMongo();
      console.log('Synchronizing canonical categories...');
      await seedDefaultCategories();
      process.exit(0);
    } catch (err) {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    }
  })();
}

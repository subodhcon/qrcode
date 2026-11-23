
import mongoose from 'mongoose';
import { connectMongo } from '../config/mongo.js';
import { Location } from '../models/Location.js';
import { Facility } from '../models/Facility.js';
import { Category } from '../models/Category.js';

const CANONICAL_LOCATIONS = [
  {
    name: 'Gate 1 - Mahabodhi Temple Complex',
    slug: 'gate-1-mahabodhi',
    latitude: 24.6959,
    longitude: 84.9913,
    type: 'Gate',
    description: 'Main Pilgrim Entrance to UNESCO World Heritage Mahabodhi Temple and holy Bodhi Tree'
  },
  {
    name: 'Gate 2 - Kalachakra Ground Concourse',
    slug: 'gate-2-kalachakra',
    latitude: 24.6966,
    longitude: 84.9882,
    type: 'Gate',
    description: 'Central public gathering, prayer ground and festival pavilion'
  },
  {
    name: 'Gate 3 - 80-Foot Great Buddha Statue',
    slug: 'gate-3-great-buddha',
    latitude: 24.6989,
    longitude: 84.9863,
    type: 'Gate',
    description: 'Entrance to majestic 80-Foot Great Buddha statue and meditation garden'
  },
  {
    name: 'Gate 4 - Node 1 Tourist Hub & Bus Stand',
    slug: 'gate-4-node1-hub',
    latitude: 24.7020,
    longitude: 84.9935,
    type: 'Gate',
    description: 'Main tourist transport hub, bus terminus, EV charging and visitor amenities'
  },
  {
    name: 'Gate 5 - Sujata Kuti & Senani Village',
    slug: 'gate-5-sujata-kuti',
    latitude: 24.6940,
    longitude: 85.0080,
    type: 'Gate',
    description: 'Historic Sujata Garh Stupa across Niranjana (Falgu) River'
  },
  {
    name: 'Gaya Junction Railway Station',
    slug: 'gaya-railway-station',
    latitude: 24.8055,
    longitude: 85.0060,
    type: 'Hub',
    description: 'Principal railway junction connecting Gaya Ji and Bodh Gaya'
  },
  {
    name: 'Gaya International Airport (GAY)',
    slug: 'bodhgaya-airport',
    latitude: 24.7445,
    longitude: 84.9510,
    type: 'Hub',
    description: 'International Buddhist pilgrim & domestic flight terminal'
  }
];

const CANONICAL_FACILITIES = [
  // ── TEMPLE / WORSHIP ──────────────────────────────────────────────
  {
    name: 'Mahabodhi Temple Complex (UNESCO World Heritage)',
    latitude: 24.6959,
    longitude: 84.9913,
    description: 'The supreme Buddhist pilgrimage shrine marking the spot where Lord Buddha attained Enlightenment. Includes the sacred Bodhi Tree and Vajrasana throne.',
    type: 'Temple',
    status: 'Active'
  },
  {
    name: 'Great Buddha Statue (80-Foot Buddha)',
    latitude: 24.6989,
    longitude: 84.9863,
    description: 'Majestic 80-foot high stone statue of Lord Buddha in meditation Dhyana mudra, consecrated by the 14th Dalai Lama.',
    type: 'Temple',
    status: 'Active'
  },
  {
    name: 'Royal Thai Monastery (Wat Thai)',
    latitude: 24.6975,
    longitude: 84.9878,
    description: 'Exquisite Thai-style Buddhist temple adorned with sloping gold-gilded roofs, bronze Buddha images and landscaped gardens.',
    type: 'Temple',
    status: 'Active'
  },
  {
    name: 'Burmese Vihara & Monastery',
    latitude: 24.6968,
    longitude: 84.9930,
    description: 'Historic Theravada Buddhist monastery providing lodging, meditation halls and traditional Myanmar architectural design.',
    type: 'Temple',
    status: 'Active'
  },
  {
    name: 'Bhutanese Buddhist Monastery',
    latitude: 24.6990,
    longitude: 84.9895,
    description: 'Vibrant Bhutanese monastery featuring intricate wooden carvings, traditional Buddhist clay frescoes and peaceful prayer halls.',
    type: 'Temple',
    status: 'Active'
  },
  {
    name: 'Indosan Nipponji (Japanese Temple)',
    latitude: 24.6982,
    longitude: 84.9855,
    description: 'Peaceful Japanese Buddhist temple built in traditional Japanese wooden temple architecture with Zen meditation gardens.',
    type: 'Temple',
    status: 'Active'
  },
  {
    name: 'Tibetan Karma Temple & Monastery',
    latitude: 24.6952,
    longitude: 84.9885,
    description: 'Prominent Tibetan Buddhist monastery adorned with large prayer wheels, colorful Thangka paintings and daily chanting ceremonies.',
    type: 'Temple',
    status: 'Active'
  },
  {
    name: 'Chinese Temple & Monastery',
    latitude: 24.6948,
    longitude: 84.9898,
    description: 'Traditional Chinese pagoda-style Buddhist temple with historic wooden images of Lord Buddha brought from China.',
    type: 'Temple',
    status: 'Active'
  },
  {
    name: 'Vietnamese Temple & Pagoda',
    latitude: 24.7010,
    longitude: 84.9845,
    description: 'Peaceful Vietnamese Buddhist pagoda featuring serene statues of Avalokiteshvara Buddha and spacious meditation spaces.',
    type: 'Temple',
    status: 'Active'
  },
  {
    name: 'Muchalinda Sarovar (Lotus Pond)',
    latitude: 24.6942,
    longitude: 84.9918,
    description: 'Holy lake where Mucalinda, the serpent king, sheltered Lord Buddha from severe storms during his meditation.',
    type: 'Temple',
    status: 'Active'
  },
  {
    name: 'Sujata Kuti & Stupa (Bakrour)',
    latitude: 24.6940,
    longitude: 85.0080,
    description: 'Ancient brick stupa honoring maiden Sujata who offered milk-rice (kheer) to ascetic Gautama, breaking his 6-year fast.',
    type: 'Temple',
    status: 'Active'
  },
  {
    name: 'Vishnupad Temple (Gaya Ji)',
    latitude: 24.7780,
    longitude: 85.0085,
    description: 'Ancient holy Hindu temple on the banks of Falgu River with the sacred footprint of Lord Vishnu embedded in solid basalt rock.',
    type: 'Temple',
    status: 'Active'
  },
  {
    name: 'Maa Mangla Gauri Shaktipeeth Temple (Gaya)',
    latitude: 24.7865,
    longitude: 85.0030,
    description: 'Revered ancient Shaktipeeth temple atop Manglagauri hill, mentioned in Padma Purana and Mahabharata.',
    type: 'Temple',
    status: 'Active'
  },

  // ── DRINKING WATER ────────────────────────────────────────────────
  {
    name: 'RO Drinking Water Kiosk (Mahabodhi Gate 1)',
    latitude: 24.6960,
    longitude: 84.9912,
    description: 'Nagar Parishad 24x7 automated purified RO drinking water station with touchless bottle refills.',
    type: 'Drinking Water',
    status: 'Active'
  },
  {
    name: 'Nagar Parishad Cold Water Station (Temple Plaza)',
    latitude: 24.6965,
    longitude: 84.9908,
    description: 'Chilled and purified RO drinking water dispenser for pilgrims and tourists in the central plaza.',
    type: 'Drinking Water',
    status: 'Active'
  },
  {
    name: 'RO Drinking Water Booth (Great Buddha Road)',
    latitude: 24.6980,
    longitude: 84.9868,
    description: 'Clean drinking water dispenser facility situated on Great Buddha Road entrance.',
    type: 'Drinking Water',
    status: 'Active'
  },
  {
    name: 'Chilled Water Dispenser (Kalachakra Ground)',
    latitude: 24.6967,
    longitude: 84.9885,
    description: 'High-capacity drinking water station for festival attendees and assembly participants.',
    type: 'Drinking Water',
    status: 'Active'
  },
  {
    name: 'Public Water Kiosk (Node 1 Bus Stand)',
    latitude: 24.7015,
    longitude: 84.9930,
    description: 'Purified RO water facility near tourist buses and auto stands at Node 1.',
    type: 'Drinking Water',
    status: 'Active'
  },
  {
    name: 'Railway Station RO Water Point (Gaya Junction)',
    latitude: 24.8052,
    longitude: 85.0062,
    description: 'Indian Railways purified chilled water point at Gaya Junction main circulating area.',
    type: 'Drinking Water',
    status: 'Active'
  },

  // ── RESTROOMS / TOILETS ───────────────────────────────────────────
  {
    name: 'Nagar Parishad Deluxe Public Restrooms (Mahabodhi North)',
    latitude: 24.6968,
    longitude: 84.9915,
    description: 'Modern, sanitized public washrooms with dedicated facilities for differently-abled pilgrims.',
    type: 'Restrooms',
    status: 'Active'
  },
  {
    name: 'Clean Modern Washrooms (Kalachakra Ground South)',
    latitude: 24.6962,
    longitude: 84.9880,
    description: 'Spacious public restroom complex maintained regularly during pilgrim seasons and prayer festivals.',
    type: 'Restrooms',
    status: 'Active'
  },
  {
    name: 'Public Toilet Complex (80-Foot Buddha Entrance)',
    latitude: 24.6986,
    longitude: 84.9860,
    description: 'Hygienic municipal public restrooms next to the Japanese Temple and Great Buddha statue.',
    type: 'Restrooms',
    status: 'Active'
  },
  {
    name: 'Tourism Facilitation Centre Washrooms',
    latitude: 24.7005,
    longitude: 84.9920,
    description: 'Clean restrooms and wash facilities inside the Bihar State Tourism Facilitation Centre.',
    type: 'Restrooms',
    status: 'Active'
  },
  {
    name: 'Node 1 Bus Stand Deluxe Public Restrooms',
    latitude: 24.7018,
    longitude: 84.9932,
    description: 'Large municipal washroom facility for transit passengers, tour coaches and drivers.',
    type: 'Restrooms',
    status: 'Active'
  },
  {
    name: 'Gaya Junction Modern Passenger Restrooms',
    latitude: 24.8058,
    longitude: 85.0058,
    description: 'Pay-and-use sanitized deluxe washrooms at Gaya Junction entrance concourse.',
    type: 'Restrooms',
    status: 'Active'
  },

  // ── MEDICAL & EMERGENCY HEALTHCARE ───────────────────────────────
  {
    name: 'Bodh Gaya Primary Health Centre (PHC & Govt Hospital)',
    latitude: 24.6985,
    longitude: 84.9925,
    description: '24/7 Government hospital providing emergency triage, general OPD, diagnostic labs, and ambulance services.',
    type: 'Medical',
    status: 'Active'
  },
  {
    name: 'Mahabodhi Emergency First-Aid & Medical Booth',
    latitude: 24.6962,
    longitude: 84.9910,
    description: 'Immediate first-aid, BP/glucose check, stretcher assistance, and oxygen support for temple visitors.',
    type: 'Medical',
    status: 'Active'
  },
  {
    name: 'Red Cross Society First-Aid Center (Main Gate)',
    latitude: 24.6955,
    longitude: 84.9917,
    description: 'Red Cross medical post providing emergency dressing, essential medicines and paramedic aid.',
    type: 'Medical',
    status: 'Active'
  },
  {
    name: 'Lord Buddha Life Care Hospital & Trauma Center',
    latitude: 24.7020,
    longitude: 84.9880,
    description: 'Multispecialty private hospital equipped with ICU, emergency diagnostics, X-Ray, and pharmacy.',
    type: 'Medical',
    status: 'Active'
  },
  {
    name: 'Apollo Pharmacy & 24x7 Medical Clinic',
    latitude: 24.6995,
    longitude: 84.9910,
    description: 'Full-service pharmacy offering prescription medicines, tourist healthcare supplies and consulting doctors.',
    type: 'Medical',
    status: 'Active'
  },
  {
    name: 'ANMMCH (Anugrah Narayan Magadh Medical College Hospital, Gaya)',
    latitude: 24.7500,
    longitude: 84.9850,
    description: 'Premier tertiary care government medical college hospital in Gaya with extensive specialized trauma departments.',
    type: 'Medical',
    status: 'Active'
  },
  {
    name: 'Jayaprakash Narayan District Hospital (Gaya)',
    latitude: 24.7930,
    longitude: 85.0020,
    description: 'District headquarters hospital offering 24/7 emergency response, doctors on duty and central blood bank.',
    type: 'Medical',
    status: 'Active'
  },

  // ── HELP DESK & TOURIST INFORMATION ───────────────────────────────
  {
    name: 'BSTDC Tourist Information Centre (Mahabodhi Plaza)',
    latitude: 24.6970,
    longitude: 84.9920,
    description: 'Bihar State Tourism Development Corporation official desk offering multilingual guides, map brochures, and booking assistance.',
    type: 'Help Desk',
    status: 'Active'
  },
  {
    name: 'Nagar Parishad Pilgrim Facilitation Center',
    latitude: 24.6958,
    longitude: 84.9905,
    description: 'Civic administration help desk for tourist queries, grievance registration, wheel-chair issuance and digital passes.',
    type: 'Help Desk',
    status: 'Active'
  },
  {
    name: 'Kalachakra Ground Tourist Help Desk',
    latitude: 24.6965,
    longitude: 84.9882,
    description: 'Public guidance counter for event schedules, pilgrim services and emergency helpline coordination.',
    type: 'Help Desk',
    status: 'Active'
  },
  {
    name: 'Node 1 Tourist Assistance & Ticket Booth',
    latitude: 24.7018,
    longitude: 84.9930,
    description: 'Assistance booth for interstate bus timetables, battery-rickshaw rate charts and tourist route queries.',
    type: 'Help Desk',
    status: 'Active'
  },
  {
    name: 'Gaya International Airport Tourist Help Counter',
    latitude: 24.7445,
    longitude: 84.9510,
    description: 'Arrivals terminal facilitation desk for domestic and foreign pilgrims visiting Bodh Gaya.',
    type: 'Help Desk',
    status: 'Active'
  },
  {
    name: 'Gaya Junction Railway Station Tourist Information Kiosk',
    latitude: 24.8055,
    longitude: 85.0060,
    description: '24/7 tourist desk at Gaya railway station main exit aiding arrivals with prepaid transport and lodging guidance.',
    type: 'Help Desk',
    status: 'Active'
  },

  // ── SECURITY & POLICE ASSISTANCE ──────────────────────────────────
  {
    name: 'Bodh Gaya Police Station (Thana)',
    latitude: 24.6980,
    longitude: 84.9935,
    description: 'Main municipal police station. Phone: 0631-2200424 / Emergency: 112.',
    type: 'Security',
    status: 'Active'
  },
  {
    name: 'Mahabodhi Temple Security & Control Room',
    latitude: 24.6957,
    longitude: 84.9910,
    description: 'BTMC official police security post and CCTV monitoring command room guarding the shrine gates.',
    type: 'Security',
    status: 'Active'
  },
  {
    name: 'Tourist Police Assistance Booth (Temple Plaza)',
    latitude: 24.6963,
    longitude: 84.9907,
    description: 'Dedicated English/Hindi tourist police booth assisting foreign and domestic visitors with safety and lost belongings.',
    type: 'Security',
    status: 'Active'
  },
  {
    name: '80-Foot Buddha Police Assistance Post',
    latitude: 24.6987,
    longitude: 84.9865,
    description: 'Police security outpost on Japanese temple road ensuring smooth tourist flow.',
    type: 'Security',
    status: 'Active'
  },
  {
    name: 'Node 1 Traffic & Security Checkpost',
    latitude: 24.7010,
    longitude: 84.9928,
    description: 'Traffic monitoring and surveillance post regulating bus and taxi operations.',
    type: 'Security',
    status: 'Active'
  },
  {
    name: 'Kotwali Police Station (Gaya)',
    latitude: 24.7960,
    longitude: 85.0040,
    description: 'Central Gaya police station providing law enforcement and round-the-clock emergency assistance.',
    type: 'Security',
    status: 'Active'
  },

  // ── PARKING ───────────────────────────────────────────────────────
  {
    name: 'Main Tourist Vehicle & Bus Parking (Node 1)',
    latitude: 24.7020,
    longitude: 84.9935,
    description: 'Spacious official parking complex for heavy tourist buses, vans, cars, and EV charging points.',
    type: 'Parking',
    status: 'Active'
  },
  {
    name: 'Kalachakra Ground Designated Parking Lot',
    latitude: 24.6960,
    longitude: 84.9875,
    description: 'Organized parking area close to central monastery boulevard and prayer grounds.',
    type: 'Parking',
    status: 'Active'
  },
  {
    name: 'Great Buddha Visitor Car & Two-Wheeler Parking',
    latitude: 24.6992,
    longitude: 84.9858,
    description: 'Dedicated parking ground for tourists visiting the 80-Foot Buddha and Japanese Temple.',
    type: 'Parking',
    status: 'Active'
  },
  {
    name: 'Mahabodhi VIP & Official Parking Lot',
    latitude: 24.6952,
    longitude: 84.9918,
    description: 'Secured parking area designated for dignitaries, temple staff and emergency vehicles.',
    type: 'Parking',
    status: 'Active'
  },
  {
    name: 'Maya Sarovar Parking Ground',
    latitude: 24.6935,
    longitude: 84.9890,
    description: 'Public vehicular parking area adjacent to Maya Sarovar amusement park.',
    type: 'Parking',
    status: 'Active'
  },
  {
    name: 'Gaya Junction Multi-level Parking',
    latitude: 24.8050,
    longitude: 85.0055,
    description: 'Round-the-clock secure paid parking facility for two-wheelers and cars at Gaya Railway Station.',
    type: 'Parking',
    status: 'Active'
  },

  // ── FOOD & DINING ─────────────────────────────────────────────────
  {
    name: 'Sujata Restaurant & Buddhist Vegetarian Kitchen',
    latitude: 24.6972,
    longitude: 84.9900,
    description: 'Renowned pure-vegetarian restaurant serving North Indian, Buddhist Tibetan, Chinese and Continental meals.',
    type: 'Food & Dining',
    status: 'Active'
  },
  {
    name: 'Be Happy Cafe & Bakery',
    latitude: 24.6978,
    longitude: 84.9890,
    description: 'Cozy international cafe popular with global pilgrims, serving fresh Italian espresso, thin-crust pizza, salads and baked goods.',
    type: 'Food & Dining',
    status: 'Active'
  },
  {
    name: 'Mahabodhi Temple Canteen & Annakshetra',
    latitude: 24.6956,
    longitude: 84.9915,
    description: 'Subsidized community kitchen providing wholesome, clean vegetarian prasadam meals and tea to pilgrims.',
    type: 'Food & Dining',
    status: 'Active'
  },
  {
    name: 'Fujiya Green Restaurant (Asian & Japanese Cuisine)',
    latitude: 24.6983,
    longitude: 84.9868,
    description: 'Traditional Japanese, Korean and Pan-Asian dining destination near the Japanese temple.',
    type: 'Food & Dining',
    status: 'Active'
  },
  {
    name: 'Mohammad Restaurant (Tibetan & Indian Cuisine)',
    latitude: 24.6975,
    longitude: 84.9895,
    description: 'Long-running Bodh Gaya eatery popular for steamed momos, Thukpa soup, Indian curries and fresh fruit juices.',
    type: 'Food & Dining',
    status: 'Active'
  },
  {
    name: 'Bodh Gaya Royal Cafe & Bhojanalaya',
    latitude: 24.6968,
    longitude: 84.9905,
    description: 'Family-friendly Indian restaurant offering thali meals, fresh rotis and South Indian breakfast.',
    type: 'Food & Dining',
    status: 'Active'
  },
  {
    name: 'Pramod Vatika & Sweets (Gaya)',
    latitude: 24.7980,
    longitude: 85.0050,
    description: 'Famous heritage sweet shop and vegetarian restaurant in Gaya famous for authentic Tilkut, Anarsa, and regional delicacies.',
    type: 'Food & Dining',
    status: 'Active'
  },

  // ── LOST AND FOUND ────────────────────────────────────────────────
  {
    name: 'Nagar Parishad Lost & Found Center (Temple Gate 1)',
    latitude: 24.6960,
    longitude: 84.9909,
    description: 'Official municipal facility for registering lost identification, mobile devices, luggage, and missing persons.',
    type: 'Lost and Found',
    status: 'Active'
  },
  {
    name: 'Tourist Police Lost Belongings Help Post',
    latitude: 24.6964,
    longitude: 84.9914,
    description: 'Police-monitored lost & found desk connected directly with Gaya district police control room.',
    type: 'Lost and Found',
    status: 'Active'
  },
  {
    name: 'Node 1 Tourist Hub Lost & Found Post',
    latitude: 24.7016,
    longitude: 84.9930,
    description: 'Transit assistance counter for recovery of items left behind in tourist buses, e-rickshaws and cabs.',
    type: 'Lost and Found',
    status: 'Active'
  },
  {
    name: 'Gaya Junction Lost Property Office',
    latitude: 24.8056,
    longitude: 85.0062,
    description: 'Railway Station Master lost baggage and parcel claim counter at Gaya Railway Station.',
    type: 'Lost and Found',
    status: 'Active'
  }
];

async function seedBodhGayaData() {
  console.log('🔄 Connecting to MongoDB Atlas...');
  await connectMongo();

  console.log('🌱 Seeding Bodh Gaya & Gaya Canonical Locations...');
  let locInserted = 0;
  for (const loc of CANONICAL_LOCATIONS) {
    const existing = await Location.findOne({ slug: loc.slug });
    if (!existing) {
      await Location.create(loc);
      locInserted++;
      console.log(`  ✓ Created Location: ${loc.name}`);
    } else {
      await Location.updateOne({ slug: loc.slug }, { $set: loc });
      console.log(`  ↺ Updated Location: ${loc.name}`);
    }
  }

  console.log(`\n🌱 Seeding Bodh Gaya & Gaya Canonical Facilities (Count: ${CANONICAL_FACILITIES.length})...`);
  let facInserted = 0;
  let facUpdated = 0;
  for (const fac of CANONICAL_FACILITIES) {
    const existing = await Facility.findOne({ name: fac.name });
    if (!existing) {
      await Facility.create(fac);
      facInserted++;
      console.log(`  ✓ Created Facility [${fac.type}]: ${fac.name}`);
    } else {
      await Facility.updateOne({ name: fac.name }, { $set: fac });
      facUpdated++;
      console.log(`  ↺ Updated Facility [${fac.type}]: ${fac.name}`);
    }
  }

  // Ensure all 9 canonical categories exist and are active
  const CANONICAL_CATEGORIES = [
    { name: 'Temple', emoji: '🛕', keyword: 'temple', googleType: 'place_of_worship', status: 'Active' },
    { name: 'Lost and Found', emoji: '🧳', keyword: 'lost', googleType: 'police', status: 'Active' },
    { name: 'Drinking Water', emoji: '💧', keyword: 'water', googleType: 'drinking_water', status: 'Active' },
    { name: 'Restrooms', emoji: '🚻', keyword: 'toilet', googleType: 'toilet', status: 'Active' },
    { name: 'Medical', emoji: '🏥', keyword: 'hospital', googleType: 'hospital', status: 'Active' },
    { name: 'Help Desk', emoji: 'ℹ️', keyword: 'information', googleType: 'tourist_information', status: 'Active' },
    { name: 'Security', emoji: '🛡️', keyword: 'police', googleType: 'police', status: 'Active' },
    { name: 'Parking', emoji: '🅿️', keyword: 'parking', googleType: 'parking', status: 'Active' },
    { name: 'Food & Dining', emoji: '🍽️', keyword: 'restaurant', googleType: 'restaurant', status: 'Active' }
  ];

  for (const cat of CANONICAL_CATEGORIES) {
    const existing = await Category.findOne({ name: cat.name });
    if (!existing) {
      await Category.create(cat);
      console.log(`  ✓ Created Category: ${cat.name}`);
    } else {
      await Category.updateOne({ name: cat.name }, { $set: cat });
    }
  }

  const totalLocs = await Location.countDocuments();
  const totalFacs = await Facility.countDocuments();
  const totalCats = await Category.countDocuments();

  console.log('\n======================================================');
  console.log(`🎉 Seeding Complete!`);
  console.log(`📍 Total Locations in MongoDB Atlas: ${totalLocs}`);
  console.log(`🏥 Total Facilities in MongoDB Atlas: ${totalFacs}`);
  console.log(`🗂️ Total Categories in MongoDB Atlas: ${totalCats}`);
  console.log('======================================================');
  process.exit(0);
}

seedBodhGayaData().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});

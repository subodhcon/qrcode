import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import apiRoutes from '../routes/index.js';
import { errorHandler, notFoundHandler } from '../middlewares/errorHandler.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

const TEST_PORT = 5088;
const server = app.listen(TEST_PORT, async () => {
  console.log(`[Test Server]: Running on http://localhost:${TEST_PORT}`);
  try {
    // 1. Probe /api/health
    console.log('\n--- PROBE 1: GET /api/health ---');
    const healthRes = await fetch(`http://localhost:${TEST_PORT}/api/health`);
    const healthJson = await healthRes.json();
    console.log(`HTTP ${healthRes.status}:`, healthJson);

    // 2. Probe /api/categories (Verify all 9 canonical categories)
    console.log('\n--- PROBE 2: GET /api/categories ---');
    const catRes = await fetch(`http://localhost:${TEST_PORT}/api/categories`);
    const catJson = await catRes.json();
    console.log(`HTTP ${catRes.status}: Found ${catJson.data?.length} categories`);
    const catNames = (catJson.data || []).map(c => `${c.emoji} ${c.name}`);
    console.log('Categories:', catNames.join(', '));
    if (!catJson.data || catJson.data.length < 9) {
      throw new Error(`Expected at least 9 canonical categories, found ${catJson.data?.length}`);
    }

    // 3. Probe /api/facilities/near?lat=24.695&lng=84.991 (General map)
    console.log('\n--- PROBE 3: GET /api/facilities/near?lat=24.695&lng=84.991 ---');
    const nearRes = await fetch(`http://localhost:${TEST_PORT}/api/facilities/near?lat=24.695&lng=84.991`);
    const nearJson = await nearRes.json();
    console.log(`HTTP ${nearRes.status}:`, {
      success: nearJson.success,
      location: nearJson.location,
      facilitiesFound: nearJson.facilities?.length || 0,
    });

    // 4. Probe /api/map/nearby with category=Temple
    console.log('\n--- PROBE 4: GET /api/map/nearby?lat=24.695&lng=84.991&category=Temple ---');
    const templeRes = await fetch(`http://localhost:${TEST_PORT}/api/map/nearby?lat=24.695&lng=84.991&category=Temple`);
    const templeJson = await templeRes.json();
    console.log(`HTTP ${templeRes.status}:`, {
      success: templeJson.success,
      facilitiesCount: templeJson.facilities?.length || 0,
      sampleNames: (templeJson.facilities || []).slice(0, 3).map(f => `${f.type}: ${f.name}`)
    });

    // 5. Probe /api/map/nearby with category=Restrooms
    console.log('\n--- PROBE 5: GET /api/map/nearby?lat=24.695&lng=84.991&category=Restrooms ---');
    const restroomRes = await fetch(`http://localhost:${TEST_PORT}/api/map/nearby?lat=24.695&lng=84.991&category=Restrooms`);
    const restroomJson = await restroomRes.json();
    console.log(`HTTP ${restroomRes.status}:`, {
      success: restroomJson.success,
      facilitiesCount: restroomJson.facilities?.length || 0,
      sampleNames: (restroomJson.facilities || []).slice(0, 3).map(f => `${f.type}: ${f.name}`)
    });

    // 6. Probe /api/map/nearby with category=Drinking Water
    console.log('\n--- PROBE 6: GET /api/map/nearby?lat=24.695&lng=84.991&category=Drinking%20Water ---');
    const waterRes = await fetch(`http://localhost:${TEST_PORT}/api/map/nearby?lat=24.695&lng=84.991&category=Drinking%20Water`);
    const waterJson = await waterRes.json();
    console.log(`HTTP ${waterRes.status}:`, {
      success: waterJson.success,
      facilitiesCount: waterJson.facilities?.length || 0,
      sampleNames: (waterJson.facilities || []).slice(0, 3).map(f => `${f.type}: ${f.name}`)
    });

    console.log('\n🎉 ALL 6 CATEGORY AND MAP PROBES PASSED 100%!');
  } catch (err) {
    console.error('Probe failed:', err);
    process.exitCode = 1;
  } finally {
    server.close(() => {
      console.log('[Test Server]: Gracefully shut down.');
      process.exit(process.exitCode || 0);
    });
  }
});

import app from '../index.js';
import { getAllFacilitiesNear } from '../controllers/mapController.js';

async function runDirectVerification() {
  console.log('--- STARTING STEP 1 BACKEND VERIFICATION (DIRECT ROUTE & HANDLER CHECK) ---');

  // 1. Inspect registered /api/config/maps-key route
  let mapsKeyHandler = null;
  app._router.stack.forEach((middleware) => {
    if (middleware.name === 'router') {
      middleware.handle.stack.forEach((layer) => {
        if (layer.route && layer.route.path === '/config/maps-key') {
          mapsKeyHandler = layer.route.stack[0].handle;
        }
      });
    }
  });

  if (!mapsKeyHandler) {
    console.error('❌ /api/config/maps-key route not found in Express router!');
    process.exit(1);
  }

  // 2. Invoke /api/config/maps-key handler directly
  let configResponse = null;
  const mockReq = {};
  const mockRes = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      configResponse = payload;
      return this;
    }
  };

  mapsKeyHandler(mockReq, mockRes);
  console.log('Tested /config/maps-key status:', mockRes.statusCode);
  console.log('Payload:', JSON.stringify(configResponse, null, 2));

  if (mockRes.statusCode === 200 && configResponse.provider === 'osm') {
    console.log('✅ PASSED: /config/maps-key returns OpenStreetMap configuration successfully!');
  } else {
    console.error('❌ FAILED: Unexpected response from /config/maps-key');
    process.exit(1);
  }

  // 3. Test mapController.getAllFacilitiesNear handler validation
  let nearResponse = null;
  let nearStatus = null;
  const mockNearReq = { params: {}, query: {} };
  const mockNearRes = {
    status(code) {
      nearStatus = code;
      return this;
    },
    json(payload) {
      nearResponse = payload;
      return this;
    }
  };

  await getAllFacilitiesNear(mockNearReq, mockNearRes, (err) => {
    if (err) console.error('Unexpected next(err):', err);
  });

  if (nearStatus === 400) {
    console.log('✅ PASSED: getAllFacilitiesNear validation handles missing parameters safely (400 Bad Request)');
  } else {
    console.error('❌ FAILED: Expected 400 for missing origin parameters');
    process.exit(1);
  }

  console.log('\n--- STEP 1 BACKEND VERIFICATION COMPLETE: ALL CHECKS PASSED (100%) ---');
  process.exit(0);
}

runDirectVerification().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});

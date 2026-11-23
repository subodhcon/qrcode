import app from '../index.js';
import { Facility } from '../models/Facility.js';
import * as analytics from '../controllers/analyticsController.js';

console.log('\n--- VERIFYING ISSUE #2: qrRoutes & analyticsController ---');

// 1. Verify analytics exports
const requiredExports = ['trackQRScan', 'trackNavigationClick', 'trackMedicalClick', 'getDashboardStats', 'getTelemetryStats'];
let exportsPassed = true;
requiredExports.forEach((fnName) => {
  if (typeof analytics[fnName] === 'function') {
    console.log(`✅ [EXPORT FOUND]: analyticsController.${fnName}()`);
  } else {
    console.error(`❌ [MISSING EXPORT]: analyticsController.${fnName}`);
    exportsPassed = false;
  }
});

// 2. Verify router mounting for /api/qrcodes
const routes = [];
app._router.stack.forEach((middleware) => {
  if (middleware.name === 'router') {
    middleware.handle.stack.forEach((handler) => {
      if (handler.route) {
        routes.push({ path: '/api' + handler.route.path, methods: Object.keys(handler.route.methods) });
      } else if (handler.name === 'router') {
        // Sub-router like /qrcodes
        handler.handle.stack.forEach((subHandler) => {
          if (subHandler.route) {
            routes.push({ path: '/api/qrcodes' + subHandler.route.path, methods: Object.keys(subHandler.route.methods) });
          }
        });
      }
    });
  }
});

const targetQRRoutes = [
  '/api/qrcodes/',
  '/api/qrcodes/:slug/download',
  '/api/qrcodes/:slug/scan',
  '/api/qrcodes/medical/:id/click'
];

let qrRoutesPassed = true;
targetQRRoutes.forEach((target) => {
  const found = routes.find((r) => r.path === target);
  if (found) {
    console.log(`✅ [ROUTE MOUNTED]: ${target} [${found.methods.join(', ').toUpperCase()}]`);
  } else {
    console.error(`❌ [ROUTE MISSING]: ${target}`);
    qrRoutesPassed = false;
  }
});

console.log('\n--- VERIFYING ISSUE #3: Dynamic Category Types in Facility Schema ---');

// 3. Test Facility schema validation with custom categories
const testCategories = ['Drinking Water', 'Restrooms', 'Security', 'Temple', 'Help Desk'];
let schemaPassed = true;

testCategories.forEach((cat) => {
  const testDoc = new Facility({
    name: `Test Facility - ${cat}`,
    latitude: 26.58,
    longitude: 85.54,
    type: cat,
    status: 'Active'
  });
  
  const validateError = testDoc.validateSync();
  if (validateError) {
    console.error(`❌ [VALIDATION FAILED] Category '${cat}':`, validateError.message);
    schemaPassed = false;
  } else {
    console.log(`✅ [VALIDATION SUCCESS] Dynamic Category '${cat}' accepted without error.`);
  }
});

if (exportsPassed && qrRoutesPassed && schemaPassed) {
  console.log('\n🎯 VERIFICATION RESULT: Issues #2 and #3 successfully resolved and verified!\n');
  process.exit(0);
} else {
  console.error('\n❌ VERIFICATION FAILED\n');
  process.exit(1);
}

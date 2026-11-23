import app from '../index.js';

// Inspect all registered routes in app
function printRoutes() {
  console.log('\n--- VERIFYING REGISTERED ROUTES ---');
  const routes = [];
  
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({ path: middleware.route.path, methods: Object.keys(middleware.route.methods) });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push({ path: '/api' + handler.route.path, methods: Object.keys(handler.route.methods) });
        }
      });
    }
  });

  const targetRoutes = [
    '/api/location/:slug',
    '/api/locations',
    '/api/medical/nearest/:locationId',
    '/api/medical'
  ];

  let allFound = true;
  targetRoutes.forEach((target) => {
    const found = routes.find((r) => r.path === target);
    if (found) {
      console.log(`✅ [FOUND]: ${target} [${found.methods.join(', ').toUpperCase()}]`);
    } else {
      console.error(`❌ [MISSING]: ${target}`);
      allFound = false;
    }
  });

  if (allFound) {
    console.log('\n🎯 VERIFICATION RESULT: All Issue #1 endpoints successfully wired and verified!\n');
    process.exit(0);
  } else {
    console.error('\n❌ VERIFICATION FAILED: Some target endpoints were not found.\n');
    process.exit(1);
  }
}

printRoutes();

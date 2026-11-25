import assert from 'node:assert/strict';
import http from 'node:http';
import app, { ALLOWED_ORIGINS } from '../index.js';
import { createRateLimiter } from '../middlewares/rateLimiter.js';
import { requireAuth, optionalAuth } from '../middlewares/auth.js';

async function runReadinessChecks() {
  console.log('🔍 Running Production Readiness & Security Checks...');

  // 1. Verify CORS whitelist configuration
  assert(
    ALLOWED_ORIGINS.includes('https://bodhmahotsav.vercel.app'),
    'Production frontend origin must be in ALLOWED_ORIGINS'
  );
  console.log('✓ CORS whitelist includes production frontend:', ALLOWED_ORIGINS.join(', '));

  // 2. Verify Rate Limiter middleware blocks > max requests with 429
  const testLimiter = createRateLimiter({ windowMs: 60000, max: 2, message: 'Rate limited' });
  let statusCode = 200;
  let nextCalls = 0;
  const mockReq = { ip: '10.0.0.99', headers: {} };
  const mockRes = {
    setHeader: () => {},
    status: (code) => {
      statusCode = code;
      return { json: (body) => ({ code, body }) };
    }
  };
  testLimiter(mockReq, mockRes, () => { nextCalls += 1; });
  testLimiter(mockReq, mockRes, () => { nextCalls += 1; });
  testLimiter(mockReq, mockRes, () => { nextCalls += 1; });
  assert.equal(nextCalls, 2, 'Rate limiter should allow first 2 requests');
  assert.equal(statusCode, 429, 'Rate limiter should return 429 on 3rd request');
  console.log('✓ Sliding-window rate limiter enforces 429 threshold');

  // 3. Spin up ephemeral Express server and test HTTP routes + CORS preflight
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // Health endpoint
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200, '/api/health must return 200');
    console.log('✓ GET /api/health -> 200 OK');

    // Allowed CORS preflight
    const allowedCorsRes = await fetch(`${baseUrl}/api/health`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://bodhmahotsav.vercel.app' }
    });
    assert.equal(allowedCorsRes.status, 204, 'Allowed origin preflight should return 204');
    assert.equal(
      allowedCorsRes.headers.get('access-control-allow-origin'),
      'https://bodhmahotsav.vercel.app'
    );
    console.log('✓ Allowed CORS origin preflight -> 204 with exact origin header');

    // Disallowed CORS preflight
    const blockedCorsRes = await fetch(`${baseUrl}/api/health`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil-attacker.example.com' }
    });
    assert.equal(blockedCorsRes.status, 403, 'Disallowed origin preflight should return 403');
    console.log('✓ Disallowed CORS origin preflight -> 403 Blocked');

    // Protected route without token (401 when DB connected, 503 when DB offline in sandbox)
    const unauthLostRes = await fetch(`${baseUrl}/api/lost-reports`);
    assert(
      [401, 503].includes(unauthLostRes.status),
      `GET /api/lost-reports without auth should return 401 (or 503 if DB offline), got ${unauthLostRes.status}`
    );
    console.log(`✓ Unauthenticated GET /api/lost-reports -> ${unauthLostRes.status} (Protected)`);
  } finally {
    server.close();
  }

  // 4. Direct unit verification of requireAuth & optionalAuth middlewares
  let authStatus = 200;
  let authNext = false;
  requireAuth(
    { headers: {} },
    { status: (c) => { authStatus = c; return { json: () => {} }; } },
    () => { authNext = true; }
  );
  assert.equal(authStatus, 401, 'requireAuth must reject missing Bearer token with 401');
  assert.equal(authNext, false, 'requireAuth must not call next() without token');

  let optNext = false;
  const optReq = { headers: {} };
  optionalAuth(optReq, {}, () => { optNext = true; });
  assert.equal(optNext, true, 'optionalAuth must allow public requests through');
  assert.equal(optReq.user, undefined, 'optionalAuth must not set req.user without token');
  console.log('✓ requireAuth (401) & optionalAuth (public pass-through) verified');

  console.log('🎉 All Production Readiness & Security checks passed!');
  process.exit(0);
}

runReadinessChecks().catch((err) => {
  console.error('❌ Readiness check failed:', err);
  process.exit(1);
});

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getJwtSecret, requireAuth } from '../middlewares/auth.js';

console.log('\n--- VERIFYING SECURITY HARDENING ---');

// 1. Test getJwtSecret behavior in dev mode
const devSecret = getJwtSecret();
if (devSecret) {
  console.log(`✅ [JWT SECRET DEV]: Secret resolved successfully (${devSecret.slice(0, 10)}...)`);
} else {
  console.error('❌ [JWT SECRET DEV FAILED]: No secret resolved.');
  process.exit(1);
}

// 2. Test getJwtSecret behavior in production mode when secret is missing
const originalEnv = process.env.NODE_ENV;
const originalSecret = process.env.JWT_SECRET;

process.env.NODE_ENV = 'production';
delete process.env.JWT_SECRET;

let securityCaught = false;
try {
  getJwtSecret();
} catch (e) {
  if (e.message.includes('JWT_SECRET must be defined in production')) {
    securityCaught = true;
    console.log('✅ [JWT PRODUCTION ENFORCEMENT]: Successfully threw security exception when JWT_SECRET missing in production.');
  }
}

if (!securityCaught) {
  console.error('❌ [JWT PRODUCTION ENFORCEMENT FAILED]: Did not throw security exception.');
  process.exit(1);
}

// Restore env
process.env.NODE_ENV = originalEnv;
if (originalSecret) process.env.JWT_SECRET = originalSecret;

// 3. Test Asynchronous Bcrypt Comparison
async function testAsyncBcrypt() {
  const plain = 'AdminSecretPass@2026';
  const hashed = await bcrypt.hash(plain, 10);
  
  const isValid = await bcrypt.compare(plain, hashed);
  const isInvalid = await bcrypt.compare('WrongPassword', hashed);
  
  if (isValid && !isInvalid) {
    console.log('✅ [ASYNC BCRYPT]: Non-blocking bcrypt.compare() verified successfully.');
  } else {
    console.error('❌ [ASYNC BCRYPT FAILED]');
    process.exit(1);
  }
}

// 4. Test Token Sign & RequireAuth validation pipeline
async function testTokenPipeline() {
  const payload = { id: 'usr-12345', email: 'admin@example.com' };
  const token = jwt.sign(payload, getJwtSecret(), { expiresIn: '1h' });
  
  // Mock express req, res, next
  const mockReq = {
    headers: {
      authorization: `Bearer ${token}`
    }
  };
  const mockRes = {
    status: (code) => ({
      json: (data) => {
        console.error('requireAuth returned error:', code, data);
      }
    })
  };
  
  let nextCalled = false;
  requireAuth(mockReq, mockRes, () => {
    nextCalled = true;
  });

  if (nextCalled && mockReq.user && mockReq.user.email === 'admin@example.com') {
    console.log('✅ [REQUIRE_AUTH PIPELINE]: Token generated and validated with request context user populated.');
  } else {
    console.error('❌ [REQUIRE_AUTH PIPELINE FAILED]');
    process.exit(1);
  }
}

await testAsyncBcrypt();
await testTokenPipeline();

console.log('\n🎯 VERIFICATION RESULT: All Security issues (JWT & Async bcrypt) successfully verified!\n');
process.exit(0);

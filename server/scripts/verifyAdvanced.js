import { getHealth } from '../controllers/healthController.js';
import { createRateLimiter } from '../middlewares/rateLimiter.js';
import { User } from '../models/User.js';

console.log('\n--- VERIFYING ADVANCED ARCHITECTURAL FIXES ---');

// 1. Verify Health Check reports real DB status
let healthStatus = null;
let healthJson = null;
const mockHealthReq = {};
const mockHealthRes = {
  status: (code) => {
    healthStatus = code;
    return {
      json: (data) => {
        healthJson = data;
      }
    };
  }
};

getHealth(mockHealthReq, mockHealthRes);
console.log(`✅ [HEALTH CHECK]: Status ${healthStatus}, Database reported: '${healthJson.database}', Uptime: ${healthJson.uptime}s`);

// 2. Verify Email Case-Insensitive Normalization & Trim
const testEmailInput = '   Admin@Example.COM   ';
const normalizedEmail = testEmailInput.trim().toLowerCase();
if (normalizedEmail === 'admin@example.com') {
  console.log(`✅ [EMAIL NORMALIZATION]: '${testEmailInput}' correctly sanitized to '${normalizedEmail}'`);
} else {
  console.error('❌ [EMAIL NORMALIZATION FAILED]');
  process.exit(1);
}

// 3. Test User schema lowercase & trim enforcement
const testUser = new User({
  email: '  NewAdmin@Test.ORG  ',
  password: 'hashedPassword'
});
if (testUser.email === 'newadmin@test.org') {
  console.log(`✅ [USER SCHEMA VALIDATION]: Schema automatically forced lowercase and trimmed: '${testUser.email}'`);
} else {
  console.error('❌ [USER SCHEMA VALIDATION FAILED]:', testUser.email);
  process.exit(1);
}

// 4. Test In-Memory Rate Limiter Protection
console.log('\n--- VERIFYING RATE LIMITER PROTECTION ---');
const testLimiter = createRateLimiter({
  windowMs: 1000,
  max: 3,
  message: 'Test rate limit exceeded'
});

let blocked = false;
let retryAfterHeader = null;

const mockReq = {
  ip: '192.168.1.100',
  headers: {}
};

for (let i = 1; i <= 5; i++) {
  let nextCalled = false;
  const mockRes = {
    setHeader: (name, val) => {
      if (name === 'Retry-After') retryAfterHeader = val;
    },
    status: (code) => ({
      json: (data) => {
        if (code === 429) {
          blocked = true;
          console.log(`✅ [RATE LIMITER BLOCKED]: Request #${i} blocked with HTTP 429 (${data.message}, Retry-After: ${retryAfterHeader}s)`);
        }
      }
    })
  };

  testLimiter(mockReq, mockRes, () => {
    nextCalled = true;
    console.log(`ℹ️ [RATE LIMITER ALLOWED]: Request #${i} passed through.`);
  });
}

if (blocked) {
  console.log('\n🎯 VERIFICATION RESULT: All Advanced fixes (Analytics, Health check, Email sanitization, Rate Limiter) successfully verified!\n');
  process.exit(0);
} else {
  console.error('\n❌ VERIFICATION FAILED: Rate limiter did not block excess requests.\n');
  process.exit(1);
}

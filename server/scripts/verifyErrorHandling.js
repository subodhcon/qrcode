import { errorHandler } from '../middlewares/errorHandler.js';

console.log('\n--- VERIFYING ERROR & EXCEPTION HANDLING PIPELINE ---');

function mockResponse() {
  const res = {
    statusCode: null,
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    }
  };
  return res;
}

const mockReq = { method: 'GET', originalUrl: '/api/test' };

// 1. Test CastError handling
const castError = new Error('Cast to ObjectId failed for value "123" at path "_id"');
castError.name = 'CastError';
castError.path = '_id';

const res1 = mockResponse();
errorHandler(castError, mockReq, res1, () => {});

if (res1.statusCode === 400 && res1.jsonData.success === false && res1.jsonData.message.includes('invalid id format')) {
  console.log(`✅ [CAST_ERROR]: Handled with HTTP 400 (${res1.jsonData.message})`);
} else {
  console.error('❌ [CAST_ERROR FAILED]:', res1.statusCode, res1.jsonData);
  process.exit(1);
}

// 2. Test Duplicate Key Error (Code 11000)
const dupError = new Error('E11000 duplicate key error collection');
dupError.code = 11000;
dupError.keyValue = { slug: 'main-gate' };

const res2 = mockResponse();
errorHandler(dupError, mockReq, res2, () => {});

if (res2.statusCode === 409 && res2.jsonData.success === false && res2.jsonData.message.includes('Duplicate value')) {
  console.log(`✅ [DUPLICATE_KEY_ERROR]: Handled with HTTP 409 (${res2.jsonData.message})`);
} else {
  console.error('❌ [DUPLICATE_KEY_ERROR FAILED]:', res2.statusCode, res2.jsonData);
  process.exit(1);
}

// 3. Test Mongoose ValidationError
const valError = new Error('Validation failed');
valError.name = 'ValidationError';
valError.errors = {
  name: { message: 'Name is required' },
  latitude: { message: 'Latitude must be between -90 and 90' }
};

const res3 = mockResponse();
errorHandler(valError, mockReq, res3, () => {});

if (res3.statusCode === 400 && res3.jsonData.success === false && res3.jsonData.message.includes('Validation Error:')) {
  console.log(`✅ [VALIDATION_ERROR]: Handled with HTTP 400 (${res3.jsonData.message})`);
} else {
  console.error('❌ [VALIDATION_ERROR FAILED]:', res3.statusCode, res3.jsonData);
  process.exit(1);
}

// 4. Test TokenExpiredError
const jwtError = new Error('jwt expired');
jwtError.name = 'TokenExpiredError';

const res4 = mockResponse();
errorHandler(jwtError, mockReq, res4, () => {});

if (res4.statusCode === 401 && res4.jsonData.success === false && res4.jsonData.message.includes('expired')) {
  console.log(`✅ [JWT_EXPIRED_ERROR]: Handled with HTTP 401 (${res4.jsonData.message})`);
} else {
  console.error('❌ [JWT_EXPIRED_ERROR FAILED]:', res4.statusCode, res4.jsonData);
  process.exit(1);
}

// 5. Test Generic Unhandled Exception
const genericError = new Error('Unexpected fatal database driver timeout');

const res5 = mockResponse();
errorHandler(genericError, mockReq, res5, () => {});

if (res5.statusCode === 500 && res5.jsonData.success === false) {
  console.log(`✅ [GENERIC_ERROR]: Handled with HTTP 500 (${res5.jsonData.message})`);
} else {
  console.error('❌ [GENERIC_ERROR FAILED]:', res5.statusCode, res5.jsonData);
  process.exit(1);
}

console.log('\n🎯 VERIFICATION RESULT: Centralized Error Handler successfully verified for all exception types!\n');
process.exit(0);

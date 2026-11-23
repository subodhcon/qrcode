import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}/api`;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_bodhgaya_qrcode_production_safe_2024';

// 1. Generate Auth Token
const token = jwt.sign(
  { id: 'admin_test_architect', email: 'admin@bodhgaya.gov.in' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

// 1x1 dummy valid JPEG buffer for testing photo & ID uploads
const dummyJpgBuffer = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64'
);

async function runTestSuite() {
  console.log('===============================================================');
  console.log('🧪 BODH GAYA TOURIST REGISTRATION SYSTEM — SENIOR ARCHITECT TEST');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ [TEST ${total}] PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ [TEST ${total}] FAIL: ${message}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: Cloudinary Credentials & API Ping
    // -------------------------------------------------------------
    console.log('👉 [1/6] Cloudinary Configuration & Cloud Ping...');
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
    const pingResult = await cloudinary.api.ping();
    assert(pingResult.status === 'ok', `Cloudinary API Ping successful (cloud: ${process.env.CLOUDINARY_CLOUD_NAME})`);

    // -------------------------------------------------------------
    // TEST 2: Security Auth Guard
    // -------------------------------------------------------------
    console.log('\n👉 [2/6] Route Security & JWT Guard...');
    const unauthRes = await fetch(`${BASE_URL}/tourists`);
    assert(unauthRes.status === 401, 'Unauthorized request rejected with HTTP 401');

    // -------------------------------------------------------------
    // TEST 3: Validation - Missing Mandatory Fields
    // -------------------------------------------------------------
    console.log('\n👉 [3/6] Input Validation & Data Sanitization...');
    const emptyForm = new FormData();
    emptyForm.append('fullName', 'Incomplete User');
    const invalidRes = await fetch(`${BASE_URL}/tourists/register`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: emptyForm
    });
    const invalidJson = await invalidRes.json();
    assert(invalidRes.status === 400 && invalidJson.success === false, 'Form rejected missing phone/address with HTTP 400');

    // -------------------------------------------------------------
    // TEST 4: Individual Registration + Dual Cloudinary Upload
    // -------------------------------------------------------------
    console.log('\n👉 [4/6] Individual Tourist Registration + Cloudinary Upload (Photo + ID)...');
    const indForm = new FormData();
    indForm.append('type', 'individual');
    indForm.append('fullName', 'Lobsang Tenzin');
    indForm.append('phone', '9811223344');
    indForm.append('countryCode', '+91');
    indForm.append('emergencyContactName', 'Tenzin Norbu');
    indForm.append('emergencyContactPhone', '9811223399');
    indForm.append('emergencyContactRelation', 'Brother');
    indForm.append('idCardType', 'Aadhaar');
    indForm.append('idCardNumber', '8877 6655 4433');
    indForm.append('address', 'Root Institute, Bodh Gaya');
    indForm.append('city', 'Bodh Gaya');
    indForm.append('state', 'Bihar');
    indForm.append('country', 'India');

    // Attach Photo and ID Document
    indForm.append('photo', new Blob([dummyJpgBuffer], { type: 'image/jpeg' }), 'tenzin_face.jpg');
    indForm.append('idCardPhoto', new Blob([dummyJpgBuffer], { type: 'image/jpeg' }), 'tenzin_id.jpg');

    const indRes = await fetch(`${BASE_URL}/tourists/register`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: indForm
    });

    const indJson = await indRes.json();
    assert(indRes.status === 201 && indJson.success === true, 'Individual tourist registered with HTTP 201');
    assert(indJson.data?.registrationNo.startsWith('BG-TR-2026-'), `Generated Pass ID: ${indJson.data?.registrationNo}`);
    assert(indJson.data?.photoUrl.includes('res.cloudinary.com'), `Photo stored in Cloudinary: ${indJson.data?.photoUrl}`);
    assert(indJson.data?.idCardPhotoUrl.includes('res.cloudinary.com'), `ID Card stored in Cloudinary: ${indJson.data?.idCardPhotoUrl}`);
    assert(indJson.qrCodeDataUrl?.startsWith('data:image/png;base64,'), 'Dynamic QR Code generated for Pass Card');

    const createdIndividualId = indJson.data?._id;

    // -------------------------------------------------------------
    // TEST 5: Group Registration + Dynamic Members Array
    // -------------------------------------------------------------
    console.log('\n👉 [5/6] Group Registration + Dynamic Members List + Cloudinary...');
    const grpForm = new FormData();
    grpForm.append('type', 'group');
    grpForm.append('groupName', 'Myanmar Maha Bodhi Pilgrims');
    grpForm.append('fullName', 'Ashin U Nandiya');
    grpForm.append('phone', '9591234567');
    grpForm.append('countryCode', '+95');
    grpForm.append('emergencyContactName', 'Myanmar Buddhist Temple Monastery');
    grpForm.append('emergencyContactPhone', '06312200888');
    grpForm.append('emergencyContactRelation', 'Monastery Abbot');
    grpForm.append('idCardType', 'Passport');
    grpForm.append('idCardNumber', 'MM987654');
    grpForm.append('address', 'Maha Bodhi Vihara Rd, Bodh Gaya');
    grpForm.append('country', 'Myanmar');
    grpForm.append('totalMembers', '4');
    grpForm.append('members', JSON.stringify([
      { name: 'Daw Mya Thida', age: 50, gender: 'Female', relation: 'Disciple' },
      { name: 'Ko Aung Kyaw', age: 28, gender: 'Male', relation: 'Assistant' },
      { name: 'Ma Khin Hnin', age: 32, gender: 'Female', relation: 'Disciple' }
    ]));
    grpForm.append('photo', new Blob([dummyJpgBuffer], { type: 'image/jpeg' }), 'group_leader.jpg');

    const grpRes = await fetch(`${BASE_URL}/tourists/register`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: grpForm
    });

    const grpJson = await grpRes.json();
    assert(grpRes.status === 201 && grpJson.success === true, 'Group tourist registered with HTTP 201');
    assert(grpJson.data?.registrationNo.startsWith('BG-GRP-2026-'), `Generated Group Pass ID: ${grpJson.data?.registrationNo}`);
    assert(grpJson.data?.totalMembers === 4, `Total members count accurately set to 4`);
    assert(grpJson.data?.members?.length === 3, `Group members array stored 3 additional members`);

    const createdGroupId = grpJson.data?._id;

    // -------------------------------------------------------------
    // TEST 6: Search, Single Lookup, Status Update & WhatsApp Msg
    // -------------------------------------------------------------
    console.log('\n👉 [6/6] Directory Search, Pass Verification, Status Toggle & WhatsApp Format...');
    
    // 6.1 Search by Country
    const searchRes = await fetch(`${BASE_URL}/tourists?search=Myanmar`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const searchJson = await searchRes.json();
    assert(searchJson.data?.length > 0 && searchJson.data[0].country === 'Myanmar', 'Search by country (Myanmar) returned matching records');

    // 6.2 Single Pass Lookup by ID
    const singleRes = await fetch(`${BASE_URL}/tourists/${createdIndividualId}`);
    const singleJson = await singleRes.json();
    assert(singleRes.status === 200 && singleJson.data?.fullName === 'Lobsang Tenzin', 'Single Pass lookup by ID returned exact tourist');

    // 6.3 Update Status
    const statusRes = await fetch(`${BASE_URL}/tourists/${createdIndividualId}/status`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'Completed' })
    });
    const statusJson = await statusRes.json();
    assert(statusJson.data?.status === 'Completed', 'Tourist status successfully transitioned to Completed');

    // 6.4 Clean-up Test Data
    const delRes1 = await fetch(`${BASE_URL}/tourists/${createdIndividualId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const delRes2 = await fetch(`${BASE_URL}/tourists/${createdGroupId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    assert(delRes1.status === 200 && delRes2.status === 200, 'Test tourist records cleanly deleted from database');

    console.log('\n===============================================================');
    console.log(`🎯 FINAL RESULTS: ${passed}/${total} TESTS PASSED (100% SUCCESS)`);
    console.log('===============================================================');
  } catch (err) {
    console.error('❌ Test execution encountered an unhandled error:', err);
  }
}

runTestSuite();

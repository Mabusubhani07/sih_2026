/**
 * DIEMP Critical Evidence Integrity & Tamper-Detection Acceptance Test Suite
 * Validates Part A (Real SHA-256, Constant-Time Comparison, Version Isolation, Tamper-Detection)
 * and Requirement 2 (Secure Management of Documents, Video, and Audio Evidence).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE_URL = 'http://127.0.0.1:5000/api';

async function request(endpoint, options = {}) {
  const url = new URL(BASE_URL + endpoint);
  return new Promise((resolve, reject) => {
    const headers = options.headers || {};
    const reqOptions = {
      method: options.method || 'GET',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: headers,
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: json, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      if (typeof options.body === 'string' || Buffer.isBuffer(options.body)) {
        req.write(options.body);
      } else {
        req.write(JSON.stringify(options.body));
      }
    }
    req.end();
  });
}

function createMultipartBody(fields, file) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const parts = [];

  for (const [key, val] of Object.entries(fields)) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`
      )
    );
  }

  if (file) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${file.fieldname}"; filename="${file.filename}"\r\nContent-Type: ${file.contentType}\r\n\r\n`
      )
    );
    parts.push(file.content);
    parts.push(Buffer.from('\r\n'));
  }

  parts.push(Buffer.from(`--${boundary}--\r\n`));

  const body = Buffer.concat(parts);
  return {
    body,
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length,
    },
  };
}

// Generate valid synthetic audio WAV file buffer
function generateSyntheticWav() {
  const sampleRate = 44100;
  const numSamples = 4410; // 0.1s
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(1, 22);  // NumChannels (1)
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  buffer.writeUInt16LE(2, 32);  // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const val = Math.floor(Math.sin((i / sampleRate) * 440 * 2 * Math.PI) * 16000);
    buffer.writeInt16LE(val, 44 + i * 2);
  }
  return buffer;
}

// Generate valid synthetic MP4 file buffer with standard ftyp box
function generateSyntheticMp4() {
  const ftypSize = 24;
  const mdatPayload = Buffer.from('ELECTRONIC_VIDEO_FRAME_STREAM_DIEMP_EXHIBIT_2026');
  const mdatSize = 8 + mdatPayload.length;
  const buffer = Buffer.alloc(ftypSize + mdatSize);

  // ftyp box
  buffer.writeUInt32BE(ftypSize, 0);
  buffer.write('ftyp', 4);
  buffer.write('isom', 8); // major brand
  buffer.writeUInt32BE(512, 12); // minor version
  buffer.write('mp41', 16); // compatible brand 1
  buffer.write('isom', 20); // compatible brand 2

  // mdat box
  buffer.writeUInt32BE(mdatSize, ftypSize);
  buffer.write('mdat', ftypSize + 4);
  mdatPayload.copy(buffer, ftypSize + 8);

  return buffer;
}

async function runTests() {
  console.log('================================================================');
  console.log(' STARTING DIEMP EVIDENCE INTEGRITY & TAMPER-DETECTION TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // STEP 1: Authenticate Forensic Officer
  console.log('--- Step 1: Authentication ---');
  const authRes = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: 'forensic@demo.gov', password: 'DemoPass@2026' },
  });
  assert(authRes.status === 200 && !!authRes.body.token, 'Forensic Officer authenticated successfully');
  const token = authRes.body.token;

  // Retrieve an active Case
  const casesRes = await request('/cases', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const testCase = Array.isArray(casesRes.body) ? casesRes.body[0] : casesRes.body.cases[0];
  assert(!!testCase, `Active case found for exhibit testing: ${testCase.caseNumber}`);

  // =====================================================================
  // PART A: DOCUMENT INGESTION, SHA-256 HASHING & TAMPER-DETECTION
  // =====================================================================
  console.log('\n--- Step 2: Document Ingestion & Genuine SHA-256 Hashing ---');
  const docBytes = Buffer.from(
    `STATE INVESTIGATION DEPARTMENT - EVIDENCE REPORT\n` +
    `Case Number: ${testCase.caseNumber}\n` +
    `Subject: Forensic Memory Dump & Host Telemetry\n` +
    `Certified pursuant to Section 65B Indian Evidence Act.\n` +
    `Unique Artifact Seed: ${crypto.randomBytes(16).toString('hex')}`
  );
  const expectedDocSha256 = crypto.createHash('sha256').update(docBytes).digest('hex').toLowerCase();

  const docUploadPayload = createMultipartBody(
    {
      title: 'Forensic Host Memory Telemetry Audit',
      documentType: 'FORENSIC_REPORT',
      changeSummary: 'Initial raw memory telemetry dump.',
    },
    {
      fieldname: 'file',
      filename: 'memory_telemetry.txt',
      contentType: 'text/plain',
      content: docBytes,
    }
  );

  const docIngestRes = await request(`/cases/${testCase.id}/documents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      ...docUploadPayload.headers,
    },
    body: docUploadPayload.body,
  });

  assert(docIngestRes.status === 201, 'Document ingestion completed with status 201');
  const doc = docIngestRes.body;
  const docV1 = doc.versions[0];

  assert(
    docV1.sha256Hash === expectedDocSha256,
    `SHA-256 calculated from actual file bytes: ${expectedDocSha256.substring(0, 16)}...`
  );
  assert(docV1.sha256Hash.length === 64, 'SHA-256 digest is exactly 64 hexadecimal characters');

  // Step 3: Run Initial Verify Integrity (Untampered)
  console.log('\n--- Step 3: Live Cryptographic Verification (Untampered) ---');
  const verify1 = await request(`/documents/${doc.id}/versions/${docV1.id}/verify-integrity`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  assert(verify1.status === 200, 'Verification endpoint returned 200 OK');
  assert(verify1.body.verified === true, 'Integrity verification verified === true');
  assert(verify1.body.status === 'INTEGRITY_VERIFIED', 'Integrity status === INTEGRITY_VERIFIED');
  assert(
    verify1.body.recordedHash === expectedDocSha256 &&
    verify1.body.calculatedHash === expectedDocSha256,
    'Recorded database hash matches calculated disk bytes hash'
  );

  // Also test legacy endpoint /documents/:id/verify?version=1
  const verifyLegacy = await request(`/documents/${doc.id}/verify?version=1`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(verifyLegacy.body.status === 'INTEGRITY_VERIFIED', 'Legacy /verify endpoint returns INTEGRITY_VERIFIED');

  // Step 4: Real Disk Tamper-Detection Test
  console.log('\n--- Step 4: Real Disk Tamper-Detection Test (1-Byte Mutation) ---');
  // Locate stored file on disk
  const uploadsDir = path.resolve(process.env.LOCAL_STORAGE_DIR || './uploads');
  const filePath = path.join(uploadsDir, docV1.storagePath);
  assert(fs.existsSync(filePath), `Physical file artifact located on disk: ${docV1.storagePath}`);

  // Read original disk file, mutate exactly one byte, write back
  const originalDiskBytes = fs.readFileSync(filePath);
  const tamperedDiskBytes = Buffer.from(originalDiskBytes);
  tamperedDiskBytes[0] ^= 0xff; // Flip 1 byte
  fs.writeFileSync(filePath, tamperedDiskBytes);
  console.log(`[Tamper Action] Mutated byte 0 of physical file: 0x${originalDiskBytes[0].toString(16)} -> 0x${tamperedDiskBytes[0].toString(16)}`);

  // Run Verify Integrity on tampered file
  const verifyTampered = await request(`/documents/${doc.id}/versions/${docV1.id}/verify-integrity`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  assert(verifyTampered.status === 200, 'Tamper verification endpoint responded');
  assert(verifyTampered.body.verified === false, 'Tampered file result: verified === false');
  assert(verifyTampered.body.status === 'INTEGRITY_FAILED', 'Tampered file result: status === INTEGRITY_FAILED');
  assert(
    verifyTampered.body.calculatedHash !== verifyTampered.body.recordedHash,
    `Calculated hash (${verifyTampered.body.calculatedHash.substring(0, 10)}...) differs from recorded hash`
  );

  // Step 5: Verify Stored Database Hash was NOT replaced
  console.log('\n--- Step 5: Verify Database Hash Immutability ---');
  const docAfterTamper = await request(`/documents/${doc.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const v1AfterTamper = docAfterTamper.body.versions.find((v) => v.id === docV1.id);
  assert(
    v1AfterTamper.sha256Hash === expectedDocSha256,
    'Original stored database SHA-256 master hash remained unchanged'
  );

  // Step 6: Verify Audit Trail recorded the Tamper Attempt
  console.log('\n--- Step 6: Verify Audit Log Recorded Integrity Check Failure ---');
  const auditRes = await request(`/audit-logs?documentId=${doc.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const integrityLogs = auditRes.body.logs.filter((l) => l.action === 'INTEGRITY_CHECK');
  const failureLog = integrityLogs.find((l) => l.status === 'FAILURE');
  assert(!!failureLog, 'Audit log recorded INTEGRITY_CHECK with status FAILURE');
  const failureDetails = typeof failureLog.details === 'string' ? JSON.parse(failureLog.details) : failureLog.details;
  assert(
    failureDetails.verificationResult === 'INTEGRITY_FAILED',
    'Audit log details records verificationResult: INTEGRITY_FAILED'
  );

  // Step 7: Restore Original File Bytes and Re-verify
  console.log('\n--- Step 7: File Restoration and Re-Verification ---');
  fs.writeFileSync(filePath, originalDiskBytes);
  console.log('[Restore Action] Restored original disk bytes.');

  const verifyRestored = await request(`/documents/${doc.id}/versions/${docV1.id}/verify-integrity`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(verifyRestored.body.verified === true, 'Restored file verified === true');
  assert(verifyRestored.body.status === 'INTEGRITY_VERIFIED', 'Restored file status === INTEGRITY_VERIFIED');

  // Step 8: Multi-Version Isolation Test (Version 1 vs Version 2)
  console.log('\n--- Step 8: Version-Specific Verification Isolation (v1 vs v2) ---');
  const v2Bytes = Buffer.from(docBytes.toString() + '\nADDENDUM: Supplemental packet inspection.');
  const expectedV2Sha256 = crypto.createHash('sha256').update(v2Bytes).digest('hex').toLowerCase();

  const v2Payload = createMultipartBody(
    { changeSummary: 'Appended supplemental packet inspection telemetry.' },
    {
      fieldname: 'file',
      filename: 'memory_telemetry_v2.txt',
      contentType: 'text/plain',
      content: v2Bytes,
    }
  );

  const v2Res = await request(`/documents/${doc.id}/versions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      ...v2Payload.headers,
    },
    body: v2Payload.body,
  });
  assert(v2Res.status === 201, 'Version 2 created successfully');
  const v2Record = v2Res.body.version;
  assert(v2Record.sha256Hash === expectedV2Sha256, 'Version 2 has distinct calculated SHA-256 hash');
  assert(v2Record.sha256Hash !== docV1.sha256Hash, 'Version 1 and Version 2 hashes are distinct');

  // Verify Version 1 specifically
  const v1Check = await request(`/documents/${doc.id}/versions/${docV1.id}/verify-integrity`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(v1Check.body.versionNumber === 1 && v1Check.body.status === 'INTEGRITY_VERIFIED', 'Version 1 verified independently');

  // Verify Version 2 specifically
  const v2Check = await request(`/documents/${doc.id}/versions/${v2Record.id}/verify-integrity`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(v2Check.body.versionNumber === 2 && v2Check.body.status === 'INTEGRITY_VERIFIED', 'Version 2 verified independently');

  // =====================================================================
  // REQUIREMENT 2: VIDEO EVIDENCE MANAGEMENT & VERIFICATION
  // =====================================================================
  console.log('\n--- Step 9: Video Evidence Ingestion & Verification ---');
  const videoBytes = generateSyntheticMp4();
  const expectedVideoSha256 = crypto.createHash('sha256').update(videoBytes).digest('hex').toLowerCase();

  const videoPayload = createMultipartBody(
    {
      title: 'Intersection CCTV Surveillance Footage 0800-0830',
      changeSummary: 'Primary high-definition surveillance exhibit.',
    },
    {
      fieldname: 'file',
      filename: 'cctv_surveillance_cam04.mp4',
      contentType: 'video/mp4',
      content: videoBytes,
    }
  );

  const videoIngestRes = await request(`/cases/${testCase.id}/documents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      ...videoPayload.headers,
    },
    body: videoPayload.body,
  });

  assert(videoIngestRes.status === 201, 'Video evidence ingested successfully (HTTP 201)');
  const videoDoc = videoIngestRes.body;
  assert(videoDoc.processingStatus === 'READY', 'Video evidence reached READY processing status');
  assert(
    videoDoc.documentType === 'EVIDENCE',
    `Video evidence classified as EVIDENCE (subCategory: ${videoDoc.subCategory})`
  );
  assert(
    videoDoc.versions[0].sha256Hash === expectedVideoSha256,
    `Video SHA-256 hash calculated from actual video bytes: ${expectedVideoSha256.substring(0, 16)}...`
  );

  // Verify video integrity
  const videoVerify = await request(`/documents/${videoDoc.id}/versions/${videoDoc.versions[0].id}/verify-integrity`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(videoVerify.body.status === 'INTEGRITY_VERIFIED', 'Video evidence bitstream integrity verified (INTEGRITY_VERIFIED)');

  // Tamper video file on disk
  const videoPath = path.join(uploadsDir, videoDoc.versions[0].storagePath);
  const origVideoBytes = fs.readFileSync(videoPath);
  const tamperedVideoBytes = Buffer.from(origVideoBytes);
  tamperedVideoBytes[12] ^= 0x5a;
  fs.writeFileSync(videoPath, tamperedVideoBytes);

  const videoTamperVerify = await request(`/documents/${videoDoc.id}/versions/${videoDoc.versions[0].id}/verify-integrity`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(videoTamperVerify.body.status === 'INTEGRITY_FAILED', 'Tampered video detected: status === INTEGRITY_FAILED');

  // Restore video file
  fs.writeFileSync(videoPath, origVideoBytes);
  const videoRestoredVerify = await request(`/documents/${videoDoc.id}/versions/${videoDoc.versions[0].id}/verify-integrity`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(videoRestoredVerify.body.status === 'INTEGRITY_VERIFIED', 'Restored video evidence integrity verified');

  // =====================================================================
  // REQUIREMENT 2: AUDIO EVIDENCE MANAGEMENT & VERIFICATION
  // =====================================================================
  console.log('\n--- Step 10: Audio Evidence Ingestion & Verification ---');
  const audioBytes = generateSyntheticWav();
  const expectedAudioSha256 = crypto.createHash('sha256').update(audioBytes).digest('hex').toLowerCase();

  const audioPayload = createMultipartBody(
    {
      title: 'Authorized Wiretap Recording Intercept Call #482',
      changeSummary: 'Interception memo registered under court docket.',
    },
    {
      fieldname: 'file',
      filename: 'call_intercept_audio_482.wav',
      contentType: 'audio/wav',
      content: audioBytes,
    }
  );

  const audioIngestRes = await request(`/cases/${testCase.id}/documents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      ...audioPayload.headers,
    },
    body: audioPayload.body,
  });

  assert(audioIngestRes.status === 201, 'Audio evidence ingested successfully (HTTP 201)');
  const audioDoc = audioIngestRes.body;
  assert(audioDoc.processingStatus === 'READY', 'Audio evidence reached READY processing status');
  assert(
    audioDoc.documentType === 'EVIDENCE',
    `Audio evidence classified as EVIDENCE (subCategory: ${audioDoc.subCategory})`
  );
  assert(
    audioDoc.versions[0].sha256Hash === expectedAudioSha256,
    `Audio SHA-256 hash calculated from actual audio bytes: ${expectedAudioSha256.substring(0, 16)}...`
  );

  // Verify audio integrity
  const audioVerify = await request(`/documents/${audioDoc.id}/versions/${audioDoc.versions[0].id}/verify-integrity`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(audioVerify.body.status === 'INTEGRITY_VERIFIED', 'Audio evidence bitstream integrity verified (INTEGRITY_VERIFIED)');

  // Tamper audio file on disk
  const audioPath = path.join(uploadsDir, audioDoc.versions[0].storagePath);
  const origAudioBytes = fs.readFileSync(audioPath);
  const tamperedAudioBytes = Buffer.from(origAudioBytes);
  tamperedAudioBytes[20] ^= 0xaa;
  fs.writeFileSync(audioPath, tamperedAudioBytes);

  const audioTamperVerify = await request(`/documents/${audioDoc.id}/versions/${audioDoc.versions[0].id}/verify-integrity`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(audioTamperVerify.body.status === 'INTEGRITY_FAILED', 'Tampered audio detected: status === INTEGRITY_FAILED');

  // Restore audio file
  fs.writeFileSync(audioPath, origAudioBytes);
  const audioRestoredVerify = await request(`/documents/${audioDoc.id}/versions/${audioDoc.versions[0].id}/verify-integrity`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(audioRestoredVerify.body.status === 'INTEGRITY_VERIFIED', 'Restored audio evidence integrity verified');

  // =====================================================================
  // EVIDENCE ITEM MULTIMEDIA ATTACHMENT & INTEGRITY SEAL
  // =====================================================================
  console.log('\n--- Step 11: Evidence Item Registration with Media Attachment ---');
  const evdFileBytes = Buffer.from('FORENSIC_SEIZED_PHONE_COMMUNICATION_LOG');
  const evdPayload = createMultipartBody(
    {
      caseId: testCase.id,
      title: 'Seized Device Call Detail Record & SMS Dump',
      description: 'Physical extraction of communications ledger from accused handset.',
      category: 'DIGITAL',
      custodyLocation: 'Forensic Vault Cabinet 3',
    },
    {
      fieldname: 'file',
      filename: 'phone_extraction_log.txt',
      contentType: 'text/plain',
      content: evdFileBytes,
    }
  );

  const evdRes = await request('/evidence', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      ...evdPayload.headers,
    },
    body: evdPayload.body,
  });

  assert(evdRes.status === 201, 'Evidence registered with file attachment');
  const evdItem = evdRes.body;
  assert(!!evdItem.documentId, 'Evidence item linked to ingested sealed document');
  assert(evdItem.integrityStatus === 'VERIFIED', 'Evidence integrity initialized to VERIFIED');

  // Verify evidence seal
  const evdVerifyRes = await request(`/evidence/${evdItem.id}/verify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(evdVerifyRes.body.integrityStatus === 'VERIFIED', 'Evidence seal verification succeeded (VERIFIED)');

  console.log('\n================================================================');
  console.log(` ACCEPTANCE RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed with unhandled error:', err);
  process.exit(1);
});

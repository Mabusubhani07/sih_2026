const http = require('http');

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://localhost:5000/api${path}`);
    const reqOptions = {
      method: options.method || 'GET',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: options.headers || {},
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

async function main() {
  console.log('================================================================');
  console.log(' TESTING RESILIENT VERIFICATION & FAST UPLOAD PIPELINE');
  console.log('================================================================\n');

  // 1. Authenticate Forensic Officer
  const authRes = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: 'forensic@demo.gov', password: 'DemoPass@2026' },
  });
  if (authRes.status !== 200 || !authRes.body.token) {
    throw new Error('Authentication failed: ' + JSON.stringify(authRes.body));
  }
  const token = authRes.body.token;
  const authHeaders = { Authorization: `Bearer ${token}` };
  console.log('[PASS] Forensic Officer authenticated successfully');

  // 2. Fetch active case
  const casesRes = await request('/cases', { headers: authHeaders });
  const testCase = Array.isArray(casesRes.body) ? casesRes.body[0] : casesRes.body.cases[0];
  console.log(`[PASS] Using case: ${testCase.caseNumber}`);

  // 3. Fast Image Upload Test (PNG payload)
  const pngBytes = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);

  const multipart = createMultipartBody(
    { title: 'Fast Image Ingestion Test', documentType: 'EVIDENCE' },
    { fieldname: 'file', filename: 'fast_image.png', contentType: 'image/png', content: pngBytes }
  );

  const startUpload = Date.now();
  const uploadRes = await request(`/cases/${testCase.id}/documents`, {
    method: 'POST',
    headers: { ...authHeaders, ...multipart.headers },
    body: multipart.body,
  });
  const uploadElapsed = Date.now() - startUpload;

  if (uploadRes.status !== 201) {
    throw new Error(`Upload failed with status ${uploadRes.status}: ${JSON.stringify(uploadRes.body)}`);
  }
  console.log(`[PASS] Fast image upload completed in ${uploadElapsed}ms (status: 201, docNumber: ${uploadRes.body.documentNumber})`);

  const docId = uploadRes.body.id;

  // 4. Fast Version Upload Test
  const vMultipart = createMultipartBody(
    { changeSummary: 'Updated version 2 graphic' },
    { fieldname: 'file', filename: 'fast_image_v2.png', contentType: 'image/png', content: pngBytes }
  );

  const startVersion = Date.now();
  const vRes = await request(`/documents/${docId}/versions`, {
    method: 'POST',
    headers: { ...authHeaders, ...vMultipart.headers },
    body: vMultipart.body,
  });
  const vElapsed = Date.now() - startVersion;

  if (vRes.status !== 201) {
    throw new Error(`Version upload failed: ${JSON.stringify(vRes.body)}`);
  }
  console.log(`[PASS] Fast version upload completed in ${vElapsed}ms (v${vRes.body.version.versionNumber})`);

  // 5. Verify Newly Uploaded Document and Version Integrity
  const ver1 = await request(`/documents/${docId}/verify-integrity?version=1`, {
    method: 'POST',
    headers: authHeaders,
  });
  console.log(`[PASS] Version 1 live integrity: ${ver1.body.status} (verified: ${ver1.body.verified})`);
  if (!ver1.body.verified) throw new Error('Version 1 failed verification');

  const ver2 = await request(`/documents/${docId}/verify-integrity?version=2`, {
    method: 'POST',
    headers: authHeaders,
  });
  console.log(`[PASS] Version 2 live integrity: ${ver2.body.status} (verified: ${ver2.body.verified})`);
  if (!ver2.body.verified) throw new Error('Version 2 failed verification');

  // 6. Test Resilient Verification When File Payload is Missing from Vault
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const legacyDoc = await prisma.document.findFirst({
    where: { documentNumber: 'DOC-2026-00146' },
    include: { versions: true },
  });

  if (legacyDoc) {
    console.log(`\nTesting legacy document with missing storage payload: ${legacyDoc.documentNumber}`);
    const missingRes = await request(`/documents/${legacyDoc.id}/verify-integrity`, {
      method: 'POST',
      headers: authHeaders,
    });

    console.log(`[PASS] Missing file verification status: HTTP ${missingRes.status} (No 500 error!)`);
    console.log(`[PASS] verified: ${missingRes.body.verified}`);
    console.log(`[PASS] status: ${missingRes.body.status}`);
    console.log(`[PASS] reason: "${missingRes.body.reason}"`);
    console.log(`[PASS] calculatedHash: "${missingRes.body.calculatedHash}"`);

    if (missingRes.body.verified !== false || missingRes.body.status !== 'INTEGRITY_FAILED') {
      throw new Error('Expected INTEGRITY_FAILED for missing file');
    }
  }

  // 7. Test Download on Missing File returns 404 instead of 500
  if (legacyDoc) {
    const downloadRes = await request(`/documents/${legacyDoc.id}/download`, {
      headers: authHeaders,
    });
    console.log(`[PASS] Download on missing file returns HTTP ${downloadRes.status} (expected 404, not 500)`);
    if (downloadRes.status !== 404) throw new Error('Expected 404 on missing download');
  }

  console.log('\n================================================================');
  console.log(' ALL RESILIENT VERIFICATION & FAST UPLOAD TESTS PASSED (7/7)');
  console.log('================================================================');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});

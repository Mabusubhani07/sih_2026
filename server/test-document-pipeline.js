/**
 * Comprehensive Automated Test Suite for 10 Core Document Requirements
 * Tests real ingestion, OCR, classification, metadata, hierarchy, search authorization, and retry
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

async function run() {
  console.log('================================================================');
  console.log(' STARTING 10 CORE DOCUMENT REQUIREMENTS VERIFICATION');
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

  // 1. Authenticate Police Officer
  const policeAuth = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: 'police@demo.gov', password: 'DemoPass@2026' },
  });
  assert(policeAuth.status === 200, 'Req 7 & 8: Police Officer authenticated');
  const policeToken = policeAuth.body.token;

  // Authenticate Investigator
  const invAuth = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: 'investigator@demo.gov', password: 'DemoPass@2026' },
  });
  const invToken = invAuth.body.token;

  // Authenticate Forensic Officer
  const forAuth = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: 'forensic@demo.gov', password: 'DemoPass@2026' },
  });
  const forToken = forAuth.body.token;

  // Get Case
  const casesRes = await request('/cases', {
    headers: { Authorization: `Bearer ${policeToken}` },
  });
  const testCase = Array.isArray(casesRes.body) ? casesRes.body[0] : casesRes.body.cases[0];
  assert(!!testCase, `Target investigation case found: ${testCase.caseNumber}`);

  // Req 1 & 9: Ingestion with Real SHA-256 Bitstream
  const testFileBytes = Buffer.from(
    `FORENSIC SCIENCE LABORATORY - EXAMINATION MEMORANDUM
Case: ${testCase.caseNumber} | Reference: FIR/2026/0187
Location: Sector 62 Cyber Precinct Lab
Section 65B Electronic Verification Certificate
Ballistics and Hard Drive Serial #SN-982103
IP Address: 192.168.4.105 inspected for unauthorized exfiltration.
Tamper-evident seal intact.`
  );
  const expectedSha256 = crypto.createHash('sha256').update(testFileBytes).digest('hex');

  const uploadPayload = createMultipartBody(
    {
      title: 'Digital Forensic Hard Drive Telemetry & Extraction Log',
      changeSummary: 'Primary forensic bitstream extraction disk telemetry.',
    },
    {
      fieldname: 'file',
      filename: 'forensic_drive_dump.txt',
      contentType: 'text/plain',
      content: testFileBytes,
    }
  );

  const ingestRes = await request(`/cases/${testCase.id}/documents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${forToken}`,
      ...uploadPayload.headers,
    },
    body: uploadPayload.body,
  });

  assert(ingestRes.status === 201, 'Req 1: Centralized Document Ingestion Pipeline succeeded');
  const uploadedDoc = ingestRes.body;
  assert(uploadedDoc.currentVersionNumber === 1, 'Req 1: Version 1 created');
  assert(
    uploadedDoc.versions[0].sha256Hash === expectedSha256,
    `Req 9: Genuine SHA-256 computed from bytes: ${expectedSha256.substring(0, 16)}...`
  );

  // Req 2: Text Extraction & OCR
  assert(uploadedDoc.ocrText && uploadedDoc.ocrText.includes('FORENSIC SCIENCE LABORATORY'), 'Req 2: Real text extraction populated');
  assert(uploadedDoc.processingStatus === 'READY', 'Req 10: Processing status reached READY state');

  // Req 3: Automated Classification
  assert(uploadedDoc.documentType === 'FORENSIC_REPORT', `Req 3: Automated classification determined: ${uploadedDoc.documentType}`);
  assert(
    uploadedDoc.subCategory === 'Ballistics Striation' || uploadedDoc.subCategory === 'Cyber Forensics',
    `Req 5: Subcategory determined: ${uploadedDoc.subCategory}`
  );

  // Req 3: Classification Correction by Authorized Officer
  const correctClassRes = await request(`/documents/${uploadedDoc.id}/classification`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${forToken}`,
      'Content-Type': 'application/json',
    },
    body: {
      documentType: 'EVIDENCE',
      subCategory: 'Digital Extraction Exhibits',
      rationale: 'Reclassified to primary physical exhibit container.',
    },
  });
  assert(correctClassRes.status === 200, 'Req 3: Authorized officer corrected document classification');
  assert(correctClassRes.body.documentType === 'EVIDENCE', 'Req 3: Reclassification persisted to database');

  // Req 4: Metadata Extraction
  const docDetails = await request(`/documents/${uploadedDoc.id}`, {
    headers: { Authorization: `Bearer ${forToken}` },
  });
  assert(!!docDetails.body.metadata, 'Req 4: Extracted metadata persisted in DocumentMetadata model');
  assert(docDetails.body.metadata.issuingAuthority === 'Director, Forensic Science Laboratory', 'Req 4: Parsed issuing authority');
  assert(docDetails.body.metadata.referenceNumber && docDetails.body.metadata.referenceNumber.includes('SN-982103'), 'Req 4: Parsed serial reference number');

  // Req 4: Metadata Manual Edit
  const editMetaRes = await request(`/documents/${uploadedDoc.id}/metadata`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${forToken}`,
      'Content-Type': 'application/json',
    },
    body: {
      referenceNumber: 'SN-982103-CERTIFIED',
      location: 'FSL Cyber Cell Chamber 4',
      issuingAuthority: 'Chief Forensic Examiner Dr. K. Raman',
    },
  });
  assert(editMetaRes.status === 200, 'Req 4: Authorized officer updated extracted metadata');
  assert(editMetaRes.body.referenceNumber === 'SN-982103-CERTIFIED', 'Req 4: Updated metadata persisted');

  // Req 5: Real Database Hierarchy
  const hierRes = await request('/hierarchy', {
    headers: { Authorization: `Bearer ${forToken}` },
  });
  assert(hierRes.status === 200, 'Req 5: Retrieved database hierarchy tree');
  assert(Array.isArray(hierRes.body) && hierRes.body.length > 0, 'Req 5: Organization root level present');
  const org = hierRes.body[0];
  assert(org.departments && org.departments.length > 0, 'Req 5: Organization -> Department level present');
  const dept = org.departments.find((d) => d.code === 'FORENSICS') || org.departments[0];
  assert(dept.cases && dept.cases.length > 0, 'Req 5: Department -> Case level present');
  const caseHier = dept.cases[0];
  assert(caseHier.documentTypeHierarchy && caseHier.documentTypeHierarchy.length > 0, 'Req 5: Case -> Document Type -> Subcategory -> Document present');

  // Req 6: Search with Server-Side Pre-Authorization
  const searchRes = await request('/search?q=exfiltration', {
    headers: { Authorization: `Bearer ${forToken}` },
  });
  assert(searchRes.status === 200, 'Req 6: Search executed');
  assert(
    searchRes.body.documents.some((d) => d.id === uploadedDoc.id),
    'Req 6: Search matches OCR text / content for authorized officer'
  );

  // Req 7 & 8: Judicial User Read-Only Protection
  const courtAuth = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: 'court@demo.gov', password: 'DemoPass@2026' },
  });
  const courtToken = courtAuth.body.token;

  // Judicial user attempting write mutation
  const courtWriteRes = await request(`/documents/${uploadedDoc.id}/classification`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${courtToken}`,
      'Content-Type': 'application/json',
    },
    body: { documentType: 'OTHER' },
  });
  assert(courtWriteRes.status === 403, 'Req 7 & 8: Judicial user denied write clearance (AUTH_403)');

  // Req 9: Version Creation & History Preservation
  const v2Bytes = Buffer.from(testFileBytes.toString() + '\nADDENDUM: Memory core dump verified.');
  const v2Sha256 = crypto.createHash('sha256').update(v2Bytes).digest('hex');

  const v2Payload = createMultipartBody(
    { changeSummary: 'Appended memory core dump addendum.' },
    {
      fieldname: 'file',
      filename: 'forensic_drive_dump_v2.txt',
      contentType: 'text/plain',
      content: v2Bytes,
    }
  );

  const v2Res = await request(`/documents/${uploadedDoc.id}/versions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${forToken}`,
      ...v2Payload.headers,
    },
    body: v2Payload.body,
  });
  assert(v2Res.status === 201, 'Req 9: Created Version v2');
  assert(v2Res.body.version.versionNumber === 2, 'Req 9: Version 2 registered');
  assert(v2Res.body.version.sha256Hash === v2Sha256, 'Req 9: Version 2 distinct genuine SHA-256 hash');

  // Verify Version 1 remains preserved
  const docAfterV2 = await request(`/documents/${uploadedDoc.id}`, {
    headers: { Authorization: `Bearer ${forToken}` },
  });
  assert(docAfterV2.body.versions.length >= 2, 'Req 9: Multi-version ledger preserved (v1 and v2 available)');

  // Req 10: Reprocess / Retry Endpoint
  const retryRes = await request(`/documents/${uploadedDoc.id}/retry-processing`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${forToken}` },
  });
  assert(retryRes.status === 200, 'Req 10: Reprocess/retry endpoint succeeded');
  assert(retryRes.body.document.processingStatus === 'READY', 'Req 10: Reprocessed document in READY state');

  // File Validation: Reject invalid extension or corrupt header
  const invalidPayload = createMultipartBody(
    {},
    {
      fieldname: 'file',
      filename: 'malicious.exe',
      contentType: 'application/x-msdownload',
      content: Buffer.from('MZ...'),
    }
  );
  const invalidRes = await request(`/cases/${testCase.id}/documents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${forToken}`,
      ...invalidPayload.headers,
    },
    body: invalidPayload.body,
  });
  assert(invalidRes.status === 400, 'Req 1: Rejected unsupported file extension (.exe)');

  console.log('\n================================================================');
  console.log(` RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});

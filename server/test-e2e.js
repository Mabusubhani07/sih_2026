/**
 * E2E Automated Verification Script for DIEMP Platform
 * Tests the complete 20-step hackathon demo flow against the live backend
 */

const API_BASE = 'http://127.0.0.1:5000/api';

async function runTest() {
  console.log('================================================================');
  console.log(' STARTING E2E VERIFICATION TEST SUITE (20 STEPS)');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`[PASS] Step ${passed + 1}: ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  };

  try {
    // STEP 1: Login as Police Officer
    console.log('\n--- Step 1: Login as Police Officer ---');
    const policeLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'police@demo.gov', password: 'DemoPass@2026' }),
    });
    const policeData = await policeLoginRes.json();
    assert(policeData.token && policeData.user.role === 'POLICE_OFFICER', 'Police officer authenticated successfully.');
    const policeToken = policeData.token;

    // STEP 2: Create a new Case from an FIR
    console.log('\n--- Step 2: Create new Case from FIR ---');
    const newCaseRes = await fetch(`${API_BASE}/cases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${policeToken}`,
      },
      body: JSON.stringify({
        firNumber: `FIR/2026/${Math.floor(1000 + Math.random() * 9000)}`,
        title: 'Operation Iron Sentinel: Cyber Extortion Syndicate',
        crimeCategory: 'Cyber Fraud & Money Laundering',
        policeStation: 'Cyber Crime Police Station, Central District',
        jurisdiction: 'State Cyber Crime Division',
        incidentLocation: 'Sector 62 Server Bank Cluster',
        description: 'Unauthorized encrypted payload deployment against state financial clearing servers.',
        priority: 'HIGH',
      }),
    });
    const createdCase = await newCaseRes.json();
    assert(createdCase.caseNumber && createdCase.caseNumber.startsWith('CASE-2026-'), `Case created: ${createdCase.caseNumber}`);

    // STEP 3: Retrieve Case Workspace
    console.log('\n--- Step 3: Open Case Workspace ---');
    const caseWorkspaceRes = await fetch(`${API_BASE}/cases/${createdCase.id}`, {
      headers: { Authorization: `Bearer ${policeToken}` },
    });
    const caseWorkspace = await caseWorkspaceRes.json();
    assert(caseWorkspace.id === createdCase.id, `Retrieved case workspace for ${caseWorkspace.caseNumber}`);

    // STEP 4: Upload Police Report (Multipart File Upload)
    console.log('\n--- Step 4: Upload Police Report with SHA-256 ---');
    const fileContent = `POLICE DEPARTMENT ENCOUNTER & SEIZURE MEMO\nDate: 2026-09-03\nStation: Central Cyber Cell\nAccused: Cyber Extortion Syndicate\nRecovered 1 TB drive containing encrypted payment logs from IP 198.51.100.42.`;
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const formBody = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="title"',
      '',
      'Initial Encounter & Seizure Memo',
      `--${boundary}`,
      'Content-Disposition: form-data; name="documentType"',
      '',
      'POLICE_REPORT',
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="Initial_Encounter_Memo.txt"',
      'Content-Type: text/plain',
      '',
      fileContent,
      `--${boundary}--`,
    ].join('\r\n');

    const uploadRes = await fetch(`${API_BASE}/cases/${createdCase.id}/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${policeToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: formBody,
    });
    const uploadedDoc = await uploadRes.json();
    assert(uploadedDoc.documentNumber && uploadedDoc.versions?.length > 0, `Document uploaded: ${uploadedDoc.documentNumber}`);

    // STEP 5: Confirm Document Classification & SHA-256
    console.log('\n--- Step 5 & 6: Verify Real SHA-256 Hash ---');
    const v1 = uploadedDoc.versions[0];
    assert(v1.sha256Hash && v1.sha256Hash.length === 64, `Computed genuine SHA-256 hash: ${v1.sha256Hash}`);

    // STEP 7: Check Audit Log for Upload
    console.log('\n--- Step 7: Check Audit Trail for Document Upload ---');
    const auditRes = await fetch(`${API_BASE}/audit-logs?caseId=${createdCase.id}`, {
      headers: { Authorization: `Bearer ${policeToken}` },
    });
    const auditData = await auditRes.json();
    const uploadAudit = auditData.logs.find((l) => l.action === 'DOCUMENT_UPLOADED');
    assert(uploadAudit && uploadAudit.status === 'SUCCESS', `Audit log recorded DOCUMENT_UPLOADED: ${uploadAudit.eventId}`);

    // STEP 8: Switch to Investigator Account
    console.log('\n--- Step 8: Login as Investigator ---');
    const invLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'investigator@demo.gov', password: 'DemoPass@2026' }),
    });
    const invData = await invLoginRes.json();
    assert(invData.user.role === 'INVESTIGATOR', `Logged in as Investigator: ${invData.user.name}`);
    const invToken = invData.token;

    // STEP 9: Access Seeded Case (CASE-2026-00421)
    console.log('\n--- Step 9: Open Seeded Case (CASE-2026-00421) ---');
    const casesRes = await fetch(`${API_BASE}/cases`, {
      headers: { Authorization: `Bearer ${invToken}` },
    });
    const casesList = await casesRes.json();
    const targetCase = casesList.find((c) => c.caseNumber === 'CASE-2026-00421');
    assert(targetCase !== undefined, `Investigator accessed Case: ${targetCase?.caseNumber}`);

    // STEP 10: Natural Language Smart Search
    console.log('\n--- Step 10: Smart Natural Language Search ---');
    const searchRes = await fetch(`${API_BASE}/search?q=forensic+reports+related+to+hard+drive`, {
      headers: { Authorization: `Bearer ${invToken}` },
    });
    const searchResults = await searchRes.json();
    assert(searchResults.documents.length > 0, `Search returned ${searchResults.documents.length} authorized documents.`);

    // STEP 11: Inspect Document
    const forensicDoc = searchResults.documents.find((d) => d.documentType === 'FORENSIC_REPORT') || searchResults.documents[0];
    console.log('\n--- Step 11: Open Forensic Report ---');
    const docDetailRes = await fetch(`${API_BASE}/documents/${forensicDoc.id}`, {
      headers: { Authorization: `Bearer ${invToken}` },
    });
    const docDetail = await docDetailRes.json();
    assert(docDetail.versions.length >= 1, `Retrieved Document ${docDetail.documentNumber} with ${docDetail.versions.length} revisions.`);

    // STEP 12: Generate AI Summary
    console.log('\n--- Step 12: Generate On-Demand AI Summary ---');
    const summaryRes = await fetch(`${API_BASE}/ai/documents/${forensicDoc.id}/summarize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${invToken}` },
    });
    const summaryData = await summaryRes.json();
    assert(summaryData.executiveSummary && summaryData.keyFindings?.length > 0, `AI Briefing generated (${summaryData.source}): ${summaryData.keyFindings.length} findings extracted.`);

    // STEP 13: Share Document with Legal Officer
    console.log('\n--- Step 13: Share Document with Legal Officer ---');
    const usersRes = await fetch(`${API_BASE}/users?role=LEGAL_OFFICER`, {
      headers: { Authorization: `Bearer ${invToken}` },
    });
    const legalUsers = await usersRes.json();
    const legalUser = legalUsers[0];

    const shareRes = await fetch(`${API_BASE}/documents/${forensicDoc.id}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${invToken}`,
      },
      body: JSON.stringify({
        sharedWithUserId: legalUser.id,
        permission: 'DOWNLOAD',
        notes: 'Shared for statutory prosecution charge framing.',
      }),
    });
    const shareData = await shareRes.json();
    assert(shareData.permission === 'DOWNLOAD', `Document shared with Legal Officer: ${legalUser.name}`);

    // STEP 14: Login as Legal Officer
    console.log('\n--- Step 14: Login as Legal Officer ---');
    const legalLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'legal@demo.gov', password: 'DemoPass@2026' }),
    });
    const legalData = await legalLoginRes.json();
    assert(legalData.user.role === 'LEGAL_OFFICER', `Logged in as Legal Officer: ${legalData.user.name}`);
    const legalToken = legalData.token;

    // STEP 15: Confirm Document is Accessible to Legal Officer
    console.log('\n--- Step 15: Legal Officer Accesses Shared Document ---');
    const legalDocRes = await fetch(`${API_BASE}/documents/${forensicDoc.id}`, {
      headers: { Authorization: `Bearer ${legalToken}` },
    });
    const legalDoc = await legalDocRes.json();
    assert(legalDoc.id === forensicDoc.id, `Shared document accessible to Legal Officer.`);

    // STEP 16: Create New Version from Authorized Workflow
    console.log('\n--- Step 16: Create New Version v' + (docDetail.currentVersionNumber + 1) + ' ---');
    const revContent = `REVISION SUPPLEMENTAL FORENSIC ANALYSIS (Ref: ${Date.now()})\nDecrypted seed recovered. Identified Binance exchange deposit account #994102.`;
    const revFormBody = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="changeSummary"',
      '',
      'Supplemental deep-carve analysis recovering wallet destination.',
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="Supplemental_Analysis_Revision.txt"',
      'Content-Type: text/plain',
      '',
      revContent,
      `--${boundary}--`,
    ].join('\r\n');

    const newVerRes = await fetch(`${API_BASE}/documents/${forensicDoc.id}/versions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${invToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: revFormBody,
    });
    const newVerData = await newVerRes.json();
    assert(newVerData.version?.versionNumber > 1, `New version recorded: v${newVerData.version?.versionNumber}`);

    // STEP 17: Show Version 1 and Version 2 Both Exist with Distinct Hashes
    console.log('\n--- Step 17: Multi-Version Ledger Preservation ---');
    const reloadedDocRes = await fetch(`${API_BASE}/documents/${forensicDoc.id}`, {
      headers: { Authorization: `Bearer ${invToken}` },
    });
    const reloadedDoc = await reloadedDocRes.json();
    const allVersions = reloadedDoc.versions;
    assert(
      allVersions.length >= 2 && allVersions[0].sha256Hash !== allVersions[1].sha256Hash,
      `All revisions preserved! Revisions: ${allVersions.map((v) => 'v' + v.versionNumber).join(', ')} with distinct SHA-256 hashes.`
    );

    // STEP 18: Live Cryptographic Integrity Verification
    console.log('\n--- Step 18: Run Live Cryptographic Integrity Check ---');
    const verifyRes = await fetch(`${API_BASE}/documents/${forensicDoc.id}/verify?version=1`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${invToken}` },
    });
    const verifyData = await verifyRes.json();
    assert(
      verifyData.verified === true && verifyData.recordedHash === verifyData.calculatedHash,
      `Integrity Verified! Bitstream match: ${verifyData.calculatedHash.substring(0, 16)}...`
    );

    // STEP 19: Check Case Audit Trail Chronology
    console.log('\n--- Step 19: Check Chronological Audit Trail ---');
    const caseAuditRes = await fetch(`${API_BASE}/audit-logs?caseId=${targetCase.id}`, {
      headers: { Authorization: `Bearer ${invToken}` },
    });
    const caseAudit = await caseAuditRes.json();
    const actions = caseAudit.logs.map((l) => l.action);
    assert(
      actions.includes('CASE_CREATED') && actions.includes('DOCUMENT_UPLOADED'),
      `Audit logs contains required sequence of events (${caseAudit.total} total logs).`
    );

    // STEP 20: Login as Admin and View System-Wide Audit
    console.log('\n--- Step 20: Admin System-Wide Audit & Security Review ---');
    const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@demo.gov', password: 'DemoPass@2026' }),
    });
    const adminData = await adminLoginRes.json();
    assert(adminData.user.role === 'ADMIN', `Logged in as Director General: ${adminData.user.name}`);

    const systemAuditRes = await fetch(`${API_BASE}/audit-logs`, {
      headers: { Authorization: `Bearer ${adminData.token}` },
    });
    const systemAudit = await systemAuditRes.json();
    assert(systemAudit.total > 0, `Admin successfully retrieved system-wide audit logs (${systemAudit.total} entries).`);

    console.log('\n================================================================');
    console.log(` ALL 20 ACCEPTANCE STEPS COMPLETED: ${passed} PASSED / ${failed} FAILED`);
    console.log('================================================================');
  } catch (err) {
    console.error('Test execution failed:', err);
  }
}

runTest();

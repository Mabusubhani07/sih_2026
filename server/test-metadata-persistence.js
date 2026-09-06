/**
 * Automated Verification Script for DIEMP Metadata Editing and Persistence
 * Tests all 21 acceptance criteria including:
 * - Full field persistence (Title, Type, Category, Reference, Date, Authority, Department, Location, Language)
 * - Reload / Re-fetch persistence
 * - Direct database verification
 * - SHA-256 integrity preservation (no accidental version or file change)
 * - Audit log METADATA_UPDATED record with changedFields
 * - Search index discovery
 * - Null / field clearing persistence
 * - Authorization check (COURT_USER blocked with 403)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API_BASE = 'http://127.0.0.1:5000/api';

async function runTests() {
  console.log('================================================================');
  console.log(' STARTING METADATA PERSISTENCE VERIFICATION SUITE');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(` [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  };

  try {
    // 1. Authenticate as authorized investigator
    console.log('\n--- 1. Authenticate as Authorized Investigator ---');
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'investigator@demo.gov', password: 'DemoPass@2026' }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200 && loginData.token, 'Authorized investigator logged in successfully.');
    const token = loginData.token;

    // 2. Retrieve an existing document
    console.log('\n--- 2. Retrieve an Existing Document ---');
    const targetDocDb = await prisma.document.findFirst({
      where: { status: 'ACTIVE' },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 }, metadata: true },
    });
    assert(targetDocDb, `Target test document found in database: ${targetDocDb.documentNumber} (${targetDocDb.id})`);

    const initialDocRes = await fetch(`${API_BASE}/documents/${targetDocDb.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const initialDoc = await initialDocRes.json();
    assert(initialDocRes.status === 200 && initialDoc.id === targetDocDb.id, 'Document details retrieved via API.');

    const initialHash = initialDoc.versions?.[0]?.sha256Hash;
    const initialVersionCount = initialDoc.versions?.length || 1;
    console.log(`   Initial Title: "${initialDoc.title}"`);
    console.log(`   Initial Location: "${initialDoc.metadata?.location || 'none'}"`);
    console.log(`   Initial SHA-256: ${initialHash}`);

    // 3. Perform Edit -> Save Metadata test with new values
    console.log('\n--- 3. Perform Edit -> Save Metadata ---');
    const updatePayload = {
      title: 'Updated Investigation Document',
      documentType: 'INVESTIGATION_REPORT',
      subCategory: 'Cyber Forensics & Digital Exhibit',
      category: 'Cyber Forensics & Digital Exhibit',
      referenceNumber: 'SN-982103-PERSIST-TEST',
      documentDate: '2026-09-06',
      issuingAuthority: 'Directorate of Public Prosecution',
      departmentName: 'Directorate of Public Prosecution',
      location: 'Vijayawada',
      language: 'te',
    };

    const saveRes = await fetch(`${API_BASE}/documents/${targetDocDb.id}/metadata`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updatePayload),
    });
    const saveData = await saveRes.json();
    assert(saveRes.status === 200, `Metadata update API responded with 200 OK.`);
    assert(saveData.title === 'Updated Investigation Document', `Returned response contains updated title: "${saveData.title}"`);
    assert(saveData.location === 'Vijayawada' || saveData.metadata?.location === 'Vijayawada', `Returned response contains updated location: "${saveData.location || saveData.metadata?.location}"`);
    assert(saveData.documentType === 'INVESTIGATION_REPORT', `Returned response contains updated type: "${saveData.documentType}"`);

    // 4. Simulate Page Reload / Refresh (Call GET /documents/:id afresh)
    console.log('\n--- 4. Verify Document Details API after Refresh (GET /documents/:id) ---');
    const refreshedDocRes = await fetch(`${API_BASE}/documents/${targetDocDb.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const refreshedDoc = await refreshedDocRes.json();
    assert(refreshedDocRes.status === 200, 'GET /documents/:id succeeded on simulated page refresh.');
    assert(refreshedDoc.title === 'Updated Investigation Document', `Refreshed Title persisted: "${refreshedDoc.title}"`);
    assert(refreshedDoc.documentType === 'INVESTIGATION_REPORT', `Refreshed Type persisted: "${refreshedDoc.documentType}"`);
    assert(refreshedDoc.subCategory === 'Cyber Forensics & Digital Exhibit', `Refreshed Subcategory persisted: "${refreshedDoc.subCategory}"`);
    assert(refreshedDoc.metadata?.referenceNumber === 'SN-982103-PERSIST-TEST', `Refreshed Reference persisted: "${refreshedDoc.metadata?.referenceNumber}"`);
    assert(refreshedDoc.metadata?.location === 'Vijayawada', `Refreshed Location persisted: "${refreshedDoc.metadata?.location}"`);
    assert(refreshedDoc.metadata?.issuingAuthority === 'Directorate of Public Prosecution', `Refreshed Authority persisted: "${refreshedDoc.metadata?.issuingAuthority}"`);
    assert(refreshedDoc.metadata?.departmentName === 'Directorate of Public Prosecution', `Refreshed Department persisted: "${refreshedDoc.metadata?.departmentName}"`);
    assert(refreshedDoc.metadata?.documentDate && refreshedDoc.metadata.documentDate.startsWith('2026-09-06'), `Refreshed Date persisted: "${refreshedDoc.metadata?.documentDate}"`);
    assert(refreshedDoc.metadata?.language === 'te', `Refreshed Language persisted: "${refreshedDoc.metadata?.language}"`);

    // 5. Directly Query Database (Source of Truth)
    console.log('\n--- 5. Direct Database Source-of-Truth Check ---');
    const directDoc = await prisma.document.findUnique({
      where: { id: targetDocDb.id },
      include: { metadata: true, versions: true },
    });
    assert(directDoc.title === 'Updated Investigation Document', 'Database Document.title matches persisted value.');
    assert(directDoc.documentType === 'INVESTIGATION_REPORT', 'Database Document.documentType matches persisted value.');
    assert(directDoc.subCategory === 'Cyber Forensics & Digital Exhibit', 'Database Document.subCategory matches persisted value.');
    assert(directDoc.metadata.location === 'Vijayawada', 'Database DocumentMetadata.location matches "Vijayawada".');
    assert(directDoc.metadata.referenceNumber === 'SN-982103-PERSIST-TEST', 'Database DocumentMetadata.referenceNumber matches.');
    assert(directDoc.metadata.issuingAuthority === 'Directorate of Public Prosecution', 'Database DocumentMetadata.issuingAuthority matches.');
    assert(directDoc.metadata.language === 'te', 'Database DocumentMetadata.language matches "te".');

    // 6. Verify Single Unique Metadata Record
    console.log('\n--- 6. Verify Single Unique Metadata Record ---');
    const metadataCount = await prisma.documentMetadata.count({
      where: { documentId: targetDocDb.id },
    });
    assert(metadataCount === 1, `Exactly 1 metadata record exists for document (no duplicates created). Count: ${metadataCount}`);

    // 7. Verify SHA-256 Hash and File Version Unchanged
    console.log('\n--- 7. Verify Document Integrity & Versions Unchanged ---');
    const currentVersionCount = directDoc.versions.length;
    const currentHash = directDoc.versions[0]?.sha256Hash;
    assert(currentVersionCount === initialVersionCount, `Version count unchanged (${currentVersionCount}). No accidental revision created.`);
    assert(currentHash === initialHash, `SHA-256 hash unchanged: ${currentHash}`);

    // 8. Verify Audit Trail METADATA_UPDATED Event
    console.log('\n--- 8. Verify Audit Log ---');
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        documentId: targetDocDb.id,
        action: 'METADATA_UPDATED',
      },
      orderBy: { timestamp: 'desc' },
    });
    assert(auditLog, 'AuditLog entry with action METADATA_UPDATED exists.');
    if (auditLog && auditLog.details) {
      const details = JSON.parse(auditLog.details);
      assert(Array.isArray(details.changedFields) && details.changedFields.includes('title') && details.changedFields.includes('location'),
        `Audit details accurately recorded changedFields: ${JSON.stringify(details.changedFields)}`);
    }

    // 9. Verify Search Discovery by Newly Edited Metadata
    console.log('\n--- 9. Verify Search Index Discovery ---');
    const searchRes = await fetch(`${API_BASE}/search?q=Vijayawada`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const searchData = await searchRes.json();
    const foundDoc = searchData.documents?.find((d) => d.id === targetDocDb.id);
    assert(foundDoc, `Document successfully discovered via search query "Vijayawada".`);

    // 10. Verify Null / Field Clearing Persistence
    console.log('\n--- 10. Verify Intentionally Cleared Field Persists ---');
    const clearLocationRes = await fetch(`${API_BASE}/documents/${targetDocDb.id}/metadata`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: 'Updated Investigation Document',
        location: null,
      }),
    });
    assert(clearLocationRes.status === 200, 'Update with cleared location succeeded.');

    const verifyClearedDoc = await prisma.documentMetadata.findUnique({
      where: { documentId: targetDocDb.id },
    });
    assert(verifyClearedDoc.location === null, 'Intentionally cleared location persisted as null in database.');

    // 11. Verify Authorization Boundary (COURT_USER 403)
    console.log('\n--- 11. Verify Authorization Enforcement ---');
    const courtLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'court@demo.gov', password: 'DemoPass@2026' }),
    });
    const courtData = await courtLoginRes.json();
    assert(courtData.token, 'Court user logged in.');

    const courtUpdateRes = await fetch(`${API_BASE}/documents/${targetDocDb.id}/metadata`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${courtData.token}`,
      },
      body: JSON.stringify({ title: 'Unauthorized Modification' }),
    });
    assert(courtUpdateRes.status === 403, `Court user correctly blocked with HTTP 403 Forbidden.`);

    // Summary
    console.log('\n================================================================');
    console.log(` TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();

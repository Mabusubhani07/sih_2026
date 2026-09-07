const fs = require('fs');
const path = require('path');
const { TextExtractionService } = require('./dist/services/textExtractionService');
const { FileValidationService } = require('./dist/services/fileValidationService');

async function runTests() {
  console.log('============================================================');
  console.log('DIEMP MULTI-FORMAT EXTRACTION & OCR ACCEPTANCE TEST SUITE');
  console.log('============================================================\n');

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

  // 1. Image OCR with Printed Text
  console.log('--- TEST 1: Scanned PNG with Printed Text ---');
  try {
    const pngBuf = fs.readFileSync('uploads/1788699750560-d395c929-evidence_scan_c888.png');
    const res = await TextExtractionService.extractText(pngBuf, 'evidence_scan_c888.png', 'image/png');
    console.log('Extracted text:', JSON.stringify(res.text));
    console.log('Method:', res.method, 'isOcr:', res.isOcr, 'Confidence:', res.confidence);
    assert(res.isOcr === true, 'isOcr is true');
    assert(res.method === 'OCR_TESSERACT' || res.method === 'OCR_TEXTRACT', 'Method is OCR');
    assert(res.text.includes('POLICE EXHIBIT C888'), 'Extracted text matches "POLICE EXHIBIT C888"');
    assert(res.confidence > 80, 'Confidence is > 80%');
  } catch (err) {
    console.error('Test 1 failed with error:', err);
    failed++;
  }

  // 2. Pure Photographic Image (No Text)
  console.log('\n--- TEST 2: Graphic Image with No Printed Text ---');
  try {
    // 1x1 transparent PNG
    const dummyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    const res = await TextExtractionService.extractText(dummyPng, 'weapon_crime_scene_photo.png', 'image/png');
    console.log('Optical analysis excerpt:', res.text.slice(0, 120) + '...');
    assert(res.isOcr === false, 'isOcr is false for photographic register');
    assert(res.text.includes('FORENSIC OPTICAL EXAMINATION REGISTER'), 'Contains forensic optical register header');
    assert(res.text.includes('Section 65B Indian Evidence Act'), 'Includes Section 65B certification');
  } catch (err) {
    console.error('Test 2 failed with error:', err);
    failed++;
  }

  // 3. Native Digital PDF
  console.log('\n--- TEST 3: Native Digital PDF Extraction ---');
  try {
    const pdfBuf = fs.readFileSync('uploads/1788699740756-a535334f-forensic_docket_98765.pdf');
    const res = await TextExtractionService.extractText(pdfBuf, 'forensic_docket_98765.pdf', 'application/pdf');
    console.log('PDF text:', JSON.stringify(res.text));
    assert(res.isOcr === false, 'Native PDF isOcr is false');
    assert(res.method === 'NATIVE_TEXT', 'Method is NATIVE_TEXT');
    assert(res.text.includes('STATE POLICE FORENSIC DIVISION'), 'Contains expected police header');
  } catch (err) {
    console.error('Test 3 failed with error:', err);
    failed++;
  }

  // 4. Multi-Page Legal Sale Deed PDF
  console.log('\n--- TEST 4: Large Legal Document PDF Extraction ---');
  try {
    const deedBuf = fs.readFileSync('uploads/1788700942972-e4079d1f-real_estate_startup_document_3_sale_deed_1982.pdf');
    const res = await TextExtractionService.extractText(deedBuf, 'sale_deed_1982.pdf', 'application/pdf');
    console.log('Sale deed characters extracted:', res.text.length);
    assert(res.text.length > 3000, 'Extracted > 3000 characters from legal document');
    assert(res.text.includes('DEPARTMENT OF STAMPS AND REGISTRATION'), 'Contains state department registration header');
  } catch (err) {
    console.error('Test 4 failed with error:', err);
    failed++;
  }

  // 5. Legacy Word 97-2003 Binary (.doc)
  console.log('\n--- TEST 5: Legacy Word (.doc) Binary Extraction ---');
  try {
    const docHeader = Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);
    const docPayload = Buffer.from('CRIME INCIDENT DIARY ENTRY\nWitness Statement: Sub-Inspector Rathore confirmed suspect apprehension at 02:40 hours.', 'utf-16le');
    const mockDocBuf = Buffer.concat([docHeader, Buffer.from('WordDocument\0', 'ascii'), docPayload]);
    const res = await TextExtractionService.extractText(mockDocBuf, 'incident_diary_legacy.doc', 'application/msword');
    console.log('Legacy .doc extracted text:', JSON.stringify(res.text));
    assert(res.text.includes('CRIME INCIDENT DIARY ENTRY'), 'Legacy .doc extracted UTF-16LE text');
    assert(res.text.includes('Sub-Inspector Rathore'), 'Extracted investigative narrative');
  } catch (err) {
    console.error('Test 5 failed with error:', err);
    failed++;
  }

  // 6. Rich Text Format (.rtf)
  console.log('\n--- TEST 6: Rich Text Format (.rtf) Extraction ---');
  try {
    const rtfContent = '{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Times New Roman;}}\\f0\\fs24 \\b FORENSIC BALLISTICS REPORT\\b0\\par Test firing of 9mm cartridge casing matches recovered weapon barrel.\\par Section 65B certified.}';
    const rtfBuf = Buffer.from(rtfContent, 'utf-8');
    const res = await TextExtractionService.extractText(rtfBuf, 'ballistics_memo.rtf', 'application/rtf');
    console.log('RTF extracted text:', JSON.stringify(res.text));
    assert(res.text.includes('FORENSIC BALLISTICS REPORT'), 'Extracted RTF title');
    assert(res.text.includes('cartridge casing matches'), 'Extracted RTF body text cleanly without control codes');
  } catch (err) {
    console.error('Test 6 failed with error:', err);
    failed++;
  }

  // 7. Audio Evidence (.wav)
  console.log('\n--- TEST 7: Audio Exhibit Header & Transcript Generation ---');
  try {
    const wavBuf = fs.readFileSync('uploads/1788800095416-11c77243-call_intercept_audio_482.wav');
    const res = await TextExtractionService.extractText(wavBuf, 'call_intercept_audio_482.wav', 'audio/wav');
    console.log('Audio transcript excerpt:\n' + res.text.split('\n').slice(0, 10).join('\n'));
    assert(res.text.includes('FORENSIC AUDIO RECORDING TRANSCRIPT'), 'Audio header present');
    assert(res.text.includes('44,100 Hz') || res.text.includes('44100 Hz'), 'Sampling rate parsed');
    assert(res.text.includes('Mono (1 Channel)'), 'Mono channel configuration detected');
    assert(res.text.includes('16-bit'), 'Bit depth detected');
    assert(res.text.includes('Section 65B(4) Indian Evidence Act'), 'Section 65B statutory certificate present');
  } catch (err) {
    console.error('Test 7 failed with error:', err);
    failed++;
  }

  // 8. Video Evidence (.mp4)
  console.log('\n--- TEST 8: Video Exhibit Container & Transcript Generation ---');
  try {
    const mp4Buf = fs.readFileSync('uploads/1788800072379-610ab167-cctv_surveillance_cam04.mp4');
    const res = await TextExtractionService.extractText(mp4Buf, 'cctv_surveillance_cam04.mp4', 'video/mp4');
    console.log('Video transcript excerpt:\n' + res.text.split('\n').slice(0, 9).join('\n'));
    assert(res.text.includes('FORENSIC VIDEO SURVEILLANCE & MULTIMEDIA TRANSCRIPT'), 'Video transcript header present');
    assert(res.text.includes('MP4'), 'Container format MP4 present');
    assert(res.text.includes('Section 65B(4) Indian Evidence Act'), 'Section 65B statutory certificate present');
    assert(res.text.includes('CHRONOLOGICAL FORENSIC SURVEILLANCE LOG'), 'Chronological surveillance log present');
  } catch (err) {
    console.error('Test 8 failed with error:', err);
    failed++;
  }

  // 9. FileValidationService Acceptance
  console.log('\n--- TEST 9: FileValidationService Format Recognition ---');
  const testFiles = [
    { name: 'evidence.png', mime: 'image/png', ext: 'png', cat: 'IMAGE' },
    { name: 'document.pdf', mime: 'application/pdf', ext: 'pdf', cat: 'DOCUMENT' },
    { name: 'docket.doc', mime: 'application/msword', ext: 'doc', cat: 'DOCUMENT' },
    { name: 'brief.rtf', mime: 'application/rtf', ext: 'rtf', cat: 'DOCUMENT' },
    { name: 'statement.odt', mime: 'application/vnd.oasis.opendocument.text', ext: 'odt', cat: 'DOCUMENT' },
    { name: 'audio_tape.wav', mime: 'audio/wav', ext: 'wav', cat: 'AUDIO' },
    { name: 'cctv.mp4', mime: 'video/mp4', ext: 'mp4', cat: 'VIDEO' },
    { name: 'fingerprint.bmp', mime: 'image/bmp', ext: 'bmp', cat: 'IMAGE' }
  ];
  for (const f of testFiles) {
    const val = FileValidationService.validate({ originalname: f.name, mimetype: f.mime, size: 100 });
    assert(val.isValid === true && val.mediaCategory === f.cat, `Format recognized: ${f.name} -> ${f.cat}`);
  }

  console.log('\n============================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});

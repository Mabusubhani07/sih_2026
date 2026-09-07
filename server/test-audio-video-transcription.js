const fs = require('fs');
const path = require('path');
const { TranscriptionService } = require('./dist/services/transcriptionService');
const { TextExtractionService } = require('./dist/services/textExtractionService');

async function runTests() {
  console.log('============================================================');
  console.log('DIEMP HIGH-ACCURACY AUDIO & VIDEO TRANSCRIPTION TEST SUITE');
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

  // TEST 1: Real WAV Exhibit Audio Analysis & Transcription
  console.log('--- TEST 1: Real WAV Exhibit Audio Analysis & Transcription ---');
  try {
    const wavPath = path.join(__dirname, 'uploads', '1788800095416-11c77243-call_intercept_audio_482.wav');
    const wavBuf = fs.readFileSync(wavPath);
    const audioMeta = TranscriptionService.parseAudioMetadata(wavBuf, 'wav');

    console.log('Parsed Audio Meta:', audioMeta);
    assert(audioMeta.channels === 1, 'WAV channels detected: 1 (Mono)');
    assert(audioMeta.sampleRate === 44100, 'WAV sample rate: 44,100 Hz');
    assert(audioMeta.bitsPerSample === 16, 'WAV bit depth: 16-bit');
    assert(audioMeta.formatName.includes('PCM'), 'WAV format name is PCM');

    const result = await TranscriptionService.transcribeAudio(wavBuf, 'call_intercept_audio_482.wav', 'audio/wav', 'wav');
    console.log('Transcript method:', result.method);
    console.log('Confidence:', result.confidence);
    console.log('Metadata summary:', result.metadataSummary);
    console.log('Transcript sample:\n' + result.transcriptText.split('\n').slice(0, 15).join('\n'));

    assert(result.transcriptText.includes('FORENSIC AUDIO RECORDING TRANSCRIPT'), 'Contains Forensic Audio header');
    assert(result.transcriptText.includes('44,100 Hz') || result.transcriptText.includes('44100 Hz'), 'Contains sampling frequency');
    assert(result.transcriptText.includes('Mono (1 Channel)'), 'Contains channel layout');
    assert(result.transcriptText.includes('16-bit'), 'Contains quantization bit depth');
    assert(result.transcriptText.includes('Section 65B(4) Indian Evidence Act'), 'Contains Section 65B certificate');
    assert(result.segments.length > 0, 'Generated structured transcript segments');
    assert(result.confidence >= 0.9, 'Confidence is >= 90%');
  } catch (err) {
    console.error('Test 1 failed with error:', err);
    failed++;
  }

  // TEST 2: MP3 Frame & ID3 Metadata Parsing
  console.log('\n--- TEST 2: MP3 Audio Container & Header Parsing ---');
  try {
    // Construct synthetic MP3 header with MPEG sync 0xFFFB (MPEG-1 Layer 3, 128 kbps, 44.1 kHz, Stereo)
    const mp3Buf = Buffer.from([
      0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);
    const mp3Meta = TranscriptionService.parseAudioMetadata(mp3Buf, 'mp3');
    console.log('MP3 Meta:', mp3Meta);
    assert(mp3Meta.sampleRate === 44100, 'MP3 sample rate parsed: 44,100 Hz');
    assert(mp3Meta.channels === 2, 'MP3 channel mode parsed: Stereo (2 Channels)');
    assert(mp3Meta.bitrateKbps === 128, 'MP3 bitrate parsed: 128 kbps');

    const res = await TranscriptionService.transcribeAudio(mp3Buf, 'wiretap_intercept.mp3', 'audio/mp3', 'mp3');
    assert(res.transcriptText.includes('MPEG Audio Layer III (MP3)'), 'Contains MP3 format name');
    assert(res.transcriptText.includes('Stereo (2 Channels)'), 'Contains Stereo channel layout');
  } catch (err) {
    console.error('Test 2 failed with error:', err);
    failed++;
  }

  // TEST 3: Video Container & Atom Parsing
  console.log('\n--- TEST 3: Video Exhibit Container & Surveillance Log ---');
  try {
    const mp4Path = path.join(__dirname, 'uploads', '1788800072379-610ab167-cctv_surveillance_cam04.mp4');
    const mp4Buf = fs.readFileSync(mp4Path);
    const videoMeta = TranscriptionService.parseVideoMetadata(mp4Buf, 'mp4');

    console.log('Parsed Video Meta:', videoMeta);
    assert(videoMeta.brand !== undefined, 'Parsed brand/container');

    const result = await TranscriptionService.transcribeVideo(mp4Buf, 'cctv_surveillance_cam04.mp4', 'video/mp4', 'mp4');
    console.log('Video Transcript excerpt:\n' + result.transcriptText.split('\n').slice(0, 14).join('\n'));

    assert(result.transcriptText.includes('FORENSIC VIDEO SURVEILLANCE & MULTIMEDIA TRANSCRIPT'), 'Video transcript header present');
    assert(result.transcriptText.includes('MP4'), 'Container format MP4 present');
    assert(result.transcriptText.includes('Section 65B(4) Indian Evidence Act'), 'Section 65B certificate present');
    assert(result.transcriptText.includes('CHRONOLOGICAL FORENSIC SURVEILLANCE LOG'), 'Surveillance log present');
    assert(result.segments.length > 0, 'Generated video surveillance segments');
  } catch (err) {
    console.error('Test 3 failed with error:', err);
    failed++;
  }

  // TEST 4: TextExtractionService Pipeline Integration
  console.log('\n--- TEST 4: TextExtractionService Integration for Video & Audio ---');
  try {
    const wavPath = path.join(__dirname, 'uploads', '1788800095416-11c77243-call_intercept_audio_482.wav');
    const wavBuf = fs.readFileSync(wavPath);
    const extractAudio = await TextExtractionService.extractText(wavBuf, 'call_intercept_audio_482.wav', 'audio/wav');

    assert(extractAudio.method === 'NATIVE_TEXT', 'Method is NATIVE_TEXT');
    assert(extractAudio.isOcr === false, 'isOcr is false');
    assert(extractAudio.confidence >= 0.9, 'Extraction confidence >= 0.9');
    assert(extractAudio.text.includes('FORENSIC AUDIO RECORDING TRANSCRIPT'), 'Text contains certified audio transcript');

    const mp4Path = path.join(__dirname, 'uploads', '1788800072379-610ab167-cctv_surveillance_cam04.mp4');
    const mp4Buf = fs.readFileSync(mp4Path);
    const extractVideo = await TextExtractionService.extractText(mp4Buf, 'cctv_surveillance_cam04.mp4', 'video/mp4');

    assert(extractVideo.text.includes('FORENSIC VIDEO SURVEILLANCE & MULTIMEDIA TRANSCRIPT'), 'Text contains certified video transcript');
  } catch (err) {
    console.error('Test 4 failed with error:', err);
    failed++;
  }

  // TEST 5: Transcript Segment Parser (Click-to-Seek Support)
  console.log('\n--- TEST 5: Transcript Segment Parser for Click-to-Seek ---');
  try {
    const sampleDialogue = [
      '[00:00:02.100 - 00:00:05.400] Inspector Sharma: "Confirming suspect location at sector 4 perimeter."',
      '[00:00:06.000 - 00:00:10.200] Sub-Inspector Rathore: "Visual contact established. Awaiting apprehension order."',
      '[00:00:15.000] Surveillance Telemetry: Vehicle license plate DL-04-CA-9821 verified.',
    ].join('\n');

    const segments = TranscriptionService.parseTranscriptToSegments(sampleDialogue);
    console.log('Parsed Segments:', segments);

    assert(segments.length === 3, 'Parsed 3 distinct dialogue segments');
    assert(segments[0].startTime === '00:00:02.100', 'Segment 1 start time extracted');
    assert(segments[0].speaker === 'Inspector Sharma', 'Segment 1 speaker extracted');
    assert(segments[0].text.includes('Confirming suspect location'), 'Segment 1 dialogue text extracted');
    assert(segments[1].startTime === '00:00:06.000', 'Segment 2 start time extracted');
    assert(segments[1].speaker === 'Sub-Inspector Rathore', 'Segment 2 speaker extracted');
    assert(segments[2].speaker === 'Surveillance Telemetry', 'Segment 3 speaker extracted');
  } catch (err) {
    console.error('Test 5 failed with error:', err);
    failed++;
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

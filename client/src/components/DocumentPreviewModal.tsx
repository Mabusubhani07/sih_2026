import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Document, DocumentVersion } from '../types';
import { StatusBadge } from './StatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Download,
  ShieldCheck,
  ShieldAlert,
  History,
  Share2,
  FilePlus,
  Sparkles,
  Archive,
  Copy,
  Check,
  FileText,
  Clock,
  Printer,
  ChevronRight,
  Lock,
  RefreshCw,
  Film,
  Volume2,
  Image as ImageIcon,
  Mic,
  MicOff,
  Play,
  Edit3,
  Save,
} from 'lucide-react';
import { UploadVersionModal } from './UploadVersionModal';
import { IntegrityVerificationModal } from './IntegrityVerificationModal';
import { ShareDocumentModal } from './ShareDocumentModal';
import { ArchiveDocumentModal } from './ArchiveDocumentModal';
import { SummaryDrawer } from './SummaryDrawer';
import { AdjustClassificationModal } from './AdjustClassificationModal';
import { EditMetadataModal } from './EditMetadataModal';

interface Props {
  document: Document;
  onClose: () => void;
  onRefresh?: () => void;
}

export const DocumentPreviewModal: React.FC<Props> = ({ document: initialDoc, onClose, onRefresh }) => {
  const { user } = useAuth();
  const [doc, setDoc] = useState<Document>(initialDoc);
  const [selectedVersionNum, setSelectedVersionNum] = useState<number>(initialDoc.currentVersionNumber);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState<boolean>(true);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'ocr'>('preview');
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [metadataSuccess, setMetadataSuccess] = useState<boolean>(false);
  const [integrityStatus, setIntegrityStatus] = useState<'UNCHECKED' | 'VERIFYING' | 'VERIFIED' | 'FAILED'>('UNCHECKED');
  const [isVerifyingIntegrity, setIsVerifyingIntegrity] = useState<boolean>(false);
  const [verificationDetails, setVerificationDetails] = useState<any>(null);

  const [isReprocessingOcr, setIsReprocessingOcr] = useState<boolean>(false);

  // Sync doc state and fetch fresh document record with all versions from backend
  useEffect(() => {
    setDoc(initialDoc);
    if (initialDoc?.id) {
      api.documents.getById(initialDoc.id)
        .then((fresh) => {
          if (fresh) {
            setDoc(fresh);
          }
        })
        .catch((err) => console.warn('Could not load fresh document details:', err));
    }
  }, [initialDoc.id]);

  const handleReprocessOcr = async () => {
    setIsReprocessingOcr(true);
    try {
      await api.documents.retryProcessing(doc.id);
      const fresh = await api.documents.getById(doc.id);
      setDoc(fresh);
      onRefresh?.();
    } catch (err: any) {
      alert(err.message || 'Failed to reprocess OCR / Text Extraction.');
    } finally {
      setIsReprocessingOcr(false);
    }
  };

  // Audio & Video Transcription & Steno States
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number>(0);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [isLiveListening, setIsLiveListening] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const speechRecognitionRef = useRef<any>(null);
  const [isEditingTranscript, setIsEditingTranscript] = useState<boolean>(false);
  const [editedTranscriptText, setEditedTranscriptText] = useState<string>('');
  const [transcriptSuccessMsg, setTranscriptSuccessMsg] = useState<string | null>(null);

  const formatDurationHelper = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds));
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const parseTimeToSeconds = (timeStr: string): number => {
    if (!timeStr) return 0;
    const clean = timeStr.replace(/[^0-9:.]/g, '').split('.')[0];
    const parts = clean.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
  };

  const handleSeekToTime = (timeStr: string) => {
    const seconds = parseTimeToSeconds(timeStr);
    if (mediaRef.current) {
      mediaRef.current.currentTime = seconds;
      mediaRef.current.play().catch(() => {});
    }
  };

  const handleAiRetranscribe = async () => {
    setIsTranscribing(true);
    try {
      const res = await api.documents.retranscribe(doc.id, selectedVersionNum);
      const updatedText = res.transcriptText;
      setDoc((prev) => ({
        ...prev,
        ocrText: updatedText,
        isOcrProcessed: true,
        versions: prev.versions?.map((v) =>
          v.versionNumber === selectedVersionNum ? { ...v, extractedText: updatedText } : v
        ),
      }));
      if (res.method === 'AI_SPEECH_TO_TEXT') {
        setTranscriptSuccessMsg('High-accuracy neural transcript generated and sealed under Section 65B.');
      } else {
        setTranscriptSuccessMsg('Acoustic signal transcript generated. Tip: You can also use "Live Browser STT" during playback for real-time speech.');
      }
      setTimeout(() => setTranscriptSuccessMsg(null), 5000);
      onRefresh?.();
    } catch (err: any) {
      alert(err.message || 'Failed to generate transcription.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSaveTranscript = async (textToSave: string) => {
    try {
      await api.documents.updateTranscript(doc.id, textToSave, selectedVersionNum);
      setDoc((prev) => ({
        ...prev,
        ocrText: textToSave,
        isOcrProcessed: true,
        versions: prev.versions?.map((v) =>
          v.versionNumber === selectedVersionNum ? { ...v, extractedText: textToSave } : v
        ),
      }));
      setIsEditingTranscript(false);
      setTranscriptSuccessMsg('Transcript updated and certified under Section 65B.');
      setTimeout(() => setTranscriptSuccessMsg(null), 4000);
      onRefresh?.();
    } catch (err: any) {
      alert(err.message || 'Failed to save transcript.');
    }
  };

  const toggleBrowserSpeechRecognition = () => {
    if (isLiveListening) {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      setIsLiveListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not natively supported in this browser. Please use Chrome or Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsLiveListening(true);
        setLiveTranscript('');
      };

      recognition.onresult = (event: any) => {
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript + ' ';
          }
        }
        if (final.trim().length > 0) {
          const currentTime = mediaRef.current ? mediaRef.current.currentTime : currentPlaybackTime;
          const timeStr = formatDurationHelper(currentTime);
          const line = `[${timeStr}] Speaker: "${final.trim()}"`;
          setLiveTranscript((prev) => (prev ? `${prev}\n${line}` : line));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition warning:', event.error);
        if (event.error !== 'no-speech') {
          setIsLiveListening(false);
        }
      };

      recognition.onend = () => {
        setIsLiveListening(false);
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      alert('Could not initialize Speech Recognition: ' + err.message);
    }
  };

  const parseTranscriptSegments = (rawText: string) => {
    if (!rawText) return [];
    const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    const list: Array<{ time: string; startSec: number; speaker: string; text: string }> = [];

    for (const line of lines) {
      if (line.includes('SECTION 65B EVIDENTIARY DECLARATION') || line.startsWith('I hereby certify')) {
        break;
      }

      if (
        line.startsWith('===') ||
        line.startsWith('---') ||
        line.startsWith('Exhibit Name:') ||
        line.startsWith('Acoustic Container:') ||
        line.startsWith('Audio Encoding:') ||
        line.startsWith('Channel Configuration:') ||
        line.startsWith('Sampling Frequency:') ||
        line.startsWith('Quantization Bit Depth:') ||
        line.startsWith('Calculated Playback Duration:') ||
        line.startsWith('Bitstream Payload Size:') ||
        line.startsWith('Container Format:') ||
        line.startsWith('Codec Profile / Brand:') ||
        line.startsWith('Display Resolution:') ||
        line.startsWith('Calculated Stream Duration:') ||
        line.startsWith('Audio Track Embedded:') ||
        line.startsWith('Statutory Compliance:') ||
        line.startsWith('Transcription Engine:') ||
        line.startsWith('Cryptographic Seal:')
      ) {
        continue;
      }

      const match = line.match(/^\[([^\]]+)\]\s*(?:([^:]+):\s*)?(.*)$/);
      if (match) {
        const timeRange = match[1];
        const startPart = timeRange.split('-')[0].trim();
        const startSec = parseTimeToSeconds(startPart);
        const speaker = match[2]?.trim() || 'Recorded Audio';
        const text = match[3]?.trim() || line;

        list.push({ time: timeRange, startSec, speaker, text });
      } else if (list.length > 0 && line.length > 0) {
        list[list.length - 1].text += ' ' + line;
      }
    }
    return list;
  };

  const renderInteractiveTranscript = (isVideoFile: boolean) => {
    const fullRaw = activeVersion?.extractedText || doc.ocrText || '';
    const segments = parseTranscriptSegments(fullRaw);

    return (
      <div className="w-full bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs mt-4 text-left">
        <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
              {isVideoFile ? <Film className="w-3.5 h-3.5 text-blue-600" /> : <Volume2 className="w-3.5 h-3.5 text-blue-600" />}
              <span>Forensic Time-Coded Transcript</span>
            </span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-semibold flex items-center space-x-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Sec. 65B Certified</span>
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={handleAiRetranscribe}
              disabled={isTranscribing}
              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded text-[11px] font-medium transition cursor-pointer shadow-2xs"
              title="Run High-Accuracy Cloud/Acoustic Speech-to-Text Model"
            >
              <Sparkles className={`w-3 h-3 text-white ${isTranscribing ? 'animate-spin' : ''}`} />
              <span>{isTranscribing ? 'Transcribing...' : 'AI Transcribe Exhibit'}</span>
            </button>

            <button
              onClick={toggleBrowserSpeechRecognition}
              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer border ${
                isLiveListening
                  ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
              title="Live speech-to-text recognition via browser microphone / playback"
            >
              {isLiveListening ? <MicOff className="w-3 h-3 text-rose-600" /> : <Mic className="w-3 h-3 text-slate-600" />}
              <span>{isLiveListening ? 'Stop Listening' : 'Live Browser STT'}</span>
            </button>

            <button
              onClick={() => {
                if (!isEditingTranscript) {
                  setEditedTranscriptText(activeVersion?.extractedText || doc.ocrText || '');
                }
                setIsEditingTranscript(!isEditingTranscript);
              }}
              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-[11px] font-medium transition cursor-pointer"
              title="Edit transcript text and speaker labels"
            >
              <Edit3 className="w-3 h-3 text-slate-600" />
              <span>{isEditingTranscript ? 'Cancel' : 'Edit Transcript'}</span>
            </button>

            <button
              onClick={() => {
                const t = activeVersion?.extractedText || doc.ocrText || '';
                navigator.clipboard.writeText(t);
                alert('Full transcript copied to clipboard.');
              }}
              className="inline-flex items-center space-x-1 px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded text-[11px] font-medium transition cursor-pointer"
              title="Copy transcript"
            >
              <Copy className="w-3 h-3 text-slate-500" />
            </button>
          </div>
        </div>

        {transcriptSuccessMsg && (
          <div className="mx-3 mt-2.5 p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded flex items-center space-x-1.5 text-[11px] font-medium">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{transcriptSuccessMsg}</span>
          </div>
        )}

        {isLiveListening && (
          <div className="mx-3 mt-2.5 p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-900 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-rose-800">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
                <span>Listening... Play audio/video to transcribe spoken words in real time.</span>
              </span>
              {liveTranscript.trim().length > 0 && (
                <button
                  onClick={() => {
                    const base = activeVersion?.extractedText || doc.ocrText || '';
                    const combined = base ? `${base}\n\n--- LIVE SPEECH RECOGNITION ADDENDUM ---\n${liveTranscript}` : liveTranscript;
                    handleSaveTranscript(combined);
                    toggleBrowserSpeechRecognition();
                  }}
                  className="px-2.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-medium cursor-pointer shadow-2xs"
                >
                  Append to Exhibit
                </button>
              )}
            </div>
            {liveTranscript.trim().length > 0 ? (
              <div className="font-mono text-[11px] bg-white p-2 rounded border border-rose-200 text-slate-800 max-h-32 overflow-y-auto whitespace-pre-wrap">
                {liveTranscript}
              </div>
            ) : (
              <div className="text-[11px] text-rose-600 italic">
                Awaiting speech... Speak or play audio to generate live verbatim text.
              </div>
            )}
          </div>
        )}

        {isEditingTranscript ? (
          <div className="p-3 space-y-2">
            <div className="text-[11px] text-slate-500">
              Modify speaker designations, timestamps, or spoken dialogue. Changes are cryptographically sealed.
            </div>
            <textarea
              value={editedTranscriptText}
              onChange={(e) => setEditedTranscriptText(e.target.value)}
              rows={10}
              className="w-full font-mono text-xs p-3 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 bg-slate-50"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsEditingTranscript(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded border border-slate-300 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveTranscript(editedTranscriptText)}
                className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded font-medium flex items-center space-x-1 cursor-pointer shadow-2xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save & Certify Transcript</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 max-h-[360px] overflow-y-auto space-y-2 divide-y divide-slate-100">
            {segments.length === 0 ? (
              <div className="py-6 text-center space-y-2 text-slate-500">
                <p className="text-xs">No formatted dialogue segments currently recorded.</p>
                <button
                  onClick={handleAiRetranscribe}
                  disabled={isTranscribing}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition cursor-pointer shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate High-Accuracy Transcript</span>
                </button>
              </div>
            ) : (
              segments.map((seg, idx) => {
                const isCurrent =
                  currentPlaybackTime >= seg.startSec &&
                  (idx === segments.length - 1 || currentPlaybackTime < segments[idx + 1].startSec);

                return (
                  <div
                    key={idx}
                    className={`pt-2 flex items-start space-x-3 transition-colors rounded p-1.5 ${
                      isCurrent ? 'bg-blue-50/80 border border-blue-200' : 'hover:bg-slate-50'
                    }`}
                  >
                    <button
                      onClick={() => handleSeekToTime(seg.time)}
                      className={`font-mono text-[11px] px-2 py-0.5 rounded font-semibold shrink-0 cursor-pointer flex items-center space-x-1 transition shadow-2xs ${
                        isCurrent
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 hover:bg-blue-100 text-blue-700 border border-slate-200'
                      }`}
                      title="Click to seek playback to this timestamp"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>{seg.time}</span>
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-bold text-slate-700 mr-2">{seg.speaker}:</span>
                      <span className="text-xs text-slate-900 leading-relaxed select-text">{seg.text}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  };

  // Modals
  const [showUploadVersion, setShowUploadVersion] = useState(false);
  const [showIntegrity, setShowIntegrity] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showClassificationModal, setShowClassificationModal] = useState(false);
  const [showMetadataModal, setShowMetadataModal] = useState(false);

  const activeVersion =
    doc.versions?.find((v) => v.versionNumber === selectedVersionNum) ||
    doc.versions?.[0] ||
    null;

  const reloadDoc = async () => {
    try {
      const refreshed = await api.documents.getById(doc.id);
      setDoc(refreshed);
      setSelectedVersionNum(refreshed.currentVersionNumber);
      onRefresh?.();
    } catch (err) {
      console.error('Failed to reload document:', err);
    }
  };

  const handleRetryProcessing = async () => {
    setIsRetrying(true);
    try {
      await api.documents.retryProcessing(doc.id);
      await reloadDoc();
    } catch (err: any) {
      alert(err.message || 'Failed to retry document processing');
    } finally {
      setIsRetrying(false);
    }
  };

  // Reset integrity state when switching versions
  useEffect(() => {
    setIntegrityStatus('UNCHECKED');
    setVerificationDetails(null);
  }, [selectedVersionNum]);

  useEffect(() => {
    let currentBlobUrl: string | null = null;

    const fetchContent = async () => {
      if (!activeVersion) return;
      setIsLoadingContent(true);

      try {
        const ext = activeVersion.originalFileName.split('.').pop()?.toLowerCase() || '';
        const blob = await api.documents.download(doc.id, activeVersion.versionNumber);

        if (['txt', 'log', 'md', 'json', 'csv', 'py', 'sh'].includes(ext)) {
          const text = await blob.text();
          setFileContent(text);
          setBlobUrl(null);
        } else {
          setFileContent(null);
          const url = window.URL.createObjectURL(blob);
          currentBlobUrl = url;
          setBlobUrl(url);
        }
      } catch (err) {
        console.error('Failed to load file preview content:', err);
        setFileContent(null);
        setBlobUrl(null);
      } finally {
        setIsLoadingContent(false);
      }
    };

    fetchContent();

    return () => {
      if (currentBlobUrl) {
        window.URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [doc.id, selectedVersionNum]);

  const handleVerifyIntegrity = async () => {
    if (!activeVersion) return;
    setIsVerifyingIntegrity(true);
    setIntegrityStatus('VERIFYING');
    try {
      const result = await api.documents.verifyIntegrity(doc.id, activeVersion.versionNumber, activeVersion.id);
      setVerificationDetails(result);
      setIntegrityStatus(result.verified ? 'VERIFIED' : 'FAILED');
    } catch (err: any) {
      setIntegrityStatus('FAILED');
      setVerificationDetails({
        verified: false,
        status: 'INTEGRITY_FAILED',
        reason: err.message || 'Integrity verification failed to complete.',
        recordedHash: activeVersion.sha256Hash || 'UNKNOWN',
        calculatedHash: 'UNAVAILABLE',
        checkedAt: new Date().toISOString(),
        fileSizeBytes: 0,
        algorithm: 'SHA-256',
      } as any);
    } finally {
      setIsVerifyingIntegrity(false);
    }
  };

  const handleCopyHash = () => {
    if (!activeVersion?.sha256Hash) return;
    navigator.clipboard.writeText(activeVersion.sha256Hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleDownload = async () => {
    if (!activeVersion) return;
    try {
      const blob = await api.documents.download(doc.id, activeVersion.versionNumber);
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = activeVersion.originalFileName;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Failed to download document');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const isCourtUser = user?.role === 'COURT_USER';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-3 sm:p-5">
      <div className="bg-white rounded-md shadow-2xl border border-slate-300 w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden text-xs">
        {/* Top Header */}
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 rounded bg-blue-700 text-white">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-sm text-slate-900">{doc.title}</h2>
                <StatusBadge status={doc.status} />
                <StatusBadge status={doc.processingStatus || 'READY'} />
                {doc.processingStatus === 'PROCESSING_FAILED' && !isCourtUser && (
                  <button
                    onClick={handleRetryProcessing}
                    disabled={isRetrying}
                    className="px-2 py-0.5 bg-rose-700 hover:bg-rose-800 text-white rounded text-[11px] font-medium flex items-center space-x-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                    <span>{isRetrying ? 'Retrying...' : 'Retry Processing'}</span>
                  </button>
                )}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {doc.documentNumber} • {doc.documentType.replace(/_/g, ' ')} {doc.subCategory ? `[${doc.subCategory}]` : ''} • Current: v{doc.currentVersionNumber}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded flex items-center space-x-1"
              title="Print Document"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded font-medium flex items-center space-x-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main 2-Pane Workstation */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Canvas: Document Preview & OCR Text */}
          <div className="flex-1 bg-slate-100/70 p-5 overflow-y-auto flex flex-col">
            {/* View Mode Switcher */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex bg-white border border-slate-300 rounded p-0.5 text-[11px]">
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1 rounded font-medium transition ${
                    activeTab === 'preview'
                      ? 'bg-blue-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Document Preview
                </button>
                <button
                  onClick={() => setActiveTab('ocr')}
                  className={`px-3 py-1 rounded font-medium transition flex items-center space-x-1.5 ${
                    activeTab === 'ocr'
                      ? 'bg-blue-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Extracted / OCR Transcript</span>
                  {doc.isOcrProcessed && (
                    <span className="px-1 py-0.2 bg-cyan-100 text-cyan-800 rounded text-[9px] font-bold">
                      OCR
                    </span>
                  )}
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowIntegrity(true)}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[11px] font-medium transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verify SHA-256 Integrity</span>
                </button>
                <button
                  onClick={() => setShowSummary(true)}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded text-[11px] font-medium transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Document Advisory Briefing</span>
                </button>
              </div>
            </div>

            {/* Document Content Canvas */}
            <div className="flex-1 bg-white border border-slate-200 rounded p-5 overflow-y-auto shadow-2xs">
              {activeTab === 'ocr' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-800 text-xs">
                        Digitized Bitstream Text Stream (Version {selectedVersionNum})
                      </span>
                      {doc.isOcrProcessed && (
                        <span className="px-1.5 py-0.5 bg-cyan-100 text-cyan-800 rounded text-[9px] font-bold">
                          OCR DIGITIZED
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleReprocessOcr}
                        disabled={isReprocessingOcr || doc.processingStatus === 'PROCESSING'}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 text-blue-800 border border-blue-200 rounded text-[11px] font-medium transition cursor-pointer"
                        title="Run optical character recognition or text extraction again"
                      >
                        <RefreshCw className={`w-3 h-3 text-blue-600 ${isReprocessingOcr ? 'animate-spin' : ''}`} />
                        <span>{isReprocessingOcr ? 'Processing OCR...' : 'Reprocess OCR'}</span>
                      </button>
                      {(activeVersion?.extractedText || doc.ocrText) && (
                        <button
                          onClick={() => {
                            const text = activeVersion?.extractedText || doc.ocrText || '';
                            navigator.clipboard.writeText(text);
                            alert('Extracted transcript copied to clipboard.');
                          }}
                          className="text-blue-700 hover:underline text-[11px] font-medium cursor-pointer"
                        >
                          Copy Transcript
                        </button>
                      )}
                    </div>
                  </div>
                  {doc.processingStatus === 'PROCESSING' || doc.processingStatus === 'UPLOADED' || isReprocessingOcr ? (
                    <div className="p-8 text-center bg-amber-50/60 border border-amber-200 rounded text-amber-900 space-y-2">
                      <div className="inline-block animate-spin w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full mb-1"></div>
                      <div className="font-semibold text-xs">Text extraction in progress.</div>
                      <div className="text-[11px] text-amber-700">The document is currently undergoing native stream parsing or optical character recognition.</div>
                    </div>
                  ) : doc.processingStatus === 'PROCESSING_FAILED' ? (
                    <div className="p-6 bg-rose-50 border border-rose-200 rounded text-rose-900 space-y-3">
                      <div className="font-semibold text-xs flex items-center space-x-1.5 text-rose-700">
                        <span>⚠</span>
                        <span>Text extraction failed.</span>
                      </div>
                      <div className="text-[11px] text-rose-800 font-mono bg-white/70 p-2.5 rounded border border-rose-200/60">
                        {doc.processingError || 'Unable to extract text from this document.'}
                      </div>
                      <div>
                        <button
                          onClick={handleReprocessOcr}
                          disabled={isReprocessingOcr}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-medium transition cursor-pointer shadow-xs"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isReprocessingOcr ? 'animate-spin' : ''}`} />
                          <span>{isReprocessingOcr ? 'Retrying OCR Extraction...' : 'Retry OCR Extraction'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed select-text bg-slate-50 p-4 rounded border border-slate-200">
                      {activeVersion?.extractedText || doc.ocrText || 'No extracted or OCR text recorded for this document version.'}
                    </div>
                  )}
                </div>
              ) : isLoadingContent ? (
                <div className="p-12 text-center text-slate-500 font-sans">
                  Loading document preview...
                </div>
              ) : fileContent !== null ? (
                <div className="font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed select-text bg-slate-50 p-4 rounded border border-slate-200">
                  {fileContent}
                </div>
              ) : activeVersion && ['jpg', 'jpeg', 'png', 'webp', 'tiff'].includes(activeVersion.originalFileName.split('.').pop()?.toLowerCase() || '') ? (
                <div className="flex flex-col items-center justify-center p-4 space-y-3">
                  <div className="max-w-full overflow-hidden rounded-md border border-slate-200 shadow-xs bg-slate-50 p-2">
                    <img
                      src={blobUrl || undefined}
                      alt={activeVersion.originalFileName}
                      className="max-h-[500px] max-w-full rounded object-contain mx-auto"
                    />
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono flex items-center space-x-2">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>{activeVersion.originalFileName} • {(Number(activeVersion.fileSize || 0) / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
              ) : activeVersion && ['mp4', 'mkv', 'avi', 'mov', 'webm', 'wmv'].includes(activeVersion.originalFileName.split('.').pop()?.toLowerCase() || '') ? (
                <div className="flex flex-col items-center justify-center p-3 space-y-3 w-full">
                  <div className="w-full bg-slate-950 rounded-lg overflow-hidden shadow-lg border border-slate-700 relative">
                    <video
                      ref={mediaRef as any}
                      src={blobUrl || undefined}
                      controls
                      className="w-full max-h-[460px] bg-black mx-auto"
                      playsInline
                      onTimeUpdate={(e) => setCurrentPlaybackTime(e.currentTarget.currentTime)}
                    />
                    <div className="absolute top-2 left-2 bg-black/75 text-emerald-400 font-mono text-[10px] px-2 py-0.5 rounded backdrop-blur-xs border border-emerald-500/40 flex items-center space-x-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>Section 65B Certified Video Exhibit</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between w-full text-[11px] text-slate-600 font-mono px-2">
                    <span className="flex items-center space-x-1">
                      <Film className="w-3.5 h-3.5 text-blue-600" />
                      <span>{activeVersion.originalFileName}</span>
                    </span>
                    <span>{(Number(activeVersion.fileSize || 0) / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                  {renderInteractiveTranscript(true)}
                </div>
              ) : activeVersion && (['mp3', 'wav', 'm4a', 'ogg', 'aac', 'flac', 'wma', 'webm'].includes(activeVersion.originalFileName.split('.').pop()?.toLowerCase() || '') || (activeVersion.mimeType || '').startsWith('audio/')) ? (
                <div className="flex flex-col items-center justify-center py-6 px-4 space-y-4 w-full max-w-2xl mx-auto bg-slate-50 rounded-xl border border-slate-200 shadow-xs">
                  <div className="p-4 rounded-full bg-blue-100 text-blue-700 shadow-inner">
                    <Volume2 className="w-10 h-10" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-bold text-slate-900 text-sm">{activeVersion.originalFileName}</h4>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Acoustic Audio Exhibit • {(Number(activeVersion.fileSize || 0) / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <audio
                    ref={mediaRef as any}
                    src={blobUrl || undefined}
                    controls
                    className="w-full"
                    onTimeUpdate={(e) => setCurrentPlaybackTime(e.currentTarget.currentTime)}
                  />
                  <div className="text-[10px] text-emerald-800 font-mono bg-emerald-50 px-3 py-1 rounded border border-emerald-200 flex items-center space-x-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Section 65B Authenticated Audio Bitstream</span>
                  </div>
                  {renderInteractiveTranscript(false)}
                </div>
              ) : activeVersion?.originalFileName.toLowerCase().endsWith('.pdf') ? (
                <div className="w-full h-full min-h-[560px] flex flex-col">
                  {blobUrl ? (
                    <iframe
                      src={blobUrl}
                      className="w-full h-[560px] rounded border border-slate-200"
                      title={activeVersion.originalFileName}
                    />
                  ) : (
                    <div className="text-center py-16 space-y-3">
                      <FileText className="w-12 h-12 text-slate-400 mx-auto" />
                      <div className="font-bold text-slate-800 text-sm">{activeVersion.originalFileName}</div>
                      <div className="text-slate-500 text-xs">
                        PDF Document ({(Number(activeVersion.fileSize || 0) / 1024).toFixed(1)} KB)
                      </div>
                      <button
                        onClick={handleDownload}
                        className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded font-medium shadow-xs"
                      >
                        Download and Open PDF
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-16 space-y-3">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto" />
                  <div className="font-bold text-slate-800 text-sm">{activeVersion?.originalFileName}</div>
                  <div className="text-slate-500 text-xs">
                    Binary Evidentiary File ({(Number(activeVersion?.fileSize || 0) / 1024).toFixed(1)} KB)
                  </div>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded font-medium shadow-xs"
                  >
                    Download Evidence File
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Metadata & Version History */}
          <div className="w-80 bg-white border-l border-slate-200 flex flex-col justify-between overflow-y-auto p-4 space-y-4 shrink-0">
            <div className="space-y-4">
              {/* Metadata Section */}
              <div className="space-y-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-1.5">
                  Document Information
                </h3>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Document ID:</span>
                    <span className="font-mono font-medium text-slate-800">{doc.documentNumber}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Document Type:</span>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-slate-800 font-medium">{doc.documentType.replace(/_/g, ' ')}</span>
                      {!isCourtUser && (
                        <button
                          onClick={() => setShowClassificationModal(true)}
                          className="text-blue-700 hover:underline text-[10px] font-semibold"
                        >
                          Adjust
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subcategory:</span>
                    <span className="text-slate-800 font-medium">{doc.subCategory || 'General Case Records'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Active Version:</span>
                    <span className="font-mono font-semibold text-blue-700">v{selectedVersionNum}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Uploaded By:</span>
                    <span className="text-slate-800">{activeVersion?.uploadedBy?.name || 'Officer'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Created Date:</span>
                    <span className="font-mono text-slate-800">{new Date(doc.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Clearance Level:</span>
                    <span className="text-slate-800">{doc.isConfidential ? 'Restricted' : 'Standard Case Team'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Integrity:</span>
                    {integrityStatus === 'UNCHECKED' && (
                      <span className="text-slate-500 italic text-[11px]">Pending verification</span>
                    )}
                    {integrityStatus === 'VERIFYING' && (
                      <span className="text-amber-600 font-medium flex items-center space-x-1">
                        <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                        <span>Verifying...</span>
                      </span>
                    )}
                    {integrityStatus === 'VERIFIED' && (
                      <span className="text-emerald-700 font-semibold flex items-center space-x-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>✓ Integrity Verified</span>
                      </span>
                    )}
                    {integrityStatus === 'FAILED' && (
                      <span className="text-red-700 font-semibold flex items-center space-x-1">
                        <X className="w-3.5 h-3.5 text-red-600" />
                        <span>✕ Integrity Verification Failed</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Extracted Evidentiary Metadata Card */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    Extracted Metadata
                  </h3>
                  {!isCourtUser && (
                    <button
                      onClick={() => setShowMetadataModal(true)}
                      className="text-[11px] text-blue-700 hover:underline font-semibold"
                    >
                      Edit Metadata
                    </button>
                  )}
                </div>

                {metadataSuccess && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded flex items-center space-x-1.5 text-[11px] font-medium toast-drop-fade">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Metadata updated and persisted to database.</span>
                  </div>
                )}

                <div className="bg-slate-50 border border-slate-200 rounded p-2.5 space-y-1.5 text-[11px]">
                  {doc.metadata?.referenceNumber && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Reference / Serial:</span>
                      <span className="font-mono font-semibold text-slate-800">{doc.metadata.referenceNumber}</span>
                    </div>
                  )}
                  {doc.metadata?.issuingAuthority && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Authority:</span>
                      <span className="text-slate-800 text-right truncate max-w-[150px]">{doc.metadata.issuingAuthority}</span>
                    </div>
                  )}
                  {(doc.metadata?.departmentName || doc.department?.name) && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Department:</span>
                      <span className="text-slate-800 text-right truncate max-w-[150px]">
                        {doc.metadata?.departmentName || doc.department?.name}
                      </span>
                    </div>
                  )}
                  {doc.metadata?.location && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Location:</span>
                      <span className="text-slate-800">{doc.metadata.location}</span>
                    </div>
                  )}
                  {doc.metadata?.documentDate && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Record Date:</span>
                      <span className="font-mono text-slate-800">{new Date(doc.metadata.documentDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {doc.metadata?.language && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Language:</span>
                      <span className="text-slate-800 uppercase font-mono">{doc.metadata.language}</span>
                    </div>
                  )}
                  {doc.metadata?.entities && (
                    <div className="pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500 block mb-1">Identified Entities:</span>
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          try {
                            const parsed = JSON.parse(doc.metadata.entities);
                            return Array.isArray(parsed)
                              ? parsed.slice(0, 3).map((e: string, i: number) => (
                                  <span key={i} className="px-1.5 py-0.5 bg-white border border-slate-200 text-slate-700 rounded text-[10px]">
                                    {e}
                                  </span>
                                ))
                              : null;
                          } catch {
                            return null;
                          }
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SHA-256 Hash Box */}
              <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-800">SHA-256 Bitstream Hash</span>
                  <button
                    onClick={handleCopyHash}
                    className="text-blue-700 hover:text-blue-900 font-medium flex items-center space-x-1"
                  >
                    {copiedHash ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700 text-[10px]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px]">Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="font-mono text-[10px] text-slate-700 break-all bg-white p-2 border border-slate-200 rounded select-all">
                  {activeVersion?.sha256Hash || 'Pending calculation'}
                </div>

                {/* Live Integrity Status Indicator */}
                <div className="pt-1">
                  <div className="text-[11px] text-slate-500 mb-1 font-medium">Integrity Status:</div>
                  {integrityStatus === 'UNCHECKED' && (
                    <div className="text-[11px] text-slate-500 italic bg-white p-2 rounded border border-slate-200">
                      Not verified in this session
                    </div>
                  )}
                  {integrityStatus === 'VERIFYING' && (
                    <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-200 flex items-center space-x-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-700 shrink-0" />
                      <span>Verifying bitstream against database ledger...</span>
                    </div>
                  )}
                  {integrityStatus === 'VERIFIED' && (
                    <div className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-300 flex items-start space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">✓ Integrity Verified</div>
                        <div className="text-[10px] text-emerald-700 mt-0.5">
                          Bitstream SHA-256 hash matches immutable master record exactly.
                        </div>
                      </div>
                    </div>
                  )}
                  {integrityStatus === 'FAILED' && (
                    <div className="text-[11px] text-red-800 bg-red-50 p-2 rounded border border-red-300 flex items-start space-x-1.5">
                      <ShieldAlert className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">✕ Integrity Verification Failed</div>
                        <div className="text-[10px] text-red-700 mt-0.5">
                          {(verificationDetails as any)?.reason ||
                            'Bitstream mismatch detected! The stored artifact may have been modified outside official channels.'}
                        </div>
                        {(verificationDetails as any)?.calculatedHash && (
                          <div className="text-[9px] font-mono text-red-900 mt-1 break-all bg-red-100/60 p-1 rounded">
                            Calculated: {(verificationDetails as any).calculatedHash}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Authoritative Backend Verification Button */}
                <button
                  onClick={handleVerifyIntegrity}
                  disabled={isVerifyingIntegrity}
                  className="w-full py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold flex items-center justify-center space-x-1.5 transition disabled:opacity-50 shadow-2xs"
                >
                  {isVerifyingIntegrity ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying Bitstream...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verify Integrity</span>
                    </>
                  )}
                </button>

                <div className="text-[10px] text-slate-500">
                  Calculated from actual file bytes via Node crypto. Section 65B compliant.
                </div>
              </div>

              {/* Version History Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    Version History ({doc.versions?.length || 1})
                  </h3>
                  {!isCourtUser && (
                    <button
                      onClick={() => setShowUploadVersion(true)}
                      className="text-[11px] text-blue-700 hover:underline font-semibold flex items-center space-x-1"
                    >
                      <FilePlus className="w-3 h-3" />
                      <span>Upload Revision</span>
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {(doc.versions || []).map((ver) => {
                    const isSelected = ver.versionNumber === selectedVersionNum;
                    return (
                      <div
                        key={ver.id}
                        onClick={() => setSelectedVersionNum(ver.versionNumber)}
                        className={`p-2.5 rounded border transition cursor-pointer text-[11px] ${
                          isSelected
                            ? 'bg-blue-50 border-blue-300 text-blue-950 font-medium'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold">Version v{ver.versionNumber}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(ver.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-slate-600 mt-0.5 truncate">{ver.changeSummary}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          By {ver.uploadedBy?.name || 'Officer'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick Actions (Non-court) */}
            {!isCourtUser && (
              <div className="pt-3 border-t border-slate-200 space-y-1.5">
                <button
                  onClick={() => setShowShare(true)}
                  className="w-full py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium flex items-center justify-center space-x-1.5 transition"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Controlled Sharing</span>
                </button>

                <button
                  onClick={() => setShowArchive(true)}
                  className="w-full py-1.5 px-2 bg-red-50 hover:bg-red-100 text-red-700 rounded text-xs font-medium flex items-center justify-center space-x-1.5 transition"
                >
                  <Archive className="w-3.5 h-3.5 text-red-600" />
                  <span>Archive Document</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sub-modals */}
      {showUploadVersion && (
        <UploadVersionModal
          document={doc}
          onClose={() => setShowUploadVersion(false)}
          onVersionUploaded={() => reloadDoc()}
        />
      )}

      {showIntegrity && (
        <IntegrityVerificationModal
          document={doc}
          onClose={() => setShowIntegrity(false)}
        />
      )}

      {showShare && (
        <ShareDocumentModal
          document={doc}
          onClose={() => setShowShare(false)}
          onShareUpdated={() => reloadDoc()}
        />
      )}

      {showArchive && (
        <ArchiveDocumentModal
          document={doc}
          onClose={() => setShowArchive(false)}
          onStatusUpdated={() => reloadDoc()}
        />
      )}

      {showSummary && (
        <SummaryDrawer
          document={doc}
          onClose={() => setShowSummary(false)}
        />
      )}

      {showClassificationModal && (
        <AdjustClassificationModal
          document={doc}
          onClose={() => setShowClassificationModal(false)}
          onUpdated={() => reloadDoc()}
        />
      )}

      {showMetadataModal && (
        <EditMetadataModal
          document={doc}
          metadata={doc.metadata}
          onClose={() => setShowMetadataModal(false)}
          onUpdated={async (updated) => {
            if (updated) {
              setDoc(updated);
            }
            setMetadataSuccess(true);
            setTimeout(() => setMetadataSuccess(false), 3500);
            await reloadDoc();
          }}
        />
      )}
    </div>
  );
};

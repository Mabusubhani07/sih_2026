export type UserRole =
  | 'ADMIN'
  | 'POLICE_OFFICER'
  | 'INVESTIGATOR'
  | 'FORENSIC_OFFICER'
  | 'LEGAL_OFFICER'
  | 'COURT_USER';

export interface Department {
  id: string;
  code: string;
  name: string;
  description?: string;
  _count?: {
    users?: number;
    cases?: number;
    documents?: number;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  badgeNumber: string;
  role: UserRole;
  departmentId: string;
  departmentCode?: string;
  departmentName?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  avatarUrl?: string;
  phone?: string;
  lastLogin?: string;
  createdAt?: string;
  department?: Department;
}

export interface CaseMembership {
  id: string;
  caseId: string;
  userId: string;
  roleInCase: string;
  addedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    badgeNumber: string;
    role: UserRole;
    department?: Department;
  };
}

export interface Case {
  id: string;
  caseNumber: string;
  firNumber: string;
  title: string;
  description: string;
  crimeCategory: string;
  policeStation: string;
  jurisdiction: string;
  incidentDate: string;
  incidentLocation: string;
  registeredDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status:
    | 'REGISTERED'
    | 'UNDER_INVESTIGATION'
    | 'FORENSIC_ANALYSIS'
    | 'LEGAL_REVIEW'
    | 'COURT_SUBMITTED'
    | 'CLOSED';
  assignedDepartmentId: string;
  assignedDepartment?: Department;
  leadInvestigatorId?: string | null;
  leadInvestigator?: {
    id: string;
    name: string;
    badgeNumber: string;
    role: string;
  } | null;
  createdById: string;
  createdBy?: {
    id: string;
    name: string;
    badgeNumber: string;
    role: string;
  };
  memberships?: CaseMembership[];
  documents?: Document[];
  evidenceItems?: Evidence[];
  _count?: {
    documents: number;
    evidenceItems: number;
    memberships: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  sha256Hash: string;
  hashAlgorithm: string;
  changeSummary?: string;
  extractedText?: string | null;
  uploadedById: string;
  uploadedBy?: {
    id: string;
    name: string;
    badgeNumber: string;
    role: string;
  };
  createdAt: string;
}

export interface DocumentShare {
  id: string;
  documentId: string;
  sharedWithUserId: string;
  sharedWithUser?: {
    id: string;
    name: string;
    email?: string;
    badgeNumber: string;
    role: string;
  };
  sharedByUserId: string;
  sharedByUser?: {
    id: string;
    name: string;
    badgeNumber: string;
  };
  permission: 'VIEW' | 'DOWNLOAD';
  notes?: string;
  expiresAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
}

export interface DocumentMetadata {
  id: string;
  documentId: string;
  caseNumber?: string;
  firNumber?: string;
  referenceNumber?: string;
  documentDate?: string;
  issuingAuthority?: string;
  departmentName?: string;
  location?: string;
  language?: string;
  entities?: string;
  keywords?: string;
  categoryConfidence?: number;
  isVerified?: boolean;
  verifiedById?: string;
  verifiedAt?: string;
}

export interface Document {
  id: string;
  documentNumber: string;
  caseId: string;
  case?: Partial<Case> & {
    id: string;
    caseNumber: string;
    firNumber?: string;
    title: string;
    status: string;
    assignedDepartmentId?: string;
    leadInvestigatorId?: string | null;
  };
  title: string;
  documentType:
    | 'FIR'
    | 'POLICE_REPORT'
    | 'INVESTIGATION_REPORT'
    | 'EVIDENCE'
    | 'FORENSIC_REPORT'
    | 'WITNESS_STATEMENT'
    | 'LEGAL_DOCUMENT'
    | 'COURT_DOCUMENT'
    | 'OTHER';
  subCategory?: string;
  departmentId: string;
  department?: Department;
  status: 'ACTIVE' | 'ARCHIVED' | 'INVALID';
  processingStatus?:
    | 'UPLOADED'
    | 'PROCESSING'
    | 'OCR_COMPLETE'
    | 'CLASSIFIED'
    | 'METADATA_EXTRACTED'
    | 'INDEXED'
    | 'READY'
    | 'PROCESSING_FAILED';
  processingError?: string | null;
  ocrText?: string | null;
  isOcrProcessed?: boolean;
  metadata?: DocumentMetadata | null;
  invalidReason?: string;
  archivedReason?: string;
  classificationReason?: string;
  isConfidential: boolean;
  currentVersionNumber: number;
  createdById: string;
  createdBy?: {
    id: string;
    name: string;
    badgeNumber: string;
    role: string;
  };
  versions: DocumentVersion[];
  shares?: DocumentShare[];
  createdAt: string;
  updatedAt: string;
}

export interface Evidence {
  id: string;
  evidenceNumber: string;
  caseId: string;
  case?: {
    id: string;
    caseNumber: string;
    title: string;
  };
  documentId?: string | null;
  document?: Document | null;
  title: string;
  description: string;
  category: 'DIGITAL' | 'BIOLOGICAL' | 'PHYSICAL_ITEM' | 'BALLISTICS' | 'DOCUMENTARY' | 'TRACE';
  collectedDate: string;
  collectedBy: string;
  custodyLocation: string;
  integrityStatus: 'VERIFIED' | 'PENDING_ANALYSIS' | 'COMPROMISED';
  currentStatus: 'COLLECTED' | 'IN_CUSTODY' | 'LAB_ANALYSIS' | 'COURT_SUBMITTED' | 'DISPOSED';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  eventId: string;
  userId?: string | null;
  userRole: string;
  action: string;
  caseId?: string | null;
  case?: {
    id: string;
    caseNumber: string;
    title: string;
  } | null;
  documentId?: string | null;
  document?: {
    id: string;
    documentNumber: string;
    title: string;
    documentType: string;
  } | null;
  status: 'SUCCESS' | 'FAILURE' | 'DENIED';
  ipAddress?: string;
  userAgent?: string;
  details?: string | null;
  timestamp: string;
  user?: {
    id: string;
    name: string;
    email: string;
    badgeNumber: string;
    role: string;
  } | null;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'CASE_UPDATE' | 'SHARE' | 'VERSION' | 'INTEGRITY' | 'SYSTEM';
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface SummaryResult {
  executiveSummary: string;
  keyFindings: string[];
  involvedEntities: string[];
  evidentiaryPoints: string[];
  recommendedActions: string[];
  generatedAt: string;
  source: 'INTERNAL_NLP_ENGINE' | 'AI_MODEL';
}

export interface IntegrityResult {
  verified: boolean;
  algorithm: string;
  recordedHash: string;
  calculatedHash: string;
  checkedAt: string;
  fileSizeBytes: number;
  documentId: string;
  documentNumber: string;
  versionNumber: number;
  originalFileName: string;
}

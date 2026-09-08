import {
  AuditLog,
  Case,
  Department,
  Document,
  DocumentShare,
  Evidence,
  IntegrityResult,
  Notification,
  SummaryResult,
  User,
} from '../types';

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('diemp_token');
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('diemp_token');
    localStorage.removeItem('diemp_user');
    window.dispatchEvent(new Event('auth:unauthorized'));
    throw new Error('Official session expired. Please sign in again.');
  }

  if (response.status === 403) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'ACCESS RESTRICTED: Insufficient clearance level.');
  }

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        errorMessage = json.error || json.message || json.details || (text.length < 300 ? text : errorMessage);
      } catch {
        if (text && text.trim().length > 0 && text.length < 300) {
          errorMessage = text.trim();
        }
      }
    } catch {
      // Fallback to default
    }
    throw new Error(errorMessage);
  }

  // Handle blob responses or json
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  return response as any;
}

export const api = {
  // Authentication
  auth: {
    login: async (email: string, password: string) => {
      return request<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
    },
    getMe: async () => {
      return request<User>('/auth/me');
    },
    logout: async () => {
      return request<{ message: string }>('/auth/logout', { method: 'POST' });
    },
    getDemoAccounts: async () => {
      return request<
        Array<{
          email: string;
          name: string;
          role: string;
          badgeNumber: string;
          department: { code: string; name: string };
        }>
      >('/auth/demo-accounts');
    },
  },

  // Cases
  cases: {
    list: async (filters: { status?: string; priority?: string; search?: string; departmentId?: string } = {}) => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.search) params.append('search', filters.search);
      if (filters.departmentId) params.append('departmentId', filters.departmentId);
      return request<Case[]>(`/cases?${params.toString()}`);
    },
    getById: async (id: string) => {
      return request<Case & { timeline: AuditLog[] }>(`/cases/${id}`);
    },
    create: async (data: Partial<Case>) => {
      return request<Case>('/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    update: async (id: string, data: Partial<Case>) => {
      return request<Case>(`/cases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    addMember: async (caseId: string, userId: string, roleInCase: string) => {
      return request(`/cases/${caseId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, roleInCase }),
      });
    },
  },

  // Chunked Upload Subsystem for High-Performance Large Media & Files (Bypasses Vercel 4.5MB Edge Limit)
  upload: {
    chunk: async (formData: FormData) => {
      return request<{
        ready: boolean;
        uploadId: string;
        chunkIndex?: number;
        totalChunks?: number;
        storagePath?: string;
        fileName?: string;
        fileSize?: number;
        mimeType?: string;
        sha256?: string;
      }>('/upload/chunk', {
        method: 'POST',
        body: formData,
      });
    },
    uploadFileInChunks: async (
      file: File,
      onProgress?: (percent: number, currentChunk: number, totalChunks: number) => void
    ) => {
      const CHUNK_SIZE = 2.5 * 1024 * 1024; // 2.5 MB chunks strictly below Vercel's 4.5 MB function payload limit
      const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
      const uploadId = `upl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      let finalResult: any = null;

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(file.size, start + CHUNK_SIZE);
        const chunkBlob = file.slice(start, end);

        const formData = new FormData();
        formData.append('uploadId', uploadId);
        formData.append('chunkIndex', String(i));
        formData.append('totalChunks', String(totalChunks));
        formData.append('fileName', file.name);
        formData.append('mimeType', file.type || 'application/octet-stream');
        formData.append('chunk', chunkBlob, file.name);

        const res = await request<{
          ready: boolean;
          uploadId: string;
          storagePath?: string;
          fileName?: string;
          fileSize?: number;
          mimeType?: string;
          sha256?: string;
        }>('/upload/chunk', {
          method: 'POST',
          body: formData,
        });

        const percent = Math.min(100, Math.round(((i + 1) / totalChunks) * 100));
        onProgress?.(percent, i + 1, totalChunks);

        if (res.ready) {
          finalResult = res;
        }
      }

      if (!finalResult || !finalResult.storagePath) {
        throw new Error('Chunked file transmission completed, but server assembly failed to return a storage reference.');
      }

      return finalResult;
    },
  },

  // Documents
  documents: {
    upload: async (caseId: string, data: FormData | Record<string, any>) => {
      if (data instanceof FormData) {
        return request<Document>(`/cases/${caseId}/documents`, {
          method: 'POST',
          body: data,
        });
      }
      return request<Document>(`/cases/${caseId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    getById: async (id: string) => {
      return request<Document>(`/documents/${id}`);
    },
    uploadNewVersion: async (id: string, data: FormData | Record<string, any>) => {
      if (data instanceof FormData) {
        return request<{ document: Document; version: any }>(`/documents/${id}/versions`, {
          method: 'POST',
          body: data,
        });
      }
      return request<{ document: Document; version: any }>(`/documents/${id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    download: async (id: string, versionNumber?: number): Promise<Blob> => {
      const headers = getAuthHeaders();
      const query = versionNumber ? `?version=${versionNumber}` : '';
      const response = await fetch(`${API_BASE}/documents/${id}/download${query}`, { headers });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to download document');
      }
      return response.blob();
    },
    verifyIntegrity: async (id: string, versionNumber?: number, versionId?: string) => {
      const endpoint = versionId
        ? `/documents/${id}/versions/${versionId}/verify-integrity`
        : `/documents/${id}/verify${versionNumber ? `?version=${versionNumber}` : ''}`;
      return request<IntegrityResult>(endpoint, {
        method: 'POST',
      });
    },
    verifyVersionIntegrity: async (documentId: string, versionId: string) => {
      return request<IntegrityResult>(`/documents/${documentId}/versions/${versionId}/verify-integrity`, {
        method: 'POST',
      });
    },
    archive: async (id: string, status: 'ARCHIVED' | 'INVALID', reason: string) => {
      return request<Document>(`/documents/${id}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason }),
      });
    },
    share: async (
      id: string,
      data: { sharedWithUserId: string; permission: 'VIEW' | 'DOWNLOAD'; notes?: string; expiresAt?: string }
    ) => {
      return request<DocumentShare>(`/documents/${id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    revokeShare: async (documentId: string, shareId: string) => {
      return request<{ message: string }>(`/documents/${documentId}/share/${shareId}`, {
        method: 'DELETE',
      });
    },
    updateClassification: async (
      id: string,
      data: { documentType: string; subCategory?: string; rationale?: string }
    ) => {
      return request<Document>(`/documents/${id}/classification`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    updateMetadata: async (id: string, metadata: any) => {
      return request<any>(`/documents/${id}/metadata`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata),
      });
    },
    retryProcessing: async (id: string) => {
      return request<{ message: string; document: Document }>(`/documents/${id}/retry-processing`, {
        method: 'POST',
      });
    },
    getOcrText: async (id: string) => {
      return request<{ id: string; documentNumber: string; title: string; ocrText: string; isOcrProcessed: boolean; processingStatus: string }>(
        `/documents/${id}/ocr-text`
      );
    },
    retranscribe: async (id: string, version?: number) => {
      const query = version ? `?version=${version}` : '';
      return request<{
        message: string;
        transcriptText: string;
        segments: Array<{ startTime: string; endTime: string; speaker?: string; text: string }>;
        method: string;
        confidence: number;
        durationSec: number;
        metadataSummary: string;
      }>(`/documents/${id}/transcribe${query}`, {
        method: 'POST',
      });
    },
    updateTranscript: async (id: string, transcriptText: string, versionNumber?: number) => {
      return request<{ message: string; ocrText: string; versionNumber: number }>(`/documents/${id}/transcript`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptText, versionNumber }),
      });
    },
  },

  // Evidence
  evidence: {
    list: async (filters: { caseId?: string; category?: string; status?: string } = {}) => {
      const params = new URLSearchParams();
      if (filters.caseId) params.append('caseId', filters.caseId);
      if (filters.category) params.append('category', filters.category);
      if (filters.status) params.append('status', filters.status);
      return request<Evidence[]>(`/evidence?${params.toString()}`);
    },
    create: async (data: Partial<Evidence> | FormData) => {
      if (data instanceof FormData) {
        return request<Evidence>('/evidence', {
          method: 'POST',
          body: data,
        });
      }
      return request<Evidence>('/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    verify: async (id: string) => {
      return request<{ evidenceId: string; integrityStatus: string; verificationDetails: any }>(
        `/evidence/${id}/verify`,
        { method: 'POST' }
      );
    },
  },

  // Search
  search: {
    query: async (params: {
      q?: string;
      documentType?: string;
      caseId?: string;
      departmentId?: string;
      startDate?: string;
      endDate?: string;
    }) => {
      const searchParams = new URLSearchParams();
      if (params.q) searchParams.append('q', params.q);
      if (params.documentType) searchParams.append('documentType', params.documentType);
      if (params.caseId) searchParams.append('caseId', params.caseId);
      if (params.departmentId) searchParams.append('departmentId', params.departmentId);
      if (params.startDate) searchParams.append('startDate', params.startDate);
      if (params.endDate) searchParams.append('endDate', params.endDate);
      return request<{
        query: string;
        documents: Document[];
        cases: Case[];
        totalDocuments: number;
        totalCases: number;
      }>(`/search?${searchParams.toString()}`);
    },
  },

  // AI
  ai: {
    summarize: async (documentId: string) => {
      return request<SummaryResult>(`/ai/documents/${documentId}/summarize`, {
        method: 'POST',
      });
    },
    classifyPreview: async (fileName: string, text?: string) => {
      return request<{ suggestedType: string; confidence: number; rationale: string }>('/ai/classify-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, text }),
      });
    },
  },

  // Audit
  audit: {
    list: async (filters: {
      caseId?: string;
      documentId?: string;
      userId?: string;
      action?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    } = {}) => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          params.append(key, String(val));
        }
      });
      return request<{ logs: AuditLog[]; total: number }>(`/audit-logs?${params.toString()}`);
    },
  },

  // Users & Admin
  users: {
    list: async (filters: { departmentId?: string; role?: string; search?: string } = {}) => {
      const params = new URLSearchParams();
      if (filters.departmentId) params.append('departmentId', filters.departmentId);
      if (filters.role) params.append('role', filters.role);
      if (filters.search) params.append('search', filters.search);
      return request<User[]>(`/users?${params.toString()}`);
    },
    getDepartments: async () => {
      return request<Department[]>('/users/departments');
    },
    getDashboardStats: async () => {
      return request<{
        totalCases: number;
        totalDocuments: number;
        totalEvidence: number;
        pendingShares: number;
        recentActivity: AuditLog[];
      }>('/users/dashboard-stats');
    },
    updateStatus: async (id: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') => {
      return request<User>(`/users/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    },
  },

  // Notifications
  notifications: {
    list: async () => {
      return request<{ notifications: Notification[]; unreadCount: number }>('/notifications');
    },
    markAsRead: async (id: string) => {
      return request<Notification>(`/notifications/${id}/read`, { method: 'PATCH' });
    },
    markAllAsRead: async () => {
      return request<{ message: string }>('/notifications/read-all', { method: 'POST' });
    },
  },

  // Institutional Hierarchy
  hierarchy: {
    getTree: async () => {
      return request<any[]>('/hierarchy');
    },
  },
};

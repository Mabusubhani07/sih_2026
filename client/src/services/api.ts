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

  // Documents
  documents: {
    upload: async (caseId: string, formData: FormData) => {
      return request<Document>(`/cases/${caseId}/documents`, {
        method: 'POST',
        body: formData,
      });
    },
    getById: async (id: string) => {
      return request<Document>(`/documents/${id}`);
    },
    uploadNewVersion: async (id: string, formData: FormData) => {
      return request<{ document: Document; version: any }>(`/documents/${id}/versions`, {
        method: 'POST',
        body: formData,
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
    verifyIntegrity: async (id: string, versionNumber?: number) => {
      const query = versionNumber ? `?version=${versionNumber}` : '';
      return request<IntegrityResult>(`/documents/${id}/verify${query}`, {
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
    create: async (data: Partial<Evidence>) => {
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

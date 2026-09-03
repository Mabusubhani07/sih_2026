import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { PublicPortal } from './pages/PublicPortal';
import { Dashboard } from './pages/Dashboard';
import { CasesList } from './pages/CasesList';
import { CaseWorkspace } from './pages/CaseWorkspace';
import { DocumentsList } from './pages/DocumentsList';
import { EvidenceList } from './pages/EvidenceList';
import { SmartSearch } from './pages/SmartSearch';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { UsersManagementPage } from './pages/UsersManagementPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { AccessDenied } from './pages/AccessDenied';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            <Route path="/" element={<PublicPortal />} />
            <Route path="/portal" element={<PublicPortal />} />
            <Route path="/login" element={<Login />} />

            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/cases" element={<CasesList />} />
              <Route path="/cases/:id" element={<CaseWorkspace />} />
              <Route path="/documents" element={<DocumentsList />} />
              <Route path="/evidence" element={<EvidenceList />} />
              <Route path="/search" element={<SmartSearch />} />
              <Route path="/audit-logs" element={<AuditLogsPage />} />
              <Route path="/admin/users" element={<UsersManagementPage />} />
              <Route path="/admin/departments" element={<DepartmentsPage />} />
              <Route path="/access-denied" element={<AccessDenied />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { AdminOnlyRoute, ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import { AreaFormPage } from './pages/areas/AreaFormPage'
import { AreaQrPage } from './pages/areas/AreaQrPage'
import { AreasListPage } from './pages/areas/AreasListPage'
import { AuditLogPage } from './pages/audit/AuditLogPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ReportsPage } from './pages/reports/ReportsPage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { InconsistentSessionsPage } from './pages/sessions/InconsistentSessionsPage'
import { SessionDetailPage } from './pages/sessions/SessionDetailPage'
import { UserFormPage } from './pages/users/UserFormPage'
import { UsersListPage } from './pages/users/UsersListPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />

              <Route path="users" element={<UsersListPage />} />
              <Route element={<AdminOnlyRoute />}>
                <Route path="users/new" element={<UserFormPage />} />
                <Route path="users/:id/edit" element={<UserFormPage />} />
              </Route>

              <Route path="areas" element={<AreasListPage />} />
              <Route element={<AdminOnlyRoute />}>
                <Route path="areas/new" element={<AreaFormPage />} />
                <Route path="areas/:id/edit" element={<AreaFormPage />} />
              </Route>
              <Route path="areas/:id/qr" element={<AreaQrPage />} />

              <Route path="reports" element={<ReportsPage />} />

              <Route path="sessions/inconsistent" element={<InconsistentSessionsPage />} />
              <Route path="sessions/:id" element={<SessionDetailPage />} />

              <Route path="audit" element={<AuditLogPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

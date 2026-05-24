import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Toaster } from '@/components/ui/toaster';

// Pages
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import CreateOrganizationPage from '@/pages/CreateOrganizationPage';
import OTPVerificationPage from '@/pages/OTPVerificationPage';
import AcceptInvitePage from '@/pages/AcceptInvitePage';
import DashboardPage from '@/pages/DashboardPage';
import IncidentsPage from '@/pages/IncidentsPage';
import ReviewIncidentPage from '@/pages/ReviewIncidentPage';
import IncidentDetailPage from '@/pages/IncidentDetailPage';
import ChatPage from '@/pages/ChatPage';
import SettingsPage from '@/pages/SettingsPage';
import TeamPage from '@/pages/TeamPage';
import OrganizationPage from '@/pages/OrganizationPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/create-organization" element={<CreateOrganizationPage />} />
          <Route path="/verify-otp" element={<OTPVerificationPage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/incidents"
            element={
              <ProtectedRoute>
                <IncidentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/incidents/:id/review"
            element={
              <ProtectedRoute>
                <ReviewIncidentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/incidents/:id"
            element={
              <ProtectedRoute>
                <IncidentDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <SocketProvider>
                  <ChatPage />
                </SocketProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:roomId"
            element={
              <ProtectedRoute>
                <SocketProvider>
                  <ChatPage />
                </SocketProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teams"
            element={
              <ProtectedRoute>
                <TeamPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organization"
            element={
              <ProtectedRoute>
                <OrganizationPage />
              </ProtectedRoute>
            }
          />
        </Routes>
        <Toaster />
      </Router>
    </AuthProvider>
  );
}

export default App;

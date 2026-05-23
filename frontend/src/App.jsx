import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Toaster } from '@/components/ui/toaster';

// Pages
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import CreateOrganizationPage from '@/pages/CreateOrganizationPage';
import OTPVerificationPage from '@/pages/OTPVerificationPage';
import AcceptInvitePage from '@/pages/AcceptInvitePage';
import DashboardPage from '@/pages/DashboardPage';

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
        </Routes>
        <Toaster />
      </Router>
    </AuthProvider>
  );
}

export default App;

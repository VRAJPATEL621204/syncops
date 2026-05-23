import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/layouts/DashboardLayout';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import ManagerDashboard from '@/components/dashboard/ManagerDashboard';
import EmployeeDashboard from '@/components/dashboard/EmployeeDashboard';

const DashboardPage = () => {
  const { user, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Debug logging
  useEffect(() => {
    console.log('[DashboardPage] Auth state:', { 
      loading, 
      isAuthenticated, 
      userRole: user?.role,
      userName: user?.fullName,
      hasUser: !!user 
    });
  }, [loading, isAuthenticated, user]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      console.log('[DashboardPage] Not authenticated, redirecting to login');
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-600/30 border-t-cyan-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const getDashboardComponent = () => {
    switch (user.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'manager':
        return <ManagerDashboard />;
      case 'employee':
        return <EmployeeDashboard />;
      default:
        return <EmployeeDashboard />;
    }
  };

  return (
    <DashboardLayout>
      {getDashboardComponent()}
    </DashboardLayout>
  );
};

export default DashboardPage;

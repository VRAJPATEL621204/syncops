import React, { useState, useEffect } from 'react';
import { Building2, Users, AlertTriangle, CheckCircle, TrendingUp, Plus, UserPlus, Loader2, Mail, Users2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import CreateTeamModal from '@/components/modals/CreateTeamModal';
import InviteModal from '@/components/modals/InviteModal';
import { teamAPI, inviteAPI } from '@/services/api';
import { toast } from '@/hooks/use-toast';

const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const [teams, setTeams] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isInviteManagerOpen, setIsInviteManagerOpen] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTeams: 0,
    pendingInvites: 0,
  });

  const recentIncidents = [
    { id: 1, title: 'Database Connection Timeout', severity: 'Critical', status: 'In Progress', assigned: 'John D.', time: '10m ago' },
    { id: 2, title: 'API Latency Spike', severity: 'High', status: 'Open', assigned: 'Unassigned', time: '25m ago' },
    { id: 3, title: 'Payment Gateway Error', severity: 'Medium', status: 'Resolved', assigned: 'Sarah M.', time: '1h ago' },
    { id: 4, title: 'Email Service Delay', severity: 'Low', status: 'Resolved', assigned: 'Mike R.', time: '2h ago' },
  ];

  useEffect(() => {
    // Only fetch when auth is ready (not loading) and user is available
    if (!authLoading && user) {
      fetchDashboardData();
    }
  }, [authLoading, user]);

  const fetchDashboardData = async () => {
    try {
      const [teamsRes, invitesRes] = await Promise.all([
        teamAPI.getTeams(),
        inviteAPI.listInvites(),
      ]);
      
      const teamsData = teamsRes.data.data || [];
      const invitesData = invitesRes.data.data?.invites || [];
      
      setTeams(teamsData);
      setInvites(invitesData);
      
      // Calculate stats
      const totalUsers = teamsData.reduce((acc, team) => acc + (team.members?.length || 0), 1); // +1 for admin
      const pendingInvites = invitesData.filter(i => i.status === 'pending').length;
      
      setStats({
        totalUsers,
        totalTeams: teamsData.length,
        pendingInvites,
      });
    } catch (error) {
      console.error('Fetch dashboard data error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Critical': return 'bg-red-500/20 text-red-400';
      case 'High': return 'bg-amber-500/20 text-amber-400';
      case 'Medium': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Open': return 'text-amber-400';
      case 'In Progress': return 'text-blue-400';
      case 'Resolved': return 'text-green-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-slate-400">Welcome back, {user?.fullName}</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => setIsCreateTeamOpen(true)}
            className="bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Team
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setIsInviteManagerOpen(true)}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Manager
          </Button>
        </div>
      </div>

      {/* Organization Info */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-cyan-600/20 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-cyan-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{user?.organization?.name}</h2>
              <p className="text-sm text-slate-400">Organization ID: {user?.organizationId?.slice(0, 8)}...</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Users</p>
                <p className="text-2xl font-bold text-white">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.totalUsers}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Teams</p>
                <p className="text-2xl font-bold text-white">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.totalTeams}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Users2 className="w-5 h-5 text-cyan-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Pending Invites</p>
                <p className="text-2xl font-bold text-white">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.pendingInvites}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Active Incidents</p>
                <p className="text-2xl font-bold text-white">0</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Incidents */}
        <Card className="lg:col-span-2 bg-slate-900 border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Recent Incidents</CardTitle>
                <CardDescription className="text-slate-400">Latest operational issues</CardDescription>
              </div>
              <Button variant="ghost" className="text-cyan-500 hover:text-cyan-400">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${incident.severity === 'Critical' ? 'bg-red-500' : incident.severity === 'High' ? 'bg-amber-500' : 'bg-slate-500'}`} />
                    <div>
                      <p className="text-sm font-medium text-white">{incident.title}</p>
                      <p className="text-xs text-slate-400">{incident.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded ${getSeverityColor(incident.severity)}`}>
                      {incident.severity}
                    </span>
                    <span className={`text-xs ${getStatusColor(incident.status)}`}>
                      {incident.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Teams */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Teams</CardTitle>
                <CardDescription className="text-slate-400">
                  {stats.totalTeams} team{stats.totalTeams !== 1 ? 's' : ''} in your organization
                </CardDescription>
              </div>
              <Button 
                size="sm" 
                onClick={() => setIsCreateTeamOpen(true)}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
              </div>
            ) : teams.length === 0 ? (
              <div className="text-center py-8">
                <Users2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No teams yet</p>
                <p className="text-slate-500 text-xs mt-1">Create your first team to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teams.map((team) => (
                  <div key={team.id} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-cyan-600/20 flex items-center justify-center">
                      <Users2 className="w-5 h-5 text-cyan-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{team.name}</p>
                      <p className="text-xs text-slate-400">{team.memberCount || 0} members</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <CreateTeamModal
        isOpen={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
        onSuccess={(newTeam) => {
          setTeams(prev => [newTeam, ...prev]);
          setStats(prev => ({ ...prev, totalTeams: prev.totalTeams + 1 }));
        }}
      />
      <InviteModal
        isOpen={isInviteManagerOpen}
        onClose={() => setIsInviteManagerOpen(false)}
        onSuccess={() => {
          fetchDashboardData(); // Refresh to show new invite
        }}
        defaultRole="manager"
      />
    </div>
  );
};

export default AdminDashboard;

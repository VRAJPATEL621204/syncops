import React, { useState, useEffect } from 'react';
import { Users, AlertTriangle, CheckCircle, Clock, MessageSquare, Plus, UserPlus, TrendingUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import InviteModal from '@/components/modals/InviteModal';
import { teamAPI, inviteAPI } from '@/services/api';
import { toast } from '@/hooks/use-toast';

const ManagerDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const [teams, setTeams] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInviteEmployeeOpen, setIsInviteEmployeeOpen] = useState(false);
  const [stats, setStats] = useState({
    teamMembers: 0,
    activeIncidents: 0,
    pendingInvites: 0,
  });

  const teamIncidents = [
    { id: 1, title: 'Server Memory Alert', assignee: 'John D.', severity: 'High', status: 'In Progress', time: '15m ago' },
    { id: 2, title: 'Network Latency', assignee: 'Sarah M.', severity: 'Medium', status: 'Open', time: '30m ago' },
    { id: 3, title: 'Disk Space Warning', assignee: 'Mike R.', severity: 'Low', status: 'Resolved', time: '1h ago' },
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
      const totalMembers = teamsData.reduce((acc, team) => acc + (team.members?.length || 0), 0);
      const pendingInvites = invitesData.filter(i => i.status === 'pending' && i.role === 'employee').length;
      
      setStats({
        teamMembers: totalMembers,
        activeIncidents: 5, // Placeholder
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
          <h1 className="text-2xl font-bold text-white">Manager Dashboard</h1>
          <p className="text-slate-400">Team coordination overview</p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Incident
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setIsInviteEmployeeOpen(true)}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Employee
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Team Members</p>
                <p className="text-2xl font-bold text-white">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.teamMembers}
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
                <p className="text-sm text-slate-400">Active Incidents</p>
                <p className="text-2xl font-bold text-white">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.activeIncidents}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Pending</p>
                <p className="text-2xl font-bold text-white">2</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Team Efficiency</p>
                <p className="text-2xl font-bold text-white">94%</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-cyan-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Team Incidents */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Team Incidents</CardTitle>
                <CardDescription className="text-slate-400">Assigned to your team</CardDescription>
              </div>
              <Button variant="ghost" className="text-cyan-500 hover:text-cyan-400">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {teamIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-medium text-white">{incident.title}</p>
                    <span className={`text-xs px-2 py-1 rounded ${getSeverityColor(incident.severity)}`}>
                      {incident.severity}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Assigned: {incident.assignee}</span>
                      <span className={getStatusColor(incident.status)}>{incident.status}</span>
                    </div>
                    <span className="text-slate-500">{incident.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Team Overview */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Your Team</CardTitle>
                <CardDescription className="text-slate-400">Member workload status</CardDescription>
              </div>
              <Button 
                size="sm"
                onClick={() => setIsInviteEmployeeOpen(true)}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                <UserPlus className="w-4 h-4" />
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
                <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No team assigned</p>
                <p className="text-slate-500 text-xs mt-1">Contact admin for team assignment</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teams.map((team) => (
                  <div key={team.id}>
                    <p className="text-sm font-medium text-white mb-2">{team.name}</p>
                    {team.members?.map((member) => (
                      <div key={member.id} className="flex items-center gap-3 p-2 hover:bg-slate-800/50 rounded-lg">
                        <div className="w-9 h-9 rounded-full bg-cyan-600/20 flex items-center justify-center">
                          <span className="text-xs font-medium text-cyan-500">
                            {member.fullName?.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{member.fullName}</p>
                          <p className="text-xs text-slate-400">{member.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4 border-slate-700 hover:bg-slate-800">
              <Plus className="w-5 h-5 text-cyan-500" />
              <span className="text-sm text-slate-300">New Incident</span>
            </Button>
            <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4 border-slate-700 hover:bg-slate-800">
              <MessageSquare className="w-5 h-5 text-cyan-500" />
              <span className="text-sm text-slate-300">Create Room</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsInviteEmployeeOpen(true)}
              className="flex flex-col items-center gap-2 h-auto py-4 border-slate-700 hover:bg-slate-800"
            >
              <UserPlus className="w-5 h-5 text-cyan-500" />
              <span className="text-sm text-slate-300">Invite Member</span>
            </Button>
            <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4 border-slate-700 hover:bg-slate-800">
              <CheckCircle className="w-5 h-5 text-cyan-500" />
              <span className="text-sm text-slate-300">Review Tasks</span>
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Invite Modal */}
      <InviteModal
        isOpen={isInviteEmployeeOpen}
        onClose={() => setIsInviteEmployeeOpen(false)}
        onSuccess={() => {
          fetchDashboardData();
        }}
        defaultRole="employee"
      />
    </div>
  );
};

export default ManagerDashboard;

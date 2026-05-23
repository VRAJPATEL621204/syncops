import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, MessageSquare, AlertTriangle, Bell, Calendar, ArrowRight, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { teamAPI } from '@/services/api';

const EmployeeDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      fetchEmployeeData();
    }
  }, [authLoading, user]);

  const fetchEmployeeData = async () => {
    try {
      const teamsRes = await teamAPI.getTeams();
      const teamsData = teamsRes.data.data || [];
      console.log('[EmployeeDashboard] Fetched teams:', teamsData);
      setTeams(teamsData);
    } catch (error) {
      console.error('Fetch employee data error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get all team members from all teams
  const allTeamMembers = teams.flatMap(team => team.members || []);
  const uniqueMembers = [...new Map(allTeamMembers.map(m => [m.user?.id, m])).values()];

  // Sample tasks - will be replaced with real incident data when API is ready
  const myTasks = [
    { id: 1, title: 'No active tasks', priority: 'Low', status: 'Completed', due: 'N/A' },
  ];

  // Sample rooms - will be replaced with real room data when API is ready
  const activeRooms = [
    { id: 1, name: 'General Chat', participants: uniqueMembers.length || 1, unread: 0 },
  ];

  const notifications = [
    { id: 1, title: 'Welcome to SyncOps', time: 'Just now', read: false },
  ];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'text-amber-400';
      case 'Medium': return 'text-yellow-400';
      case 'Low': return 'text-slate-400';
      default: return 'text-slate-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'In Progress': return <Clock className="w-4 h-4 text-blue-500" />;
      default: return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">My Dashboard</h1>
        <p className="text-slate-400">Welcome back, {user?.fullName}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">2</p>
                <p className="text-xs text-slate-400">Active Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">2</p>
                <p className="text-xs text-slate-400">Active Rooms</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">2</p>
                <p className="text-xs text-slate-400">Unread</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">12</p>
                <p className="text-xs text-slate-400">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* My Tasks */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">My Tasks</CardTitle>
                <CardDescription className="text-slate-400">Assigned incidents & tasks</CardDescription>
              </div>
              <Button variant="ghost" className="text-cyan-500 hover:text-cyan-400">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(task.status)}
                    <div>
                      <p className={`text-sm font-medium ${task.status === 'Completed' ? 'text-slate-400 line-through' : 'text-white'}`}>
                        {task.title}
                      </p>
                      <p className="text-xs text-slate-400">Due: {task.due}</p>
                    </div>
                  </div>
                  <span className={`text-xs ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Rooms */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Active Rooms</CardTitle>
                <CardDescription className="text-slate-400">Operational discussions</CardDescription>
              </div>
              <Button variant="ghost" className="text-cyan-500 hover:text-cyan-400">
                <MessageSquare className="w-4 h-4 mr-1" />
                Join
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeRooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-cyan-600/20 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-cyan-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{room.name}</p>
                      <p className="text-xs text-slate-400">{room.participants} participants</p>
                    </div>
                  </div>
                  {room.unread > 0 ? (
                    <span className="w-5 h-5 rounded-full bg-cyan-600 text-white text-xs flex items-center justify-center">
                      {room.unread}
                    </span>
                  ) : (
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Teams */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">My Teams</CardTitle>
              <CardDescription className="text-slate-400">
                {teams.length > 0 
                  ? `You are a member of ${teams.length} team${teams.length > 1 ? 's' : ''}`
                  : 'Loading teams...'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
            </div>
          ) : teams.length > 0 ? (
            <div className="space-y-4">
              {teams.map((team) => (
                <div key={team.id} className="p-4 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-600/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-cyan-500" />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">{team.name}</h3>
                        <p className="text-xs text-slate-400">{team.members?.length || 0} members</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
                      {team.type || 'Team'}
                    </span>
                  </div>
                  {team.description && (
                    <p className="text-sm text-slate-400 mb-3">{team.description}</p>
                  )}
                  {/* Team Members */}
                  {team.members && team.members.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                      <p className="text-xs text-slate-500 mb-2">Team Members:</p>
                      <div className="flex flex-wrap gap-2">
                        {team.members.slice(0, 5).map((member) => (
                          <div 
                            key={member.id} 
                            className="flex items-center gap-2 px-2 py-1 bg-slate-800 rounded text-xs"
                          >
                            <div className="w-5 h-5 rounded-full bg-cyan-600/30 flex items-center justify-center text-cyan-400">
                              {member.user?.fullName?.charAt(0) || '?'}
                            </div>
                            <span className="text-slate-300">{member.user?.fullName || 'Unknown'}</span>
                            <span className="text-slate-500">({member.role || 'member'})</span>
                          </div>
                        ))}
                        {team.members.length > 5 && (
                          <span className="text-xs text-slate-500 px-2 py-1">
                            +{team.members.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">You are not assigned to any teams yet.</p>
              <p className="text-sm text-slate-500 mt-1">Contact your manager to be added to a team.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Notifications</CardTitle>
              <CardDescription className="text-slate-400">Recent updates & alerts</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-300">
              Mark all read
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  notification.read ? 'bg-slate-800/30' : 'bg-slate-800/50 border-l-2 border-cyan-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${notification.read ? 'bg-slate-600' : 'bg-cyan-500'}`} />
                  <div>
                    <p className={`text-sm ${notification.read ? 'text-slate-400' : 'text-white font-medium'}`}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-slate-500">{notification.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Today's Schedule */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-500" />
            Today's Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-lg">
              <div className="text-center min-w-[60px]">
                <p className="text-xs text-slate-400">10:00</p>
                <p className="text-xs text-slate-500">AM</p>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Team Standup</p>
                <p className="text-xs text-slate-400">Daily sync with operations team</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-green-500" />
            </div>
            <div className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-lg">
              <div className="text-center min-w-[60px]">
                <p className="text-xs text-slate-400">14:00</p>
                <p className="text-xs text-slate-500">PM</p>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Incident Review</p>
                <p className="text-xs text-slate-400">Review recent incidents with manager</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-amber-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeDashboard;

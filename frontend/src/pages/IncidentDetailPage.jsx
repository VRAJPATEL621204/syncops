import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  User, 
  Building2, 
  Calendar,
  Loader2,
  MessageSquare,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { incidentAPI } from '@/services/api';
import { toast } from '@/hooks/use-toast';
import DashboardLayout from '@/layouts/DashboardLayout';
import EvidenceGallery from '@/components/incidents/EvidenceGallery';

const IncidentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const canManage = isAdmin || isManager;

  useEffect(() => {
    fetchIncidentDetails();
  }, [id]);

  // Redirect managers/admins to review page only for pending reports awaiting approval
  useEffect(() => {
    if (incident && incident.status === 'report_pending' && canManage) {
      navigate(`/incidents/${id}/review`, { replace: true });
    }
  }, [incident, canManage, id, navigate]);

  const fetchIncidentDetails = async () => {
    try {
      const response = await incidentAPI.getIncidentById(id);
      setIncident(response.data.data.incident);
    } catch (error) {
      console.error('Fetch incident error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load incident details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setActionLoading(true);
    try {
      await incidentAPI.changeStatus(id, { status: newStatus });
      toast({
        title: 'Success',
        description: `Incident status changed to ${newStatus}`,
      });
      fetchIncidentDetails();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update status',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async () => {
    setActionLoading(true);
    try {
      await incidentAPI.resolveIncident(id);
      toast({
        title: 'Success',
        description: 'Incident resolved successfully',
      });
      fetchIncidentDetails();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to resolve incident',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async () => {
    setActionLoading(true);
    try {
      await incidentAPI.closeIncident(id);
      toast({
        title: 'Success',
        description: 'Incident closed successfully',
      });
      fetchIncidentDetails();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to close incident',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopen = async () => {
    setActionLoading(true);
    try {
      await incidentAPI.reopenIncident(id);
      toast({
        title: 'Success',
        description: 'Incident reopened successfully',
      });
      fetchIncidentDetails();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reopen incident',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      report_pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
      open: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      resolved: 'bg-green-500/20 text-green-400 border-green-500/30',
      closed: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    };
    return styles[status] || styles.open;
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      high: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return styles[priority] || styles.low;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <AlertTriangle className="w-16 h-16 text-slate-600 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Incident Not Found</h2>
        <p className="text-slate-400 mb-4">The incident you're looking for doesn't exist or you don't have access.</p>
        <Button onClick={() => navigate('/dashboard')} className="bg-cyan-600 hover:bg-cyan-700">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // Simplified view for employees viewing their own pending reports
  if (incident.status === 'report_pending' && !canManage) {
    return (
      <div className="min-h-screen bg-slate-950 p-4 lg:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <Button
            variant="outline"
            onClick={() => navigate('/incidents')}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Incidents
          </Button>

          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-white">Awaiting Manager Review</h1>
                  <p className="text-slate-400">Your incident report is pending approval</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Title</p>
                  <p className="text-white font-medium text-lg">{incident.title}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Description</p>
                  <p className="text-slate-300">{incident.description || 'No description provided'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    PENDING REVIEW
                  </Badge>
                  <Badge className={getPriorityBadge(incident.priority)}>
                    {incident.priority?.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500">
                  Submitted on {new Date(incident.createdAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
    <div className="min-h-screen bg-slate-950 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">{incident.title}</h1>
              <p className="text-slate-400">
                Created {new Date(incident.createdAt).toLocaleDateString()} by {incident.createdBy?.fullName}
              </p>
            </div>
          </div>
          
          {/* Status Badge */}
          <Badge className={`${getStatusBadge(incident.status)} text-sm px-3 py-1`}>
            {incident.status.replace('_', ' ')}
          </Badge>
        </div>

        {/* Action Buttons */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            {/* PENDING REPORT - Show Review Button for Managers */}
            {incident.status === 'report_pending' && canManage && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Pending Review</p>
                    <p className="text-slate-400 text-sm">This report needs manager approval</p>
                  </div>
                </div>
                <Button
                  onClick={() => navigate(`/incidents/${incident.id}/review`)}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Review Report
                </Button>
              </div>
            )}

            {/* PENDING REPORT - Show waiting message for employees */}
            {incident.status === 'report_pending' && !canManage && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-white font-medium">Awaiting Review</p>
                  <p className="text-slate-400 text-sm">Your report is pending manager approval</p>
                </div>
              </div>
            )}

            {/* REJECTED - Show rejection info */}
            {incident.status === 'rejected' && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-white font-medium">Report Rejected</p>
                  <p className="text-slate-400 text-sm">
                    This incident report was not approved for operational action
                  </p>
                </div>
              </div>
            )}

            {/* ACTIVE INCIDENTS - Show operational actions */}
            {canManage && ['open', 'in_progress', 'resolved', 'closed'].includes(incident.status) && (
              <div className="flex flex-wrap gap-3">
                {incident.status === 'open' && (
                  <Button
                    onClick={() => handleStatusChange('in_progress')}
                    disabled={actionLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Start Progress
                  </Button>
                )}
                
                {(incident.status === 'open' || incident.status === 'in_progress') && (
                  <Button
                    onClick={handleResolve}
                    disabled={actionLoading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Resolve
                  </Button>
                )}
                
                {incident.status === 'resolved' && isAdmin && (
                  <Button
                    onClick={handleClose}
                    disabled={actionLoading}
                    className="bg-slate-600 hover:bg-slate-700 text-white"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Close
                  </Button>
                )}
                
                {incident.status === 'closed' && isAdmin && (
                  <Button
                    onClick={handleReopen}
                    disabled={actionLoading}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <History className="w-4 h-4 mr-2" />
                    Reopen
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 whitespace-pre-wrap">
                  {incident.description || 'No description provided.'}
                </p>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-cyan-500" />
                  Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                {incident.logs?.length > 0 ? (
                  <div className="space-y-4">
                    {incident.logs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-cyan-500 mt-2" />
                        <div>
                          <p className="text-sm text-slate-300">
                            <span className="text-white font-medium">{log.actor?.fullName}</span>
                            {' '}{log.action.replace('_', ' ')}
                          </p>
                          {log.oldValue && log.newValue && (
                            <p className="text-xs text-slate-500">
                              {log.oldValue} → {log.newValue}
                            </p>
                          )}
                          <p className="text-xs text-slate-500">
                            {new Date(log.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-4">No activity yet</p>
                )}
              </CardContent>
            </Card>

            {/* Evidence Attachments */}
            {incident.attachments && incident.attachments.length > 0 && (
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-4">
                  <EvidenceGallery attachments={incident.attachments} compact={true} />
                </CardContent>
              </Card>
            )}

            {/* Operational Room */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-cyan-500" />
                  Operational Room
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Pending Report - No Room Yet */}
                {incident.status === 'report_pending' && (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-3">
                      <Clock className="w-6 h-6 text-yellow-500" />
                    </div>
                    <p className="text-slate-300 font-medium">Room Not Created Yet</p>
                    <p className="text-slate-500 text-sm mt-1">
                      Incident room will be created after approval
                    </p>
                  </div>
                )}

                {/* Rejected - No Room */}
                {incident.status === 'rejected' && (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-3">
                      <XCircle className="w-6 h-6 text-red-500" />
                    </div>
                    <p className="text-slate-300 font-medium">No Room Created</p>
                    <p className="text-slate-500 text-sm mt-1">
                      Report was rejected - no operational room needed
                    </p>
                  </div>
                )}

                {/* Active Incident - Show Room Link */}
                {['open', 'in_progress', 'resolved', 'closed'].includes(incident.status) && (
                  <div className="space-y-4">
                    {incident.rooms?.length > 0 ? (
                      <div className="space-y-3">
                        {incident.rooms.map((room) => (
                          <div
                            key={room.id}
                            onClick={() => navigate(`/chat/${room.id}`)}
                            className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                                <MessageSquare className="w-5 h-5 text-cyan-500" />
                              </div>
                              <div>
                                <p className="text-white font-medium">{room.name}</p>
                                <p className="text-slate-400 text-sm">
                                  Created {new Date(room.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700">
                              Open
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">No room available</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Metadata */}
          <div className="space-y-6">
            {/* Status & Priority */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Current Status</p>
                  <Badge className={`${getStatusBadge(incident.status)} px-3 py-1`}>
                    {incident.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Priority</p>
                  <Badge className={`${getPriorityBadge(incident.priority)} px-3 py-1`}>
                    {incident.priority}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Category</p>
                  <p className="text-white capitalize">{incident.category.replace('_', ' ')}</p>
                </div>
              </CardContent>
            </Card>

            {/* Teams */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-cyan-500" />
                  Teams
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Source Team</p>
                  <p className="text-white">{incident.sourceTeam?.name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Assigned Team</p>
                  <p className="text-white">
                    {incident.assignedTeam?.name || 
                      (incident.assignedTeamId ? 'Loading...' : 'Not assigned')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* People */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-cyan-500" />
                  People
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Reported By</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-cyan-600/20 flex items-center justify-center">
                      <span className="text-cyan-500 text-sm font-medium">
                        {incident.createdBy?.fullName?.charAt(0)}
                      </span>
                    </div>
                    <p className="text-white">{incident.createdBy?.fullName}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Assigned Manager</p>
                  <p className="text-white">
                    {incident.assignedManager?.fullName || 'Not assigned'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-cyan-500" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Created</span>
                  <span className="text-white">{new Date(incident.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Updated</span>
                  <span className="text-white">{new Date(incident.updatedAt).toLocaleDateString()}</span>
                </div>
                {incident.resolvedAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Resolved</span>
                    <span className="text-green-400">{new Date(incident.resolvedAt).toLocaleDateString()}</span>
                  </div>
                )}
                {incident.closedAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Closed</span>
                    <span className="text-slate-400">{new Date(incident.closedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
};

export default IncidentDetailPage;

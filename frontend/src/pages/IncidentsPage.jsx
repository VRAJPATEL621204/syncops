import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle,
  Inbox,
  Filter,
  ChevronRight,
  MessageSquare,
  Eye,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { incidentAPI } from '@/services/api';
import { toast } from '@/hooks/use-toast';
import DashboardLayout from '@/layouts/DashboardLayout';
import ReportIncidentDialog from '@/components/incidents/ReportIncidentDialog';
import CreateIncidentDialog from '@/components/incidents/CreateIncidentDialog';

const IncidentsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Fetch incidents on mount and poll every 30 seconds
  useEffect(() => {
    fetchIncidents();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchIncidents();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const response = await incidentAPI.getIncidents();
      setIncidents(response.data.data.incidents || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load incidents',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isEmployee = user?.role === 'employee';
  const canManage = isAdmin || isManager;

  // Filter incidents based on status
  const pendingReports = incidents.filter(i => i.status === 'report_pending');
  const rejectedReports = incidents.filter(i => i.status === 'rejected');
  const activeIncidents = incidents.filter(i => i.status === 'open' || i.status === 'in_progress');
  const resolvedIncidents = incidents.filter(i => ['resolved', 'closed'].includes(i.status));

  const getStatusBadge = (status) => {
    const styles = {
      report_pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
      open: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
      in_progress: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      resolved: 'bg-green-500/10 text-green-500 border-green-500/20',
      closed: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    };
    const labels = {
      report_pending: 'PENDING REVIEW',
      rejected: 'REJECTED',
      open: 'OPEN',
      in_progress: 'IN PROGRESS',
      resolved: 'RESOLVED',
      closed: 'CLOSED',
    };
    return (
      <Badge variant="outline" className={styles[status] || styles.open}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      low: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
      medium: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      critical: 'bg-red-500/10 text-red-400 border-red-500/20',
    };
    return (
      <Badge variant="outline" className={styles[priority] || styles.medium}>
        {priority?.toUpperCase()}
      </Badge>
    );
  };

  const IncidentCard = ({ incident, showActions = false }) => {
    const isPending = incident.status === 'report_pending';
    const canReview = isPending && canManage;

    const handleClick = () => {
      if (canReview) {
        navigate(`/incidents/${incident.id}/review`);
      } else {
        navigate(`/incidents/${incident.id}`);
      }
    };

    return (
      <Card 
        className="bg-[#1E293B] border-slate-700/50 hover:border-slate-600/50 transition-colors cursor-pointer"
        onClick={handleClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {getStatusBadge(incident.status)}
                {getPriorityBadge(incident.priority)}
              </div>
              <h3 className="text-sm font-medium text-slate-200 truncate">
                {incident.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {incident.sourceTeam?.name} • {new Date(incident.createdAt).toLocaleDateString()}
              </p>
              {incident.assignedTeam && (
                <p className="text-xs text-cyan-400 mt-1">
                  Assigned to: {incident.assignedTeam.name}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
              {incident.roomId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-cyan-400"
                  onClick={() => navigate(`/chat/${incident.roomId}`)}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              )}
              {canReview ? (
                <Button
                  size="sm"
                  className="bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30 border border-yellow-600/30"
                  onClick={() => navigate(`/incidents/${incident.id}/review`)}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Review
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-slate-200"
                  onClick={handleClick}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Incidents</h1>
            <p className="text-sm text-slate-500 mt-1">
              {isEmployee 
                ? 'Report issues and track your incidents' 
                : 'Manage operational incidents and review reports'}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          {isEmployee && (
            <Button 
              onClick={() => setShowReportDialog(true)}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Report Issue
            </Button>
          )}
          {canManage && (
            <Button 
              onClick={() => setShowCreateDialog(true)}
              variant="outline"
              className="border-slate-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Incident
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-[#1E293B] border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Inbox className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">{pendingReports.length}</p>
                <p className="text-xs text-slate-500">{canManage ? 'Pending Reports' : 'Awaiting Review'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1E293B] border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">{activeIncidents.length}</p>
                <p className="text-xs text-slate-500">Active Incidents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1E293B] border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">
                  {incidents.filter(i => i.status === 'in_progress').length}
                </p>
                <p className="text-xs text-slate-500">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1E293B] border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">{resolvedIncidents.length}</p>
                <p className="text-xs text-slate-500">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#1E293B] border-slate-700/50 mb-4">
          <TabsTrigger value="active" className="data-[state=active]:bg-cyan-600">
            Active
          </TabsTrigger>
          <TabsTrigger value="pending" className="data-[state=active]:bg-yellow-600">
            {canManage ? 'Pending Review' : 'My Reports'}
            {pendingReports.length > 0 && (
              <span className="ml-1.5 bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingReports.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="resolved" className="data-[state=active]:bg-green-600">
            Resolved
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-0">
          <div className="space-y-3">
            {loading ? (
              <p className="text-slate-500 text-center py-8">Loading...</p>
            ) : activeIncidents.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No active incidents</p>
            ) : (
              activeIncidents.map(incident => (
                <IncidentCard key={incident.id} incident={incident} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="pending" className="mt-0">
          <div className="space-y-3">
            {loading ? (
              <p className="text-slate-500 text-center py-8">Loading...</p>
            ) : pendingReports.length === 0 ? (
              <p className="text-slate-500 text-center py-8">
                {canManage ? 'No pending reports' : 'No submitted reports awaiting review'}
              </p>
            ) : (
              pendingReports.map(report => (
                <IncidentCard key={report.id} incident={report} showActions />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="resolved" className="mt-0">
          <div className="space-y-3">
            {loading ? (
              <p className="text-slate-500 text-center py-8">Loading...</p>
            ) : resolvedIncidents.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No resolved incidents</p>
            ) : (
              resolvedIncidents.map(incident => (
                <IncidentCard key={incident.id} incident={incident} />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ReportIncidentDialog 
        open={showReportDialog} 
        onClose={() => setShowReportDialog(false)}
        onSuccess={fetchIncidents}
      />
      <CreateIncidentDialog 
        open={showCreateDialog} 
        onClose={() => setShowCreateDialog(false)}
        onSuccess={fetchIncidents}
      />
    </div>
    </DashboardLayout>
  );
};

export default IncidentsPage;

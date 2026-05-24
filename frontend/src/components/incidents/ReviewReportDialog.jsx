import { useState, useEffect } from 'react';
import { Eye, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { incidentAPI, teamAPI, userAPI } from '@/services/api';
import { toast } from '@/hooks/use-toast';

const ReviewReportDialog = ({ open, report, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [action, setAction] = useState(null); // 'approve' or 'reject'
  const [rejectionReason, setRejectionReason] = useState('');
  const [formData, setFormData] = useState({
    assignedTeamId: '',
    assignedManagerId: '',
    priority: '',
    operationalNotes: '',
  });

  useEffect(() => {
    if (open && report) {
      fetchTeamsAndUsers();
      setFormData({
        assignedTeamId: '',
        assignedManagerId: '',
        priority: report.priority || 'medium',
        operationalNotes: '',
      });
      setAction(null);
      setRejectionReason('');
    }
  }, [open, report]);

  const fetchTeamsAndUsers = async () => {
    try {
      const [teamsRes, usersRes] = await Promise.all([
        teamAPI.getTeams(),
        userAPI.searchUsers(''),
      ]);
      setTeams(teamsRes.data.data.teams || []);
      setUsers(usersRes.data.data.users || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleApprove = async () => {
    try {
      setLoading(true);
      await incidentAPI.approveReport(report.id, {
        assignedTeamId: formData.assignedTeamId || undefined,
        assignedManagerId: formData.assignedManagerId || undefined,
        priority: formData.priority,
        operationalNotes: formData.operationalNotes,
      });
      toast({
        title: 'Report Approved',
        description: 'Incident has been raised and room created',
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to approve report',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a reason for rejection',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      await incidentAPI.rejectReport(report.id, { reason: rejectionReason });
      toast({
        title: 'Report Rejected',
        description: 'The incident report has been rejected',
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reject report',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!report) return null;

  const managers = users.filter(u => u.role === 'manager' || u.role === 'admin');

  const getStatusBadge = () => (
    <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
      PENDING REVIEW
    </Badge>
  );

  const getPriorityBadge = (priority) => {
    const styles = {
      low: 'bg-slate-500/10 text-slate-400',
      medium: 'bg-blue-500/10 text-blue-400',
      high: 'bg-orange-500/10 text-orange-400',
      critical: 'bg-red-500/10 text-red-400',
    };
    return (
      <Badge className={styles[priority] || styles.medium}>
        {priority?.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1E293B] border-slate-700 text-slate-100 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-cyan-500" />
            Review Incident Report
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Review the employee's incident report and decide whether to approve or reject it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Report Details */}
          <div className="bg-[#0F172A] rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 mb-3">
              {getStatusBadge()}
              {getPriorityBadge(report.priority)}
            </div>
            
            <div>
              <Label className="text-slate-500 text-xs">Title</Label>
              <p className="text-slate-200 font-medium">{report.title}</p>
            </div>
            
            <div>
              <Label className="text-slate-500 text-xs">Description</Label>
              <p className="text-slate-300 text-sm">{report.description || 'No description provided'}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-500 text-xs">Category</Label>
                <p className="text-slate-300 text-sm capitalize">{report.category}</p>
              </div>
              <div>
                <Label className="text-slate-500 text-xs">Source Team</Label>
                <p className="text-slate-300 text-sm">{report.sourceTeam?.name}</p>
              </div>
            </div>
            
            <div>
              <Label className="text-slate-500 text-xs">Reported By</Label>
              <p className="text-slate-300 text-sm">{report.createdBy?.fullName} on {new Date(report.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Action Selection */}
          {!action && (
            <div className="flex gap-3">
              <Button
                onClick={() => setAction('approve')}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve & Raise Incident
              </Button>
              <Button
                onClick={() => setAction('reject')}
                variant="outline"
                className="flex-1 border-red-600 text-red-400 hover:bg-red-600/10"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject Report
              </Button>
            </div>
          )}

          {/* Approve Form */}
          {action === 'approve' && (
            <div className="space-y-4 border-t border-slate-700 pt-4">
              <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Configure Incident
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Final Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger className="bg-[#0F172A] border-slate-700 text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E293B] border-slate-700">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Assigned Team</Label>
                  <Select
                    value={formData.assignedTeamId}
                    onValueChange={(value) => setFormData({ ...formData, assignedTeamId: value })}
                  >
                    <SelectTrigger className="bg-[#0F172A] border-slate-700 text-slate-100">
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E293B] border-slate-700">
                      <SelectItem value="">None</SelectItem>
                      {teams.map(team => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Assigned Manager</Label>
                <Select
                  value={formData.assignedManagerId}
                  onValueChange={(value) => setFormData({ ...formData, assignedManagerId: value })}
                >
                  <SelectTrigger className="bg-[#0F172A] border-slate-700 text-slate-100">
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E293B] border-slate-700">
                    <SelectItem value="">None</SelectItem>
                    {managers.map(user => (
                      <SelectItem key={user.id} value={user.id}>{user.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Operational Notes</Label>
                <Textarea
                  value={formData.operationalNotes}
                  onChange={(e) => setFormData({ ...formData, operationalNotes: e.target.value })}
                  placeholder="Add operational notes..."
                  className="bg-[#0F172A] border-slate-700 text-slate-100"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setAction(null)}
                  variant="outline"
                  className="border-slate-600"
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleApprove}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    'Confirm & Raise Incident'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Reject Form */}
          {action === 'reject' && (
            <div className="space-y-4 border-t border-slate-700 pt-4">
              <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                Rejection Reason
              </h4>
              
              <div className="space-y-2">
                <Label>Reason for Rejection *</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this report is being rejected..."
                  className="bg-[#0F172A] border-slate-700 text-slate-100"
                  required
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setAction(null)}
                  variant="outline"
                  className="border-slate-600"
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleReject}
                  variant="outline"
                  className="flex-1 border-red-600 text-red-400 hover:bg-red-600/10"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    'Confirm Rejection'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewReportDialog;

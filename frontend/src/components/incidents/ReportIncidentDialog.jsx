import { useState, useEffect } from 'react';
import { AlertTriangle, Loader2, Paperclip } from 'lucide-react';
import EvidenceUploader from './EvidenceUploader';
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
import { incidentAPI, teamAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';

const ReportIncidentDialog = ({ open, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [attachments, setAttachments] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'incident',
    priority: 'medium',
    sourceTeamId: '',
  });

  // Fetch user's teams on mount
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await teamAPI.getTeams();
        const teamsData = Array.isArray(response.data.data) ? response.data.data : (response.data.data?.teams || []);
        setTeams(teamsData);
        
        // If only one team, auto-select it
        if (teamsData.length === 1) {
          setFormData(prev => ({ ...prev, sourceTeamId: teamsData[0].id }));
        }
      } catch (error) {
        console.error('Failed to fetch teams:', error);
        toast({
          title: 'Error',
          description: 'Failed to load your teams',
          variant: 'destructive',
        });
      } finally {
        setTeamsLoading(false);
      }
    };

    if (open) {
      fetchTeams();
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || formData.title.length < 3) {
      toast({
        title: 'Validation Error',
        description: 'Title must be at least 3 characters',
        variant: 'destructive',
      });
      return;
    }

    // Validate team selection if user has multiple teams
    if (teams.length > 1 && !formData.sourceTeamId) {
      toast({
        title: 'Validation Error',
        description: 'Please select which team is reporting this incident',
        variant: 'destructive',
      });
      return;
    }

    // If user has no teams, show error
    if (teams.length === 0) {
      toast({
        title: 'Error',
        description: 'You must belong to a team to report incidents. Please contact your manager.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      await incidentAPI.reportIncident({ ...formData, attachments });
      toast({
        title: 'Report Submitted',
        description: 'Your incident report has been submitted for review',
      });
      setFormData({ title: '', description: '', category: 'incident', priority: 'medium', sourceTeamId: teams.length === 1 ? teams[0].id : '' });
      setAttachments([]);
      onSuccess?.();
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to submit report',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1E293B] border-slate-700 text-slate-100 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Report an Issue
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Submit an incident report for management review. 
            Your report will be reviewed before becoming an active incident.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief description of the issue"
              className="bg-[#0F172A] border-slate-700 text-slate-100"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of the incident..."
              className="bg-[#0F172A] border-slate-700 text-slate-100 min-h-[100px]"
            />
          </div>

          {/* Team Selection - Required for employees with multiple teams */}
          {(teamsLoading || teams.length > 1) && (
            <div className="space-y-2">
              <Label>Reporting Team *</Label>
              {teamsLoading ? (
                <div className="h-10 bg-[#0F172A] border-slate-700 rounded-md flex items-center px-3">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                </div>
              ) : teams.length === 0 ? (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                  <p className="text-sm text-red-400">You are not assigned to any team. Contact your manager.</p>
                </div>
              ) : (
                <Select
                  value={formData.sourceTeamId}
                  onValueChange={(value) => setFormData({ ...formData, sourceTeamId: value })}
                >
                  <SelectTrigger className="bg-[#0F172A] border-slate-700 text-slate-100">
                    <SelectValue placeholder="Select your team..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E293B] border-slate-700">
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {teams.length > 1 && (
                <p className="text-xs text-slate-500">
                  Select which team is reporting this issue
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="bg-[#0F172A] border-slate-700 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1E293B] border-slate-700">
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="feature_request">Feature Request</SelectItem>
                  <SelectItem value="incident">Incident</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Suggested Priority</Label>
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
          </div>

          {/* Evidence Attachments */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-slate-500" />
              <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Evidence Attachments</Label>
              <span className="text-[10px] text-slate-600">(optional)</span>
            </div>
            <p className="text-[10px] text-slate-600">Screenshots, error screens, or any visual evidence to help managers assess the issue</p>
            <EvidenceUploader
              value={attachments}
              onChange={setAttachments}
              disabled={loading}
            />
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-600"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-cyan-600 hover:bg-cyan-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Report'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReportIncidentDialog;

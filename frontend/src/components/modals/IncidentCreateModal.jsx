import { useState, useEffect } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { incidentAPI, teamAPI } from '@/services/api';
import { toast } from '@/hooks/use-toast';

const CATEGORIES = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'incident', label: 'Incident' },
  { value: 'security', label: 'Security' },
  { value: 'performance', label: 'Performance' },
  { value: 'other', label: 'Other' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'text-slate-400' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-400' },
  { value: 'high', label: 'High', color: 'text-amber-400' },
  { value: 'critical', label: 'Critical', color: 'text-red-400' },
];

const IncidentCreateModal = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState([]);
  const [managers, setManagers] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'incident',
    priority: 'medium',
    sourceTeamId: '',
    assignedTeamId: '',
    assignedManagerId: '',
  });
  const [errors, setErrors] = useState({});

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isEmployee = user?.role === 'employee';
  const canAssign = isAdmin || isManager;

  // Fetch teams and managers on mount
  useEffect(() => {
    if (isOpen) {
      fetchTeamsAndManagers();
      // Auto-set source team for employees
      if (isEmployee && teams.length > 0) {
        setFormData(prev => ({ ...prev, sourceTeamId: teams[0]?.id || '' }));
      }
    }
  }, [isOpen]);

  const fetchTeamsAndManagers = async () => {
    try {
      const teamsRes = await teamAPI.getTeams();
      const teamsData = teamsRes.data.data || [];
      setTeams(teamsData);

      // Extract managers from teams
      const allMembers = teamsData.flatMap(team => team.members || []);
      const managersList = allMembers
        .filter(member => member.user?.role === 'manager')
        .map(member => ({
          id: member.user.id,
          fullName: member.user.fullName,
          teamName: teamsData.find(t => t.id === member.teamId)?.name,
        }));
      
      // Remove duplicates
      const uniqueManagers = [...new Map(managersList.map(m => [m.id, m])).values()];
      setManagers(uniqueManagers);

      // Auto-set source team for employee (first team they belong to)
      if (isEmployee && teamsData.length > 0) {
        setFormData(prev => ({ ...prev, sourceTeamId: teamsData[0].id }));
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      toast({
        title: 'Error',
        description: 'Failed to load teams',
        variant: 'destructive',
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim() || formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }
    
    if (!formData.sourceTeamId) {
      newErrors.sourceTeamId = 'Source team is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      // Employees report incidents (pending), managers create active incidents
      const response = isEmployee 
        ? await incidentAPI.reportIncident(formData)
        : await incidentAPI.createManualIncident(formData);
      
      toast({
        title: 'Success',
        description: isEmployee 
          ? 'Incident report submitted for review' 
          : 'Incident created successfully',
      });
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: 'incident',
        priority: 'medium',
        sourceTeamId: isEmployee ? teams[0]?.id || '' : '',
        assignedTeamId: '',
        assignedManagerId: '',
      });
      
      onSuccess?.(response.data.data);
      onClose();
    } catch (error) {
      console.error('Create incident error:', error);
      
      const errorMessage = error.response?.data?.message || 'Failed to create incident';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {isEmployee ? 'Report Incident' : 'Create Incident'}
              </h2>
              <p className="text-sm text-slate-400">
                {isEmployee ? 'Report a new operational issue' : 'Create a new incident manually'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-slate-300">
              Title <span className="text-red-400">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Brief description of the incident"
              className={`bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20 ${
                errors.title ? 'border-red-500 focus:border-red-500' : ''
              }`}
              disabled={loading}
            />
            {errors.title && (
              <p className="text-sm text-red-400">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-slate-300">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Detailed description of the issue..."
              rows={3}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20 resize-none"
              disabled={loading}
            />
          </div>

          {/* Category & Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-slate-300">
                Category
              </Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
                disabled={loading}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority" className="text-slate-300">
                Priority
              </Label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
                disabled={loading}
              >
                {PRIORITIES.map(pri => (
                  <option key={pri.value} value={pri.value}>{pri.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Source Team - Show for all, but employee gets auto-selected */}
          {canAssign && (
            <div className="space-y-2">
              <Label htmlFor="sourceTeamId" className="text-slate-300">
                Source Team <span className="text-red-400">*</span>
              </Label>
              <select
                id="sourceTeamId"
                value={formData.sourceTeamId}
                onChange={(e) => handleChange('sourceTeamId', e.target.value)}
                className={`w-full h-10 px-3 rounded-md bg-slate-800 border text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 ${
                  errors.sourceTeamId ? 'border-red-500' : 'border-slate-700'
                }`}
                disabled={loading || isEmployee}
              >
                <option value="">Select source team</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
              {errors.sourceTeamId && (
                <p className="text-sm text-red-400">{errors.sourceTeamId}</p>
              )}
            </div>
          )}

          {/* Assignment Section - Manager/Admin only */}
          {canAssign && (
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
                Assignment (Optional)
              </h3>

              {/* Assigned Team */}
              <div className="space-y-2">
                <Label htmlFor="assignedTeamId" className="text-slate-300">
                  Assigned Team
                </Label>
                <select
                  id="assignedTeamId"
                  value={formData.assignedTeamId}
                  onChange={(e) => handleChange('assignedTeamId', e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
                  disabled={loading}
                >
                  <option value="">Auto-assign based on source</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>

              {/* Assigned Manager */}
              <div className="space-y-2">
                <Label htmlFor="assignedManagerId" className="text-slate-300">
                  Assigned Manager
                </Label>
                <select
                  id="assignedManagerId"
                  value={formData.assignedManagerId}
                  onChange={(e) => handleChange('assignedManagerId', e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
                  disabled={loading}
                >
                  <option value="">Select manager</option>
                  {managers.map(manager => (
                    <option key={manager.id} value={manager.id}>
                      {manager.fullName} ({manager.teamName})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* For employees, show a note about auto-assignment */}
          {isEmployee && (
            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
              <p className="text-sm text-slate-400">
                <span className="text-cyan-400 font-medium">Note:</span> Your incident will be automatically assigned to your team ({teams.find(t => t.id === formData.sourceTeamId)?.name || 'your team'}). A manager will review it shortly.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                isEmployee ? 'Report Incident' : 'Create Incident'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IncidentCreateModal;

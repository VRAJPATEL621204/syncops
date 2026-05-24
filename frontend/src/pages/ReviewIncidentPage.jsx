import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  User,
  Building2,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  MessageSquare,
  FileText,
  GitPullRequest,
  AlertCircle,
  Search,
  X,
  Users,
  Shield,
  StickyNote,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { useAuth } from '@/context/AuthContext';
import { incidentAPI, teamAPI, userAPI } from '@/services/api';
import { toast } from '@/hooks/use-toast';
import DashboardLayout from '@/layouts/DashboardLayout';
import EvidenceGallery from '@/components/incidents/EvidenceGallery';

const PRIORITY_CONFIG = {
  low:      { label: 'Low',      color: 'text-slate-400',  dot: 'bg-slate-500' },
  medium:   { label: 'Medium',   color: 'text-blue-400',   dot: 'bg-blue-500'  },
  high:     { label: 'High',     color: 'text-orange-400', dot: 'bg-orange-500'},
  critical: { label: 'Critical', color: 'text-red-400',    dot: 'bg-red-500'   },
};

const SectionLabel = ({ icon: Icon, label }) => (
  <div className="flex items-center gap-2 mb-2.5">
    <Icon className="w-3.5 h-3.5 text-slate-500" />
    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">{label}</span>
  </div>
);

const TeamMultiSelect = ({ teams, selected, onChange, disabled }) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const filtered = teams.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) && !selected.includes(t.id));
  const selectedTeams = teams.filter(t => selected.includes(t.id));
  return (
    <div ref={ref} className="relative">
      <div onClick={() => !disabled && setOpen(true)}
        className={`min-h-9 flex flex-wrap gap-1.5 items-center px-2.5 py-1.5 bg-[#0F172A] border rounded-md cursor-text transition-colors ${open ? 'border-cyan-500/50' : 'border-slate-700'} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        {selectedTeams.map(t => (
          <span key={t.id} className="flex items-center gap-1 px-2 py-0.5 bg-slate-700 text-slate-200 text-xs rounded-md border border-slate-600">
            {t.name}
            <button type="button" onClick={(e) => { e.stopPropagation(); onChange(selected.filter(id => id !== t.id)); }} className="text-slate-400 hover:text-red-400 ml-0.5"><X className="w-3 h-3" /></button>
          </span>
        ))}
        <div className="flex items-center gap-1 flex-1 min-w-20">
          <Search className="w-3 h-3 text-slate-600 shrink-0" />
          <input value={search} onChange={e => { setSearch(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
            placeholder={selectedTeams.length === 0 ? 'Search teams...' : ''}
            className="bg-transparent text-xs text-slate-200 placeholder:text-slate-600 outline-none flex-1" />
        </div>
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#1E293B] border border-slate-700 rounded-md shadow-xl overflow-hidden max-h-40 overflow-y-auto">
          {filtered.map(t => (
            <button key={t.id} type="button" onMouseDown={(e) => { e.preventDefault(); onChange([...selected, t.id]); setSearch(''); }}
              className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700/60 flex items-center gap-2 transition-colors">
              <Users className="w-3 h-3 text-slate-500" /> {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ParticipantSearch = ({ users, selected, onChange }) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const filtered = users.filter(u =>
    (u.fullName?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())) && !selected.includes(u.id)
  );
  const selectedUsers = users.filter(u => selected.includes(u.id));
  const roleColor = { admin: 'text-purple-400', manager: 'text-cyan-400', employee: 'text-slate-400' };
  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen(true)}
        className={`min-h-9 flex flex-wrap gap-1.5 items-center px-2.5 py-1.5 bg-[#0F172A] border rounded-md cursor-text transition-colors ${open ? 'border-cyan-500/50' : 'border-slate-700'}`}>
        {selectedUsers.map(u => (
          <span key={u.id} className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-700 text-slate-200 text-xs rounded-md border border-slate-600">
            <span className="w-4 h-4 rounded-full bg-cyan-500/20 flex items-center justify-center text-[9px] font-bold text-cyan-400">{u.fullName?.charAt(0)?.toUpperCase()}</span>
            {u.fullName}
            <button type="button" onClick={(e) => { e.stopPropagation(); onChange(selected.filter(id => id !== u.id)); }} className="text-slate-400 hover:text-red-400"><X className="w-3 h-3" /></button>
          </span>
        ))}
        <div className="flex items-center gap-1 flex-1 min-w-25">
          <Search className="w-3 h-3 text-slate-600 shrink-0" />
          <input value={search} onChange={e => { setSearch(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
            placeholder={selectedUsers.length === 0 ? 'Search by name or email...' : ''}
            className="bg-transparent text-xs text-slate-200 placeholder:text-slate-600 outline-none flex-1" />
        </div>
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#1E293B] border border-slate-700 rounded-md shadow-xl overflow-hidden max-h-44 overflow-y-auto">
          {filtered.map(u => (
            <button key={u.id} type="button" onMouseDown={(e) => { e.preventDefault(); onChange([...selected, u.id]); setSearch(''); }}
              className="w-full text-left px-3 py-2 hover:bg-slate-700/60 flex items-center gap-2.5 transition-colors">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px] font-bold text-cyan-400 shrink-0">{u.fullName?.charAt(0)?.toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-200 font-medium truncate">{u.fullName}</p>
                <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
              </div>
              <span className={`text-[10px] font-medium capitalize shrink-0 ${roleColor[u.role] || 'text-slate-400'}`}>{u.role}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ReviewIncidentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Form data for raising incident
  const [formData, setFormData] = useState({
    finalPriority: '',
    assignedTeamId: '',
    involvedTeamIds: [],
    assignedManagerId: '',
    additionalParticipants: [],
    operationalNotes: '',
    escalationNotes: '',
  });

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const canManage = isAdmin || isManager;

  useEffect(() => {
    fetchReportDetails();
    fetchTeamsAndUsers();
  }, [id]);

  const fetchReportDetails = async () => {
    try {
      setLoading(true);
      const response = await incidentAPI.getIncidentById(id);
      const incident = response.data.data.incident;
      setReport(incident);

      // Pre-fill form with employee suggestions
      setFormData({
        finalPriority: incident.priority || 'medium',
        assignedTeamId: '',
        involvedTeamIds: [],
        assignedManagerId: '',
        additionalParticipants: [],
        operationalNotes: '',
        escalationNotes: '',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load incident report',
        variant: 'destructive',
      });
      navigate('/incidents');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamsAndUsers = async () => {
    try {
      const [teamsRes, usersRes] = await Promise.all([
        teamAPI.getTeams(),
        userAPI.searchUsers(''),
      ]);
      console.log('[Review] Teams fetched:', teamsRes.data);
      const teamsData = teamsRes.data.data?.teams || teamsRes.data.data || [];
      setTeams(teamsData);
      setUsers(usersRes.data.data?.users || []);
    } catch (error) {
      console.error('[Review] Error fetching teams:', error);
      toast({
        title: 'Error',
        description: 'Failed to load teams. Please refresh.',
        variant: 'destructive',
      });
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
      setActionLoading(true);
      await incidentAPI.rejectReport(id, { reason: rejectionReason });
      toast({
        title: 'Report Rejected',
        description: 'The incident report has been rejected',
      });
      navigate('/incidents');
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reject report',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRaiseIncident = async () => {
    try {
      setActionLoading(true);
      await incidentAPI.approveReport(id, {
        priority: formData.finalPriority,
        assignedTeamId: formData.assignedTeamId || undefined,
        involvedTeamIds: formData.involvedTeamIds,
        assignedManagerId: (formData.assignedManagerId === 'none' ? '' : formData.assignedManagerId) || undefined,
        additionalParticipants: formData.additionalParticipants,
        operationalNotes: formData.operationalNotes,
      });
      toast({
        title: 'Incident Raised',
        description: 'The incident has been officially raised and room created',
      });
      navigate('/incidents');
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to raise incident',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      report_pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
    };
    const labels = {
      report_pending: 'PENDING REVIEW',
      rejected: 'REJECTED',
    };
    return (
      <Badge variant="outline" className={styles[status]}>
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <p className="text-slate-500">Report not found</p>
      </div>
    );
  }

  // Only pending reports (open with no assigned team) can be reviewed
  const isPending = report.status === 'open' && !report.assignedTeamId;
  if (!isPending && report.status !== 'rejected') {
    return (
      <div className="min-h-screen bg-[#0F172A] p-6">
        <div className="max-w-4xl mx-auto">
          <Button variant="outline" onClick={() => navigate('/incidents')} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Incidents
          </Button>
          <Card className="bg-[#1E293B] border-slate-700">
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-300 mb-2">
                This report has already been processed
              </h2>
              <p className="text-slate-500">
                Status: {getStatusBadge(report.status)}
              </p>
              <Button
                onClick={() => navigate(`/incidents/${report.id}`)}
                className="mt-4 bg-cyan-600 hover:bg-cyan-700"
              >
                View Incident Details
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const managers = users.filter((u) => u.role === 'manager' || u.role === 'admin');

  return (
    <DashboardLayout>
    <div className="min-h-screen bg-[#0F172A] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button variant="outline" onClick={() => navigate('/incidents')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Incidents
          </Button>
          <div className="flex items-center gap-3">
            <GitPullRequest className="w-8 h-8 text-cyan-500" />
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Review Employee Report</h1>
              <p className="text-slate-500">
                Report #{report.id.slice(-8)} • Review details and raise official incident
              </p>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT COLUMN - Employee Report */}
          <div className="space-y-6">
            <Card className="bg-[#1E293B] border-slate-700">
              <CardHeader className="border-b border-slate-700">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-slate-400" />
                    Submitted by Employee
                  </CardTitle>
                  <div className="flex gap-2">
                    {getStatusBadge(report.status)}
                    {getPriorityBadge(report.priority)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Title */}
                <div>
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    Title
                  </Label>
                  <p className="text-lg font-medium text-slate-100 mt-1">{report.title}</p>
                </div>

                {/* Description */}
                <div>
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">
                    Description
                  </Label>
                  <p className="text-slate-300 mt-1 whitespace-pre-wrap">
                    {report.description || 'No description provided'}
                  </p>
                </div>

                {/* Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">
                      Category
                    </Label>
                    <p className="text-slate-300 mt-1 capitalize">{report.category}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">
                      Suggested Priority
                    </Label>
                    <div className="mt-1">{getPriorityBadge(report.priority)}</div>
                  </div>
                </div>

                {/* Reporter Info */}
                <div className="border-t border-slate-700 pt-4">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider mb-3 block">
                    Reported By
                  </Label>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-cyan-500" />
                    </div>
                    <div>
                      <p className="text-slate-200 font-medium">
                        {report.createdBy?.fullName || 'Unknown'}
                      </p>
                      <p className="text-slate-500 text-sm">{report.createdBy?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Source Team */}
                <div className="flex items-center gap-2 text-slate-400">
                  <Building2 className="w-4 h-4" />
                  <span className="text-sm">{report.sourceTeam?.name || 'No team'}</span>
                </div>

                {/* Reported Date */}
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>Submitted {new Date(report.createdAt).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Evidence Gallery */}
            {report.attachments && report.attachments.length > 0 && (
              <Card className="bg-[#1E293B] border-slate-700">
                <CardContent className="p-4">
                  <EvidenceGallery attachments={report.attachments} compact={false} />
                </CardContent>
              </Card>
            )}

            {/* Audit Trail */}
            {report.logs && report.logs.length > 0 && (
              <Card className="bg-[#1E293B] border-slate-700">
                <CardHeader className="border-b border-slate-700">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-slate-400" />
                    Activity History
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {report.logs.slice(0, 5).map((log, idx) => (
                      <div key={idx} className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-cyan-500 mt-2" />
                        <div>
                          <p className="text-slate-300">
                            <span className="font-medium">{log.actor?.fullName}</span>{' '}
                            {log.action.replace(/_/g, ' ')}
                          </p>
                          <p className="text-slate-500 text-xs">
                            {new Date(log.createdAt).toLocaleString()}
                          </p>
                          {log.notes && (
                            <p className="text-slate-400 mt-1">{log.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

                {/* RIGHT COLUMN - Review Actions */}
          <div className="space-y-4">
            {!showRejectForm ? (
              <>
                {/* Raise Incident Form */}
                <Card className="bg-[#0F172A] border-slate-800">
                  <CardHeader className="px-5 pt-5 pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                        <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold text-slate-100">Raise Official Incident</CardTitle>
                        <p className="text-[11px] text-slate-500 mt-0.5">Confirm details and activate incident response</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-5 py-4 space-y-5">

                    {/* Priority */}
                    <div>
                      <SectionLabel icon={AlertTriangle} label="Priority" />
                      <Select value={formData.finalPriority} onValueChange={v => setFormData({ ...formData, finalPriority: v })}>
                        <SelectTrigger className="h-8 bg-[#1E293B] border-slate-700 text-slate-200 text-xs">
                          <SelectValue>
                            {formData.finalPriority && (
                              <span className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${PRIORITY_CONFIG[formData.finalPriority]?.dot}`} />
                                <span className={PRIORITY_CONFIG[formData.finalPriority]?.color}>{PRIORITY_CONFIG[formData.finalPriority]?.label}</span>
                              </span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-[#1E293B] border-slate-700 text-xs">
                          {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                            <SelectItem key={k} value={k}>
                              <span className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${v.dot}`} />
                                <span className={v.color}>{v.label}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-slate-600 mt-1">Employee suggested: <span className="text-slate-400 capitalize">{report.priority}</span></p>
                    </div>

                    <div className="border-t border-slate-800" />

                    {/* Team Assignment */}
                    <div>
                      <SectionLabel icon={Users} label="Team Assignment" />
                      <div className="space-y-3">
                        <div>
                          <Label className="text-[11px] text-slate-400 font-medium">Primary Handling Team</Label>
                          <Select value={formData.assignedTeamId} onValueChange={v => setFormData({ ...formData, assignedTeamId: v })}>
                            <SelectTrigger className="mt-1 h-8 bg-[#1E293B] border-slate-700 text-slate-200 text-xs">
                              <SelectValue placeholder={teams.length === 0 ? 'No teams — create teams first' : 'Select team...'} />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1E293B] border-slate-700 text-xs">
                              {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[11px] text-slate-400 font-medium">Additional Involved Teams</Label>
                          <p className="text-[10px] text-slate-600 mb-1">All members auto-added to incident room</p>
                          <TeamMultiSelect
                            teams={teams}
                            selected={formData.involvedTeamIds}
                            onChange={ids => setFormData({ ...formData, involvedTeamIds: ids })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-800" />

                    {/* Ownership */}
                    <div>
                      <SectionLabel icon={Shield} label="Incident Ownership" />
                      <div className="space-y-3">
                        <div>
                          <Label className="text-[11px] text-slate-400 font-medium">Assigned Manager</Label>
                          <Select value={formData.assignedManagerId} onValueChange={v => setFormData({ ...formData, assignedManagerId: v })}>
                            <SelectTrigger className="mt-1 h-8 bg-[#1E293B] border-slate-700 text-slate-200 text-xs">
                              <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1E293B] border-slate-700 text-xs">
                              <SelectItem value="none">Unassigned</SelectItem>
                              {managers.map(u => (
                                <SelectItem key={u.id} value={u.id}>
                                  <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 rounded-full bg-cyan-500/20 flex items-center justify-center text-[9px] font-bold text-cyan-400">{u.fullName?.charAt(0)}</span>
                                    {u.fullName} <span className="text-[10px] text-slate-500">({u.role})</span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[11px] text-slate-400 font-medium">Additional Participants</Label>
                          <p className="text-[10px] text-slate-600 mb-1">Specialists or cross-team responders</p>
                          <ParticipantSearch
                            users={users}
                            selected={formData.additionalParticipants}
                            onChange={ids => setFormData({ ...formData, additionalParticipants: ids })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-800" />

                    {/* Notes */}
                    <div>
                      <SectionLabel icon={StickyNote} label="Operational Notes" />
                      <div className="space-y-3">
                        <Textarea
                          value={formData.operationalNotes}
                          onChange={e => setFormData({ ...formData, operationalNotes: e.target.value })}
                          placeholder="Initial findings, context, steps taken..."
                          className="bg-[#1E293B] border-slate-700 text-slate-100 text-sm placeholder:text-slate-600 min-h-14 resize-none"
                        />
                        <Textarea
                          value={formData.escalationNotes}
                          onChange={e => setFormData({ ...formData, escalationNotes: e.target.value })}
                          placeholder="Escalation reason / SLA concerns (optional)..."
                          className="bg-[#1E293B] border-slate-700 text-slate-100 text-sm placeholder:text-slate-600 min-h-14 resize-none"
                        />
                      </div>
                    </div>

                    {/* Room preview */}
                    <div className="bg-[#1E293B] border border-slate-700/50 rounded-lg px-4 py-3 space-y-1.5">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">On raise</p>
                      <div className="space-y-1">
                        {[
                          { icon: CheckCircle, color: 'text-green-400', text: 'Status → OPEN' },
                          { icon: MessageSquare, color: 'text-cyan-400', text: 'Incident room created' },
                          { icon: User, color: 'text-slate-400', text: `Reporter + assigned teams + ${formData.additionalParticipants.length} extra participant(s)` },
                        ].map(({ icon: Icon, color, text }) => (
                          <div key={text} className="flex items-center gap-2">
                            <Icon className={`w-3.5 h-3.5 ${color} shrink-0`} />
                            <span className="text-xs text-slate-400">{text}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={handleRaiseIncident}
                      disabled={actionLoading || !formData.finalPriority}
                      className="w-full h-9 text-sm bg-green-600 hover:bg-green-700"
                    >
                      {actionLoading
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Raising Incident...</>
                        : <><CheckCircle className="w-4 h-4 mr-2" />Officially Raise Incident</>}
                    </Button>
                  </CardContent>
                </Card>

                {/* Reject Option */}
                <Card className="bg-[#0F172A] border-slate-800">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-300">Reject this report</p>
                      <p className="text-[11px] text-slate-500">Mark as invalid — employee will be notified</p>
                    </div>
                    <Button variant="outline" onClick={() => setShowRejectForm(true)}
                      className="h-8 px-3 text-xs border-red-500/40 text-red-400 hover:bg-red-500/10 shrink-0">
                      <XCircle className="w-3.5 h-3.5 mr-1.5" />Reject
                    </Button>
                  </CardContent>
                </Card>
              </>
            ) : (
              /* Rejection Form */
              <Card className="bg-[#1E293B] border-slate-700 border-red-500/20">
                <CardHeader className="border-b border-slate-700">
                  <CardTitle className="text-lg flex items-center gap-2 text-red-400">
                    <XCircle className="w-5 h-5" />
                    Reject Report
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <p className="text-slate-400 text-sm">
                    Please provide a reason for rejection. This will be visible to the employee.
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                    <Textarea
                      id="rejectionReason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Explain why this report is being rejected..."
                      className="bg-[#0F172A] border-slate-700 text-slate-100 min-h-[100px]"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowRejectForm(false)}
                      className="flex-1 border-slate-600"
                      disabled={actionLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleReject}
                      disabled={actionLoading || !rejectionReason.trim()}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      {actionLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Rejecting...
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 mr-2" />
                          Confirm Rejection
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
};

export default ReviewIncidentPage;

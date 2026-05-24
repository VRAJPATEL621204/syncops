import { useState, useEffect, useRef } from 'react';
import { Plus, Loader2, X, Search, ChevronDown, Users, AlertTriangle, StickyNote, UserPlus, Shield, Paperclip } from 'lucide-react';
import EvidenceUploader from './EvidenceUploader';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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

const PRIORITY_CONFIG = {
  low:      { label: 'Low',      color: 'text-slate-400',  dot: 'bg-slate-500' },
  medium:   { label: 'Medium',   color: 'text-blue-400',   dot: 'bg-blue-500'  },
  high:     { label: 'High',     color: 'text-orange-400', dot: 'bg-orange-500'},
  critical: { label: 'Critical', color: 'text-red-400',    dot: 'bg-red-500'   },
};

const SectionHeader = ({ icon: Icon, label, index }) => (
  <div className="flex items-center gap-2 mb-3">
    <span className="flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold bg-slate-700 text-slate-400">{index}</span>
    <Icon className="w-3.5 h-3.5 text-slate-500" />
    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">{label}</span>
  </div>
);

const TeamMultiSelect = ({ teams, selected, onChange, disabled }) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = teams.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) && !selected.includes(t.id)
  );

  const selectedTeams = teams.filter(t => selected.includes(t.id));

  return (
    <div ref={ref} className="relative">
      <div
        className={`min-h-[36px] flex flex-wrap gap-1.5 items-center px-2.5 py-1.5 bg-[#0F172A] border rounded-md cursor-text transition-colors ${open ? 'border-cyan-500/50' : 'border-slate-700'} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        onClick={() => !disabled && setOpen(true)}
      >
        {selectedTeams.map(t => (
          <span key={t.id} className="flex items-center gap-1 px-2 py-0.5 bg-slate-700 text-slate-200 text-xs rounded-md border border-slate-600">
            {t.name}
            <button type="button" onClick={(e) => { e.stopPropagation(); onChange(selected.filter(id => id !== t.id)); }}
              className="text-slate-400 hover:text-red-400 transition-colors ml-0.5">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <div className="flex items-center gap-1 flex-1 min-w-[80px]">
          <Search className="w-3 h-3 text-slate-600 shrink-0" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={selectedTeams.length === 0 ? 'Search teams...' : ''}
            className="bg-transparent text-xs text-slate-200 placeholder:text-slate-600 outline-none flex-1"
          />
        </div>
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#1E293B] border border-slate-700 rounded-md shadow-xl overflow-hidden max-h-40 overflow-y-auto">
          {filtered.map(t => (
            <button key={t.id} type="button"
              onMouseDown={(e) => { e.preventDefault(); onChange([...selected, t.id]); setSearch(''); }}
              className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700/60 flex items-center gap-2 transition-colors">
              <Users className="w-3 h-3 text-slate-500" /> {t.name}
            </button>
          ))}
        </div>
      )}
      {open && filtered.length === 0 && search && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#1E293B] border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-500">
          No teams found
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
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = users.filter(u =>
    (u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
     u.email?.toLowerCase().includes(search.toLowerCase())) &&
    !selected.includes(u.id)
  );

  const selectedUsers = users.filter(u => selected.includes(u.id));

  const roleColor = { admin: 'text-purple-400', manager: 'text-cyan-400', employee: 'text-slate-400' };

  return (
    <div ref={ref} className="relative">
      <div
        className={`min-h-[36px] flex flex-wrap gap-1.5 items-center px-2.5 py-1.5 bg-[#0F172A] border rounded-md cursor-text transition-colors ${open ? 'border-cyan-500/50' : 'border-slate-700'}`}
        onClick={() => setOpen(true)}
      >
        {selectedUsers.map(u => (
          <span key={u.id} className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-700 text-slate-200 text-xs rounded-md border border-slate-600">
            <span className="w-4 h-4 rounded-full bg-cyan-500/20 flex items-center justify-center text-[9px] font-bold text-cyan-400">
              {u.fullName?.charAt(0)?.toUpperCase()}
            </span>
            <span>{u.fullName}</span>
            <button type="button" onClick={(e) => { e.stopPropagation(); onChange(selected.filter(id => id !== u.id)); }}
              className="text-slate-400 hover:text-red-400 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <div className="flex items-center gap-1 flex-1 min-w-[100px]">
          <Search className="w-3 h-3 text-slate-600 shrink-0" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={selectedUsers.length === 0 ? 'Search by name or email...' : ''}
            className="bg-transparent text-xs text-slate-200 placeholder:text-slate-600 outline-none flex-1"
          />
        </div>
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#1E293B] border border-slate-700 rounded-md shadow-xl overflow-hidden max-h-44 overflow-y-auto">
          {filtered.map(u => (
            <button key={u.id} type="button"
              onMouseDown={(e) => { e.preventDefault(); onChange([...selected, u.id]); setSearch(''); }}
              className="w-full text-left px-3 py-2 hover:bg-slate-700/60 flex items-center gap-2.5 transition-colors">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px] font-bold text-cyan-400 shrink-0">
                {u.fullName?.charAt(0)?.toUpperCase()}
              </div>
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

const CreateIncidentDialog = ({ open, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [fetchingData, setFetchingData] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'incident',
    priority: 'medium',
    sourceTeamId: '',
    involvedTeamIds: [],
    assignedManagerId: '',
    additionalParticipants: [],
    operationalNotes: '',
    escalationNotes: '',
  });
  const [attachments, setAttachments] = useState([]);

  useEffect(() => {
    if (open) fetchTeamsAndUsers();
  }, [open]);

  const fetchTeamsAndUsers = async () => {
    try {
      setFetchingData(true);
      const [teamsRes, usersRes] = await Promise.all([
        teamAPI.getTeams(),
        userAPI.searchUsers(''),
      ]);
      setTeams(teamsRes.data.data?.teams || teamsRes.data.data || []);
      setUsers(usersRes.data.data?.users || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setFetchingData(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '', description: '', category: 'incident', priority: 'medium',
      sourceTeamId: '', involvedTeamIds: [], assignedManagerId: '',
      additionalParticipants: [], operationalNotes: '', escalationNotes: '',
    });
    setAttachments([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || formData.title.length < 3) {
      toast({ title: 'Validation Error', description: 'Title must be at least 3 characters', variant: 'destructive' });
      return;
    }
    if (!formData.sourceTeamId) {
      toast({ title: 'Validation Error', description: 'Source team is required', variant: 'destructive' });
      return;
    }
    try {
      setLoading(true);
      const payload = {
        ...formData,
        assignedManagerId: formData.assignedManagerId === 'none' ? '' : formData.assignedManagerId,
        attachments,
      };
      await incidentAPI.createManualIncident(payload);
      toast({ title: 'Incident Created', description: 'Incident raised and room initialized' });
      resetForm();
      onSuccess?.();
      onClose();
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.message || 'Failed to create incident';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const managers = users.filter(u => u.role === 'manager' || u.role === 'admin');
  const p = PRIORITY_CONFIG[formData.priority] || PRIORITY_CONFIG.medium;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0F172A] border border-slate-800 text-slate-100 max-w-2xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <DialogTitle className="text-sm font-semibold text-slate-100">Create Incident</DialogTitle>
                <p className="text-[11px] text-slate-500 mt-0.5">Manually escalate an operational incident</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* ── Section 1: Incident Details ── */}
          <div>
            <SectionHeader icon={AlertTriangle} label="Incident Details" index="1" />
            <div className="space-y-3">
              <div>
                <Label className="text-[11px] text-slate-400 font-medium">Title <span className="text-red-400">*</span></Label>
                <Input
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Payment gateway failure in production"
                  className="mt-1 h-8 bg-[#1E293B] border-slate-700 text-slate-100 text-sm placeholder:text-slate-600 focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-400 font-medium">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What happened? What is the impact? What has been tried?"
                  className="mt-1 bg-[#1E293B] border-slate-700 text-slate-100 text-sm placeholder:text-slate-600 min-h-16 resize-none focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] text-slate-400 font-medium">Category</Label>
                  <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                    <SelectTrigger className="mt-1 h-8 bg-[#1E293B] border-slate-700 text-slate-200 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E293B] border-slate-700 text-xs">
                      <SelectItem value="incident">Incident</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                      <SelectItem value="bug">Bug</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px] text-slate-400 font-medium">Priority</Label>
                  <Select value={formData.priority} onValueChange={v => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger className="mt-1 h-8 bg-[#1E293B] border-slate-700 text-slate-200 text-xs">
                      <SelectValue>
                        <span className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${p.dot}`} />
                          <span className={p.color}>{p.label}</span>
                        </span>
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
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800" />

          {/* ── Section 2: Team Assignment ── */}
          <div>
            <SectionHeader icon={Users} label="Team Assignment" index="2" />
            <div className="space-y-3">
              <div>
                <Label className="text-[11px] text-slate-400 font-medium">Source Team <span className="text-red-400">*</span></Label>
                <p className="text-[10px] text-slate-600 mb-1">Team reporting or originating this incident</p>
                <Select value={formData.sourceTeamId} onValueChange={v => setFormData({ ...formData, sourceTeamId: v })} disabled={fetchingData}>
                  <SelectTrigger className="h-8 bg-[#1E293B] border-slate-700 text-slate-200 text-xs">
                    <SelectValue placeholder={fetchingData ? 'Loading...' : 'Select source team'} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E293B] border-slate-700 text-xs">
                    {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] text-slate-400 font-medium">Involved Teams</Label>
                <p className="text-[10px] text-slate-600 mb-1">All teams that will participate in this incident room</p>
                <TeamMultiSelect
                  teams={teams}
                  selected={formData.involvedTeamIds}
                  onChange={ids => setFormData({ ...formData, involvedTeamIds: ids })}
                  disabled={fetchingData}
                />
                {formData.involvedTeamIds.length > 0 && (
                  <p className="text-[10px] text-slate-500 mt-1">{formData.involvedTeamIds.length} team{formData.involvedTeamIds.length > 1 ? 's' : ''} — all members auto-added to incident room</p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800" />

          {/* ── Section 3: Ownership ── */}
          <div>
            <SectionHeader icon={Shield} label="Incident Ownership" index="3" />
            <div className="space-y-3">
              <div>
                <Label className="text-[11px] text-slate-400 font-medium">Assigned Manager</Label>
                <p className="text-[10px] text-slate-600 mb-1">Incident commander / point of contact</p>
                <Select value={formData.assignedManagerId} onValueChange={v => setFormData({ ...formData, assignedManagerId: v })} disabled={fetchingData}>
                  <SelectTrigger className="h-8 bg-[#1E293B] border-slate-700 text-slate-200 text-xs">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E293B] border-slate-700 text-xs">
                    <SelectItem value="none">Unassigned</SelectItem>
                    {managers.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full bg-cyan-500/20 flex items-center justify-center text-[9px] font-bold text-cyan-400">{u.fullName?.charAt(0)}</span>
                          {u.fullName}
                          <span className="text-[10px] text-slate-500 capitalize">({u.role})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] text-slate-400 font-medium">Additional Participants</Label>
                <p className="text-[10px] text-slate-600 mb-1">Specialists, executives, or cross-team responders</p>
                <ParticipantSearch
                  users={users}
                  selected={formData.additionalParticipants}
                  onChange={ids => setFormData({ ...formData, additionalParticipants: ids })}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800" />

          {/* ── Section 4: Evidence ── */}
          <div>
            <SectionHeader icon={Paperclip} label="Evidence Attachments" index="4" />
            <div className="space-y-1.5">
              <p className="text-[10px] text-slate-600 -mt-1 mb-2">Outage screenshots, monitoring alerts, security evidence, or any supporting images</p>
              <EvidenceUploader
                value={attachments}
                onChange={setAttachments}
                disabled={loading}
              />
            </div>
          </div>

          <div className="border-t border-slate-800" />

          {/* ── Section 5: Operational Notes ── */}
          <div>
            <SectionHeader icon={StickyNote} label="Operational Notes" index="5" />
            <div className="space-y-3">
              <div>
                <Label className="text-[11px] text-slate-400 font-medium">Internal Notes</Label>
                <Textarea
                  value={formData.operationalNotes}
                  onChange={e => setFormData({ ...formData, operationalNotes: e.target.value })}
                  placeholder="Context, initial findings, steps taken so far..."
                  className="mt-1 bg-[#1E293B] border-slate-700 text-slate-100 text-sm placeholder:text-slate-600 min-h-14 resize-none focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-400 font-medium">Escalation Notes <span className="text-slate-600">(optional)</span></Label>
                <Textarea
                  value={formData.escalationNotes}
                  onChange={e => setFormData({ ...formData, escalationNotes: e.target.value })}
                  placeholder="Why is this being escalated? Any SLA concerns?"
                  className="mt-1 bg-[#1E293B] border-slate-700 text-slate-100 text-sm placeholder:text-slate-600 min-h-14 resize-none focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-600">
            {formData.involvedTeamIds.length > 0 || formData.additionalParticipants.length > 0
              ? `${formData.involvedTeamIds.length} team(s) · ${formData.additionalParticipants.length} extra participant(s)`
              : 'Incident room will be created on submit'}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}
              className="h-8 px-3 text-xs border-slate-700 text-slate-400 hover:text-slate-200">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !formData.title.trim() || !formData.sourceTeamId}
              className="h-8 px-4 text-xs bg-red-600/90 hover:bg-red-600 text-white border-0">
              {loading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Creating...</> : <><Plus className="w-3.5 h-3.5 mr-1.5" />Create Incident</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateIncidentDialog;

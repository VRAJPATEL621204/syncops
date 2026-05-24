import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users, Search, UserPlus, UserMinus, ChevronDown,
  Building2, Plus, Loader2, RefreshCw, X, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { teamAPI, userAPI } from '@/services/api';
import { toast } from '@/hooks/use-toast';
import DashboardLayout from '@/layouts/DashboardLayout';

const ROLE_CONFIG = {
  admin:    { label: 'Admin',    color: 'bg-purple-500/15 text-purple-400 border-purple-500/25' },
  manager:  { label: 'Manager',  color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25' },
  employee: { label: 'Employee', color: 'bg-slate-500/15 text-slate-400 border-slate-500/25' },
};

const Avatar = ({ user, size = 'md' }) => {
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-[10px]' : size === 'lg' ? 'w-11 h-11 text-base' : 'w-8 h-8 text-xs';
  if (user?.profileImage) {
    return <img src={user.profileImage} alt={user.fullName} className={`${sizeClass} rounded-full object-cover border border-slate-700 shrink-0`} />;
  }
  const initials = user?.fullName?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';
  return (
    <div className={`${sizeClass} rounded-full bg-slate-700/80 border border-slate-600 flex items-center justify-center shrink-0`}>
      <span className="text-slate-300 font-semibold">{initials}</span>
    </div>
  );
};

const RoleBadge = ({ role }) => {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.employee;
  return <Badge variant="outline" className={`text-[10px] font-medium px-1.5 py-0.5 ${cfg.color}`}>{cfg.label}</Badge>;
};

// Add Member panel (shown inline when button clicked)
const AddMemberPanel = ({ team, onAdd, onClose, loading }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef(null);
  const inputRef = useRef(null);
  const existingIds = team.members.map(m => m.id);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await userAPI.searchUsers(q);
      setResults((res.data.data?.users || []).filter(u => !existingIds.includes(u.id)));
    } catch { setResults([]); }
    finally { setSearching(false); }
  }, [existingIds]);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(val), 280);
  };

  const pick = (user) => {
    onAdd(user);
    setQuery('');
    setResults([]);
  };

  return (
    <div className="border-t border-slate-700/60 mt-0 pt-3 pb-1 px-4 bg-slate-800/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Add Member</span>
        <button onClick={onClose} className="p-0.5 text-slate-500 hover:text-slate-300 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {/* Search input */}
      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#0F172A] border border-slate-600 rounded-lg focus-within:border-cyan-500/60 transition-colors">
        <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          placeholder="Search by name or email..."
          className="bg-transparent text-xs text-slate-200 placeholder:text-slate-500 outline-none flex-1 min-w-0"
          disabled={loading}
        />
        {searching && <Loader2 className="w-3 h-3 text-slate-500 animate-spin shrink-0" />}
      </div>
      {/* Results */}
      {results.length > 0 && (
        <div className="mt-1.5 rounded-lg border border-slate-700 overflow-hidden bg-[#1E293B] max-h-44 overflow-y-auto">
          {results.map(u => (
            <button key={u.id} type="button" onClick={() => pick(u)} disabled={loading}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-700/60 transition-colors text-left border-b border-slate-700/50 last:border-0">
              <Avatar user={u} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-200 truncate">{u.fullName}</p>
                <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
              </div>
              <Badge variant="outline" className={`text-[10px] px-1.5 shrink-0 ${ROLE_CONFIG[u.role]?.color || ROLE_CONFIG.employee.color}`}>
                {ROLE_CONFIG[u.role]?.label || 'Employee'}
              </Badge>
            </button>
          ))}
        </div>
      )}
      {query && results.length === 0 && !searching && (
        <p className="text-[11px] text-slate-500 mt-2 text-center">No users found</p>
      )}
    </div>
  );
};

// Team card
const TeamCard = ({ team, canManage, currentUserId, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);

  const handleAdd = async (user) => {
    setAddLoading(true);
    try {
      await teamAPI.addMember({ teamId: team.id, userId: user.id });
      toast({ title: 'Member added', description: `${user.fullName} added to ${team.name}` });
      setShowAddPanel(false);
      onRefresh();
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to add member', variant: 'destructive' });
    } finally { setAddLoading(false); }
  };

  const handleRemove = async (userId, userName) => {
    setRemoveLoading(userId);
    try {
      await teamAPI.removeMember({ teamId: team.id, userId });
      toast({ title: 'Member removed', description: `${userName} removed from ${team.name}` });
      setConfirmRemove(null);
      onRefresh();
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to remove member', variant: 'destructive' });
    } finally { setRemoveLoading(null); }
  };

  return (
    <div className="bg-[hsl(222,47%,7%)] border border-[hsl(217,33%,15%)] rounded-xl overflow-hidden">
      {/* Team header row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-800/30 transition-colors select-none"
        onClick={() => { setExpanded(v => !v); if (!expanded) setShowAddPanel(false); }}
      >
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
          <Users className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-100 truncate">{team.name}</h3>
          {team.description && <p className="text-[11px] text-slate-500 truncate">{team.description}</p>}
        </div>
        <span className="text-[11px] text-slate-500 shrink-0">{team.members.length} member{team.members.length !== 1 ? 's' : ''}</span>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} />
      </div>

      {/* Expanded: member list */}
      {expanded && (
        <div className="border-t border-[hsl(217,33%,12%)]">
          {/* Member rows */}
          <div className="divide-y divide-[hsl(217,33%,11%)]">
            {team.members.map(member => (
              <div key={member.id} className="flex items-center gap-3 px-4 py-2.5">
                <Avatar user={member} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-slate-200 truncate">{member.fullName}</span>
                    {member.id === currentUserId && (
                      <span className="text-[9px] text-cyan-400 font-semibold shrink-0">YOU</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">{member.email}</p>
                </div>
                <Badge variant="outline" className={`text-[10px] px-1.5 shrink-0 ${ROLE_CONFIG[member.role]?.color || ROLE_CONFIG.employee.color}`}>
                  {ROLE_CONFIG[member.role]?.label || 'Employee'}
                </Badge>
                {/* Remove button — always visible for managers/admins, not for self */}
                {canManage && member.id !== currentUserId && (
                  confirmRemove === member.id ? (
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      <button
                        onClick={() => handleRemove(member.id, member.fullName)}
                        disabled={removeLoading === member.id}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-red-500/20 text-red-400 border border-red-500/40 rounded-md hover:bg-red-500/30 transition-colors disabled:opacity-50"
                      >
                        {removeLoading === member.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <><Check className="w-3 h-3" /> Confirm</>
                        }
                      </button>
                      <button
                        onClick={() => setConfirmRemove(null)}
                        className="px-2 py-1 text-[10px] text-slate-400 bg-slate-700/60 border border-slate-600 rounded-md hover:bg-slate-600/60 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmRemove(member.id); }}
                      className="shrink-0 ml-1 flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-red-400 bg-red-500/10 border border-red-500/25 rounded-md hover:bg-red-500/20 transition-colors"
                    >
                      <UserMinus className="w-3 h-3" />
                      Remove
                    </button>
                  )
                )}
              </div>
            ))}
            {team.members.length === 0 && (
              <p className="text-xs text-slate-600 text-center py-5">No members yet</p>
            )}
          </div>

          {/* Add member panel or button */}
          {canManage && (
            showAddPanel ? (
              <AddMemberPanel team={team} onAdd={handleAdd} onClose={() => setShowAddPanel(false)} loading={addLoading} />
            ) : (
              <div className="px-4 py-2.5 border-t border-[hsl(217,33%,12%)]">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowAddPanel(true); }}
                  className="flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 px-2.5 py-1.5 rounded-md border border-cyan-500/25 bg-cyan-500/5 hover:bg-cyan-500/10 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add Member
                </button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

// Create team dialog (admin only)
const CreateTeamDialog = ({ open, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      toast({ title: 'Validation', description: 'Team name must be at least 2 characters', variant: 'destructive' });
      return;
    }
    try {
      setLoading(true);
      await teamAPI.createTeam({ name: name.trim(), description: description.trim() || undefined });
      toast({ title: 'Team created', description: `${name.trim()} is ready` });
      setName(''); setDescription('');
      onCreated();
      onClose();
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to create team', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0F172A] border border-slate-800 text-slate-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="w-4 h-4 text-cyan-400" />
            Create New Team
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-1">
          <div>
            <label className="text-[11px] text-slate-400 font-medium">Team Name *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Backend Engineering"
              className="mt-1 h-8 bg-[#1E293B] border-slate-700 text-slate-100 text-sm" />
          </div>
          <div>
            <label className="text-[11px] text-slate-400 font-medium">Description <span className="text-slate-600">(optional)</span></label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this team do?"
              className="mt-1 h-8 bg-[#1E293B] border-slate-700 text-slate-100 text-sm" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="h-8 text-xs border-slate-700 text-slate-400">Cancel</Button>
            <Button type="submit" disabled={loading} className="h-8 text-xs bg-cyan-600 hover:bg-cyan-500">
              {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />}
              Create Team
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function TeamPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const canManage = isAdmin || isManager;

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const res = await teamAPI.getTeams();
      setTeams(res.data.data || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load teams', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchTeams(); }, []);

  const filtered = teams.filter(t =>
    !search ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Teams</h1>
            <p className="text-sm text-slate-500 mt-1">
              {isAdmin ? 'All organization teams' : isManager ? 'Your teams' : 'Your memberships'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchTeams} title="Refresh"
              className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors rounded-md hover:bg-slate-700/50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {isAdmin && (
              <Button onClick={() => setShowCreate(true)} size="sm"
                className="h-8 text-xs bg-cyan-600 hover:bg-cyan-500 text-white gap-1">
                <Plus className="w-3.5 h-3.5" /> New Team
              </Button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-2">
          <Card className="bg-[#1E293B] border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-cyan-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-100">{teams.length}</p>
                  <p className="text-xs text-slate-500">Total Teams</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#1E293B] border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-100">{new Set(teams.flatMap(t => t.members.map(m => m.id))).size}</p>
                  <p className="text-xs text-slate-500">Total Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#1E293B] border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-100">{teams.filter(t => t.members.some(m => m.id === user?.id)).length}</p>
                  <p className="text-xs text-slate-500">Your Teams</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search teams..."
            className="pl-9 h-8 bg-[hsl(222,47%,7%)] border-[hsl(217,33%,15%)] text-slate-200 text-sm placeholder:text-slate-600 focus-visible:border-cyan-500/50" />
        </div>

        {/* Team list */}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">{search ? 'No teams match your search' : 'No teams yet'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(team => (
              <TeamCard
                key={team.id}
                team={team}
                canManage={canManage && (isAdmin || team.members.some(m => m.id === user?.id))}
                currentUserId={user?.id}
                onRefresh={fetchTeams}
              />
            ))}
          </div>
        )}
      </div>

      {isAdmin && (
        <CreateTeamDialog open={showCreate} onClose={() => setShowCreate(false)} onCreated={fetchTeams} />
      )}
    </DashboardLayout>
  );
}

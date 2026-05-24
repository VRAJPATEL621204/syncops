import { useState, useEffect } from 'react';
import {
  Building2, Search, Users, UserMinus, Loader2,
  Mail, Phone, Shield, Briefcase, RefreshCw, AlertTriangle, Calendar
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { teamAPI } from '@/services/api';
import { toast } from '@/hooks/use-toast';
import DashboardLayout from '@/layouts/DashboardLayout';

const ROLE_CONFIG = {
  admin:    { label: 'Admin',    color: 'bg-purple-500/15 text-purple-400 border-purple-500/25', icon: Shield },
  manager:  { label: 'Manager',  color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25', icon: Briefcase },
  employee: { label: 'Employee', color: 'bg-slate-500/15 text-slate-400 border-slate-500/25', icon: Users },
};

const Avatar = ({ user, size = 'md' }) => {
  const sz = size === 'lg' ? 'w-11 h-11 text-base' : 'w-9 h-9 text-xs';
  if (user?.profileImage) {
    return <img src={user.profileImage} alt={user.fullName} className={`${sz} rounded-full object-cover border border-slate-700 shrink-0`} />;
  }
  const initials = user?.fullName?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';
  return (
    <div className={`${sz} rounded-full bg-[hsl(217,33%,14%)] border border-slate-700 flex items-center justify-center shrink-0`}>
      <span className="text-slate-300 font-semibold text-[11px]">{initials}</span>
    </div>
  );
};

const RoleBadge = ({ role }) => {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.employee;
  return <Badge variant="outline" className={`text-[10px] font-medium px-1.5 py-0.5 ${cfg.color}`}>{cfg.label}</Badge>;
};

const RemoveConfirmDialog = ({ user: target, open, onClose, onConfirm, loading }) => (
  <Dialog open={open} onOpenChange={onClose}>
    <DialogContent className="bg-[#0F172A] border border-slate-800 text-slate-100 max-w-sm">
      <DialogHeader>
        <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-4 h-4" />
          Remove from Organization
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 mt-1">
        <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <Avatar user={target} />
          <div>
            <p className="text-sm font-medium text-slate-200">{target?.fullName}</p>
            <p className="text-xs text-slate-500">{target?.email}</p>
          </div>
        </div>
        <div className="space-y-2 text-xs text-slate-400">
          <p className="font-medium text-slate-300">This will immediately:</p>
          <ul className="space-y-1 pl-3">
            <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-red-400 shrink-0" />Remove from all teams</li>
            <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-red-400 shrink-0" />Remove from all chat rooms</li>
            <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-red-400 shrink-0" />Revoke platform access</li>
          </ul>
          <p className="text-slate-600 mt-2">Historical messages and incident logs are preserved.</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="h-8 text-xs border-slate-700 text-slate-400">Cancel</Button>
          <Button onClick={onConfirm} disabled={loading}
            className="h-8 text-xs bg-red-600/80 hover:bg-red-600 text-white border-0">
            {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <UserMinus className="w-3 h-3 mr-1" />}
            Remove Member
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

export default function OrganizationPage() {
  const { user: currentUser } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await teamAPI.getOrgMembers();
      setMembers(res.data.data || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load organization members', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchMembers(); }, []);

  const handleRemove = async () => {
    if (!confirmTarget) return;
    try {
      setRemoveLoading(true);
      await teamAPI.removeFromOrg({ userId: confirmTarget.id });
      toast({ title: 'Member removed', description: `${confirmTarget.fullName} has been removed from the organization` });
      setConfirmTarget(null);
      fetchMembers();
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to remove member', variant: 'destructive' });
    } finally { setRemoveLoading(false); }
  };

  // Derived filters
  const allTeams = [...new Map(
    members.flatMap(m => m.teams).map(t => [t.id, t])
  ).values()];

  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      m.fullName?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.phoneNumber?.includes(q);
    const matchRole = roleFilter === 'all' || m.role === roleFilter;
    const matchTeam = teamFilter === 'all' || m.teams.some(t => t.id === teamFilter);
    return matchSearch && matchRole && matchTeam;
  });

  const stats = {
    total: members.length,
    admins: members.filter(m => m.role === 'admin').length,
    managers: members.filter(m => m.role === 'manager').length,
    employees: members.filter(m => m.role === 'employee').length,
  };

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-400" />
              Organization
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Enterprise employee directory &amp; access management</p>
          </div>
          <button onClick={fetchMembers} className="self-start sm:self-auto p-1.5 text-slate-400 hover:text-slate-200 transition-colors" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Members', value: stats.total, color: 'text-slate-100' },
            { label: 'Admins', value: stats.admins, color: 'text-purple-400' },
            { label: 'Managers', value: stats.managers, color: 'text-cyan-400' },
            { label: 'Employees', value: stats.employees, color: 'text-slate-400' },
          ].map(s => (
            <div key={s.label} className="bg-[hsl(222,47%,7%)] border border-[hsl(217,33%,15%)] rounded-xl p-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className="pl-9 h-9 bg-[hsl(222,47%,7%)] border-[hsl(217,33%,15%)] text-slate-200 text-sm placeholder:text-slate-600 focus-visible:border-cyan-500/50"
            />
          </div>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="h-9 px-3 text-xs bg-[hsl(222,47%,7%)] border border-[hsl(217,33%,15%)] text-slate-300 rounded-md focus:outline-none focus:border-cyan-500/50"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="employee">Employee</option>
          </select>
          {allTeams.length > 0 && (
            <select
              value={teamFilter}
              onChange={e => setTeamFilter(e.target.value)}
              className="h-9 px-3 text-xs bg-[hsl(222,47%,7%)] border border-[hsl(217,33%,15%)] text-slate-300 rounded-md focus:outline-none focus:border-cyan-500/50"
            >
              <option value="all">All Teams</option>
              {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
        </div>

        {/* Result count */}
        <p className="text-[11px] text-slate-500">
          Showing {filtered.length} of {members.length} members
          {(search || roleFilter !== 'all' || teamFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setRoleFilter('all'); setTeamFilter('all'); }}
              className="ml-2 text-cyan-400 hover:underline">Clear filters</button>
          )}
        </p>

        {/* Member Table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-slate-400 font-medium">No members found</p>
            <p className="text-slate-600 text-xs mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="bg-[hsl(222,47%,7%)] border border-[hsl(217,33%,15%)] rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[2fr_2fr_1fr_2fr_auto] gap-4 px-4 py-2.5 border-b border-[hsl(217,33%,12%)]">
              {['Member', 'Contact', 'Role', 'Teams', ''].map(h => (
                <span key={h} className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{h}</span>
              ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-[hsl(217,33%,11%)]">
              {filtered.map(member => (
                <div key={member.id}
                  className="grid sm:grid-cols-[2fr_2fr_1fr_2fr_auto] gap-4 items-center px-4 py-3 hover:bg-[hsl(217,33%,10%)] transition-colors group">

                  {/* Member */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar user={member} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-slate-200 truncate">{member.fullName}</span>
                        {member.id === currentUser?.id && (
                          <span className="text-[9px] text-cyan-400 font-medium shrink-0">(you)</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-2.5 h-2.5" />
                        Joined {new Date(member.joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
                      <Mail className="w-3 h-3 text-slate-600 shrink-0" />
                      {member.email}
                    </p>
                    {member.phoneNumber && (
                      <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-600 shrink-0" />
                        {member.phoneNumber}
                      </p>
                    )}
                  </div>

                  {/* Role */}
                  <div>
                    <RoleBadge role={member.role} />
                  </div>

                  {/* Teams */}
                  <div className="flex flex-wrap gap-1">
                    {member.teams.length === 0 ? (
                      <span className="text-[10px] text-slate-600 italic">No teams</span>
                    ) : (
                      member.teams.slice(0, 3).map(t => (
                        <span key={t.id}
                          className="text-[10px] px-1.5 py-0.5 bg-slate-700/60 text-slate-400 rounded border border-slate-600/50">
                          {t.name}
                        </span>
                      ))
                    )}
                    {member.teams.length > 3 && (
                      <span className="text-[10px] text-slate-600">+{member.teams.length - 3}</span>
                    )}
                  </div>

                  {/* Action */}
                  <div className="flex justify-end">
                    {member.id !== currentUser?.id && (
                      <button
                        onClick={() => setConfirmTarget(member)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all"
                        title="Remove from organization"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <RemoveConfirmDialog
        user={confirmTarget}
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleRemove}
        loading={removeLoading}
      />
    </DashboardLayout>
  );
}

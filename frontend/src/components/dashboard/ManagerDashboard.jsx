import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, AlertTriangle, CheckCircle, Clock, MessageSquare, UserPlus,
  Loader2, Users2, BarChart2, Activity, ChevronRight
} from 'lucide-react';
import { incidentAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import InviteModal from '@/components/modals/InviteModal';
import { teamAPI } from '@/services/api';
import { toast } from '@/hooks/use-toast';

// ── Shared status/priority helpers (same design system as Admin) ─────────────
const STATUS_CFG = {
  open: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-400', label: 'Open' },
  in_progress: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', dot: 'bg-blue-400', label: 'In Progress' },
  resolved: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400', label: 'Resolved' },
  report_pending: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', dot: 'bg-yellow-400', label: 'Pending' },
  rejected: { text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', dot: 'bg-slate-400', label: 'Rejected' },
};
const PRIORITY_CFG = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/20',
  high: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  medium: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  low: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

const MStatusPill = ({ status }) => {
  const c = STATUS_CFG[status] || STATUS_CFG.open;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
};
const MPriorityPill = ({ priority }) => (
  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border ${PRIORITY_CFG[priority] || PRIORITY_CFG.low}`}>
    {priority}
  </span>
);

// ── Donut chart (SVG) ────────────────────────────────────────────────────────
const MDonutChart = ({ segments, size = 110 }) => {
  const r = 38; const cx = size / 2; const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let off = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circ;
        const el = <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth="9"
          strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-off} className="transition-all duration-700" />;
        off += dash;
        return el;
      })}
      <circle cx={cx} cy={cy} r={r - 5} fill="#0a0f1a" />
    </svg>
  );
};

// ── KPI card ─────────────────────────────────────────────────────────────────
const MKpiCard = ({ label, value, icon: Icon, iconColor, bgColor, loading, onClick }) => (
  <div onClick={onClick} className={`group bg-[hsl(222,47%,7%)] border border-[hsl(217,33%,12%)] rounded-xl p-4 hover:border-[hsl(217,33%,20%)] transition-all ${onClick ? 'cursor-pointer' : ''}`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-slate-100 mt-1.5 tabular-nums">
          {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-500" /> : value}
        </p>
      </div>
      <div className={`w-9 h-9 rounded-lg ${bgColor} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
    </div>
  </div>
);

// ── Main ─────────────────────────────────────────────────────────────────────
const ManagerDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInviteEmployeeOpen, setIsInviteEmployeeOpen] = useState(false);
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    if (!authLoading && user) fetchDashboardData();
  }, [authLoading, user]);

  const fetchDashboardData = async () => {
    try {
      const [teamsRes, incidentsRes] = await Promise.all([
        teamAPI.getTeams(),
        incidentAPI.getIncidents({ limit: 50 }),
      ]);
      setTeams(teamsRes.data.data || []);
      setIncidents(incidentsRes.data.data?.incidents || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load dashboard data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const totalMembers = useMemo(() =>
    new Set(teams.flatMap(t => (t.members || []).map(m => m.id))).size,
  [teams]);
  const activeIncidents = incidents.filter(i => i.status === 'open' || i.status === 'in_progress').length;
  const pendingReviews = incidents.filter(i => i.status === 'report_pending').length;
  const resolvedIncidents = incidents.filter(i => i.status === 'resolved').length;
  const rejectedIncidents = incidents.filter(i => i.status === 'rejected').length;

  const donutSegments = [
    { label: 'Open', value: incidents.filter(i => i.status === 'open').length, color: '#f59e0b' },
    { label: 'In Progress', value: incidents.filter(i => i.status === 'in_progress').length, color: '#3b82f6' },
    { label: 'Resolved', value: resolvedIncidents, color: '#10b981' },
    { label: 'Pending', value: pendingReviews, color: '#eab308' },
    { label: 'Rejected', value: rejectedIncidents, color: '#64748b' },
  ].filter(s => s.value > 0);

  const last7Days = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return { label: d.toLocaleDateString('en', { weekday: 'short' }), date: d.toDateString(), open: 0, resolved: 0 };
    });
    incidents.forEach(inc => {
      const day = days.find(d => new Date(inc.createdAt).toDateString() === d.date);
      if (day) {
        if (inc.status === 'open' || inc.status === 'in_progress') day.open++;
        if (inc.status === 'resolved') day.resolved++;
      }
    });
    return days;
  }, [incidents]);

  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="space-y-5">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Team Live
            </span>
            {pendingReviews > 0 && (
              <span className="text-[11px] font-medium text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded px-2 py-0.5">
                {pendingReviews} Pending Review
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">Hello, {user?.fullName?.split(' ')[0]}</h1>
          <p className="text-sm text-slate-500 mt-0.5">Managing active team escalations</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <p className="text-[11px] text-slate-600">{dateStr}</p>
          <div className="flex gap-2 mt-1">
            <button onClick={() => setIsInviteEmployeeOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/15 transition-colors">
              <UserPlus className="w-3.5 h-3.5" /> Invite Employee
            </button>
            <button onClick={fetchDashboardData}
              className="p-1.5 text-slate-500 hover:text-slate-300 bg-slate-700/30 border border-slate-700/50 rounded-lg hover:bg-slate-700/60 transition-colors">
              <Clock className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── KPIs ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <MKpiCard label="Team Members" value={loading ? null : totalMembers} icon={Users} iconColor="text-blue-400" bgColor="bg-blue-500/10" loading={loading} onClick={() => navigate('/teams')} />
        <MKpiCard label="Active" value={loading ? null : activeIncidents} icon={AlertTriangle} iconColor="text-amber-400" bgColor="bg-amber-500/10" loading={loading} onClick={() => navigate('/incidents')} />
        <MKpiCard label="Pending Review" value={loading ? null : pendingReviews} icon={Clock} iconColor="text-yellow-400" bgColor="bg-yellow-500/10" loading={loading} onClick={() => navigate('/incidents')} />
        <MKpiCard label="Resolved" value={loading ? null : resolvedIncidents} icon={CheckCircle} iconColor="text-emerald-400" bgColor="bg-emerald-500/10" loading={loading} />
        <MKpiCard label="Teams" value={loading ? null : teams.length} icon={Users2} iconColor="text-cyan-400" bgColor="bg-cyan-500/10" loading={loading} />
      </div>

      {/* ── Charts ───────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Bar chart */}
        <div className="lg:col-span-2 bg-[hsl(222,47%,7%)] border border-[hsl(217,33%,12%)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-200">Team Incident Load</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Last 7 days — active vs resolved</p>
            </div>
            <BarChart2 className="w-4 h-4 text-slate-600" />
          </div>
          {loading ? <div className="h-40 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-600" /></div>
          : incidents.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center gap-2">
              <Activity className="w-6 h-6 text-slate-700" />
              <p className="text-xs text-slate-600">No incidents to chart yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-end gap-2" style={{ height: '110px' }}>
                {last7Days.map((d, i) => {
                  const max = Math.max(...last7Days.map(x => Math.max(x.open, x.resolved)), 1);
                  return (
                    <div key={i} className="flex-1 flex items-end gap-0.5" style={{ height: '110px' }}>
                      <div className="flex-1 bg-amber-500/60 rounded hover:bg-amber-400/80 transition-colors"
                        style={{ height: `${Math.max((d.open / max) * 104, d.open > 0 ? 4 : 0)}px` }} />
                      <div className="flex-1 bg-emerald-500/60 rounded hover:bg-emerald-400/80 transition-colors"
                        style={{ height: `${Math.max((d.resolved / max) * 104, d.resolved > 0 ? 4 : 0)}px` }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex">{last7Days.map((d, i) => <div key={i} className="flex-1 text-center text-[10px] text-slate-600">{d.label}</div>)}</div>
              <div className="flex items-center gap-4 pt-1 border-t border-slate-800">
                <span className="flex items-center gap-1.5 text-[11px] text-slate-500"><span className="w-2.5 h-2 rounded-sm bg-amber-500/60" />Active</span>
                <span className="flex items-center gap-1.5 text-[11px] text-slate-500"><span className="w-2.5 h-2 rounded-sm bg-emerald-500/60" />Resolved</span>
              </div>
            </div>
          )}
        </div>

        {/* Donut */}
        <div className="bg-[hsl(222,47%,7%)] border border-[hsl(217,33%,12%)] rounded-xl p-4">
          <div className="mb-4">
            <p className="text-sm font-semibold text-slate-200">Status Breakdown</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Incident distribution</p>
          </div>
          {loading ? <div className="h-40 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-600" /></div>
          : incidents.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center gap-2">
              <Activity className="w-6 h-6 text-slate-700" />
              <p className="text-xs text-slate-600">No data yet</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="relative shrink-0">
                <MDonutChart segments={donutSegments.length ? donutSegments : [{ value: 1, color: '#1e293b' }]} size={110} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-slate-200">{incidents.length}</span>
                </div>
              </div>
              <div className="space-y-2 w-full">
                {donutSegments.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.color }} />
                      <span className="text-slate-400">{s.label}</span>
                    </div>
                    <span className="font-semibold text-slate-300 tabular-nums">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Main grid: Incidents + Team ───────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Team Incidents */}
        <div className="lg:col-span-2 bg-[hsl(222,47%,7%)] border border-[hsl(217,33%,12%)] rounded-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(217,33%,12%)]">
            <div>
              <p className="text-sm font-semibold text-slate-200">Active Incidents</p>
              <p className="text-[11px] text-slate-500">Open & in-progress across your teams</p>
            </div>
            <button onClick={() => navigate('/incidents')} className="flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-3 space-y-1">
            {loading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-600" /></div>
            : incidents.filter(i => i.status === 'open' || i.status === 'in_progress').length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2">
                <CheckCircle className="w-8 h-8 text-emerald-700" />
                <p className="text-sm text-slate-500 font-medium">No active incidents</p>
                <p className="text-[11px] text-slate-600">Your team is clear</p>
              </div>
            ) : incidents.filter(i => i.status === 'open' || i.status === 'in_progress').slice(0, 6).map(inc => (
              <div key={inc.id} onClick={() => navigate(`/incidents/${inc.id}`)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(217,33%,10%)] transition-colors cursor-pointer group">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_CFG[inc.status]?.dot || 'bg-slate-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate group-hover:text-slate-100">{inc.title}</p>
                  <p className="text-[10px] text-slate-600">{inc.sourceTeam?.name || 'Unassigned'} · {new Date(inc.createdAt).toLocaleDateString()}</p>
                </div>
                <MPriorityPill priority={inc.priority} />
                <MStatusPill status={inc.status} />
                <ChevronRight className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-500 transition-colors" />
              </div>
            ))}
          </div>
        </div>

        {/* Team Roster */}
        <div className="bg-[hsl(222,47%,7%)] border border-[hsl(217,33%,12%)] rounded-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(217,33%,12%)]">
            <p className="text-sm font-semibold text-slate-200">Team Roster</p>
            <button onClick={() => setIsInviteEmployeeOpen(true)} className="flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
              <UserPlus className="w-3 h-3" /> Invite
            </button>
          </div>
          <div className="p-2 max-h-72 overflow-y-auto space-y-3">
            {loading ? <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-slate-600" /></div>
            : teams.length === 0 ? (
              <div className="flex flex-col items-center py-6 gap-2">
                <Users className="w-6 h-6 text-slate-700" />
                <p className="text-xs text-slate-500">No team assigned</p>
              </div>
            ) : teams.map(team => (
              <div key={team.id}>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 py-1">{team.name}</p>
                {team.members?.map(member => (
                  <div key={member.id} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[hsl(217,33%,10%)] transition-colors">
                    <div className="w-7 h-7 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-cyan-400">
                        {member.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-300 truncate">{member.fullName}</p>
                      <p className="text-[10px] text-slate-600 capitalize">{member.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Pending Reviews ───────────────────────────────────────────── */}
      {pendingReviews > 0 && (
        <div className="bg-[hsl(222,47%,7%)] border border-yellow-500/20 rounded-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-yellow-500/10">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-400" />
              <p className="text-sm font-semibold text-slate-200">Pending Reviews</p>
              <span className="text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded px-1.5 py-0.5">{pendingReviews}</span>
            </div>
            <button onClick={() => navigate('/incidents')} className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300">
              Review all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-3 space-y-1">
            {incidents.filter(i => i.status === 'report_pending').slice(0, 4).map(inc => (
              <div key={inc.id} onClick={() => navigate(`/incidents/${inc.id}`)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(217,33%,10%)] cursor-pointer group transition-colors">
                <Clock className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                <p className="flex-1 text-sm text-slate-300 truncate group-hover:text-slate-100">{inc.title}</p>
                <MPriorityPill priority={inc.priority} />
                <span className="text-[10px] text-slate-600">{new Date(inc.createdAt).toLocaleDateString()}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-500" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      <div className="bg-[hsl(222,47%,7%)] border border-[hsl(217,33%,12%)] rounded-xl p-4">
        <p className="text-sm font-semibold text-slate-200 mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Review Requests', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10 hover:bg-yellow-500/15 border-yellow-500/20', action: () => navigate('/incidents') },
            { label: 'Open Chat', icon: MessageSquare, color: 'text-cyan-400', bg: 'bg-cyan-500/10 hover:bg-cyan-500/15 border-cyan-500/20', action: () => navigate('/chat') },
            { label: 'Invite Employee', icon: UserPlus, color: 'text-blue-400', bg: 'bg-blue-500/10 hover:bg-blue-500/15 border-blue-500/20', action: () => setIsInviteEmployeeOpen(true) },
            { label: 'Manage Teams', icon: Users2, color: 'text-purple-400', bg: 'bg-purple-500/10 hover:bg-purple-500/15 border-purple-500/20', action: () => navigate('/teams') },
          ].map((item, i) => (
            <button key={i} onClick={item.action}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors ${item.bg}`}>
              <item.icon className={`w-5 h-5 ${item.color}`} />
              <span className="text-[11px] font-medium text-slate-400 text-center leading-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <InviteModal isOpen={isInviteEmployeeOpen} onClose={() => setIsInviteEmployeeOpen(false)} onSuccess={fetchDashboardData} defaultRole="employee" />
    </div>
  );
};

export default ManagerDashboard;

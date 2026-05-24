import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, AlertTriangle, Plus, UserPlus, Loader2,
  Users2, Clock, CheckCircle, TrendingUp, Activity, ArrowRight,
  Shield, Zap, BarChart2, RefreshCw, ChevronRight
} from 'lucide-react';
import { incidentAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import CreateTeamModal from '@/components/modals/CreateTeamModal';
import InviteModal from '@/components/modals/InviteModal';
import IncidentCreateModal from '@/components/modals/IncidentCreateModal';
import { teamAPI, inviteAPI } from '@/services/api';
import { toast } from '@/hooks/use-toast';

// ── Shared helpers ──────────────────────────────────────────────────────────
const STATUS_COLOR = {
  open: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-400', label: 'Open' },
  in_progress: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', dot: 'bg-blue-400', label: 'In Progress' },
  resolved: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400', label: 'Resolved' },
  report_pending: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', dot: 'bg-yellow-400', label: 'Pending' },
  rejected: { text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', dot: 'bg-slate-400', label: 'Rejected' },
};
const PRIORITY_COLOR = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/20',
  high: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  medium: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  low: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

const StatusPill = ({ status }) => {
  const c = STATUS_COLOR[status] || STATUS_COLOR.open;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
};

const PriorityPill = ({ priority }) => (
  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border ${PRIORITY_COLOR[priority] || PRIORITY_COLOR.low}`}>
    {priority}
  </span>
);

// ── Inline donut chart (SVG, no lib) ────────────────────────────────────────
const DonutChart = ({ segments, size = 116 }) => {
  const r = 40;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      {total === 0 ? (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth="11" />
      ) : segments.map((seg, i) => {
        const dash = (seg.value / total) * circumference;
        const gap = circumference - dash;
        const el = (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="11"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            className="transition-all duration-700"
          />
        );
        offset += dash;
        return el;
      })}
      <circle cx={cx} cy={cy} r={r - 5} fill="#0a0f1a" />
    </svg>
  );
};

// ── KPI Card ────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, icon: Icon, iconColor, bgColor, loading, trend, onClick }) => (
  <div
    onClick={onClick}
    className={`group relative bg-[hsl(222,47%,7%)] border border-[hsl(217,33%,12%)] rounded-xl p-4 hover:border-[hsl(217,33%,20%)] transition-all duration-200 ${onClick ? 'cursor-pointer hover:bg-[hsl(222,47%,8%)]' : ''}`}
  >
    <div className="flex items-start justify-between">
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-slate-100 mt-1.5 tabular-nums">
          {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-500" /> : value}
        </p>
        {trend !== undefined && !loading && (
          <p className="text-[10px] text-slate-500 mt-1">{trend}</p>
        )}
      </div>
      <div className={`w-9 h-9 rounded-lg ${bgColor} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
        <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
      </div>
    </div>
  </div>
);

// ── Main component ───────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [teams, setTeams] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isInviteManagerOpen, setIsInviteManagerOpen] = useState(false);
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    if (!authLoading && user) fetchDashboardData();
  }, [authLoading, user]);

  const fetchDashboardData = async () => {
    try {
      const [teamsRes, invitesRes, incidentsRes] = await Promise.all([
        teamAPI.getTeams(),
        inviteAPI.listInvites(),
        incidentAPI.getIncidents({ limit: 100 }),
      ]);
      setIncidents(incidentsRes.data.data?.incidents || []);
      setTeams(teamsRes.data.data || []);
      setInvites(invitesRes.data.data?.invites || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load dashboard data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ── Derived metrics ────────────────────────────────────────────────────────
  const totalUsers = useMemo(() =>
    new Set(teams.flatMap(t => (t.members || []).map(m => m.id))).size || 1,
  [teams]);
  const activeIncidents = incidents.filter(i => i.status === 'open' || i.status === 'in_progress').length;
  const resolvedIncidents = incidents.filter(i => i.status === 'resolved').length;
  const pendingReviews = incidents.filter(i => i.status === 'report_pending').length;
  const rejectedIncidents = incidents.filter(i => i.status === 'rejected').length;

  // ── Bar chart: last 7 incidents by day ────────────────────────────────────
  const last7Days = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { label: d.toLocaleDateString('en', { weekday: 'short' }), date: d.toDateString(), created: 0, resolved: 0 };
    });
    incidents.forEach(inc => {
      const day = days.find(d => new Date(inc.createdAt).toDateString() === d.date);
      if (day) day.created++;
      if (inc.status === 'resolved') {
        const rDay = days.find(d => new Date(inc.updatedAt || inc.createdAt).toDateString() === d.date);
        if (rDay) rDay.resolved++;
      }
    });
    return days;
  }, [incidents]);

  // ── Donut: incident distribution by status ────────────────────────────────
  const donutSegments = [
    { label: 'Open', value: incidents.filter(i => i.status === 'open').length, color: '#f59e0b' },
    { label: 'In Progress', value: incidents.filter(i => i.status === 'in_progress').length, color: '#3b82f6' },
    { label: 'Resolved', value: resolvedIncidents, color: '#10b981' },
    { label: 'Pending', value: pendingReviews, color: '#eab308' },
    { label: 'Rejected', value: rejectedIncidents, color: '#64748b' },
  ].filter(s => s.value > 0);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="space-y-5">
      {/* ── Command Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Operations Live
            </span>
            {activeIncidents > 0 && (
              <span className="text-[11px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2 py-0.5">
                {activeIncidents} Active
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">
            Hello, {user?.fullName?.split(' ')[0]}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Monitoring organization-wide operations</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Building2 className="w-3 h-3" />
            <span className="font-medium text-slate-400">{user?.organization?.name || 'Organization'}</span>
          </div>
          <p className="text-[11px] text-slate-600">{dateStr}</p>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => setIsCreateTeamOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/15 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Create Team
            </button>
            <button
              onClick={() => setIsInviteManagerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-700/50 border border-slate-600/30 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" /> Invite
            </button>
            <button
              onClick={fetchDashboardData}
              className="p-1.5 text-slate-500 hover:text-slate-300 bg-slate-700/30 border border-slate-700/50 rounded-lg hover:bg-slate-700/60 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Total Users" value={loading ? null : totalUsers} icon={Users} iconColor="text-blue-400" bgColor="bg-blue-500/10" loading={loading} />
        <KpiCard label="Teams" value={loading ? null : teams.length} icon={Users2} iconColor="text-cyan-400" bgColor="bg-cyan-500/10" loading={loading} onClick={() => navigate('/teams')} />
        <KpiCard label="Active" value={loading ? null : activeIncidents} icon={AlertTriangle} iconColor="text-amber-400" bgColor="bg-amber-500/10" loading={loading} onClick={() => navigate('/incidents')} />
        <KpiCard label="Resolved" value={loading ? null : resolvedIncidents} icon={CheckCircle} iconColor="text-emerald-400" bgColor="bg-emerald-500/10" loading={loading} />
        <KpiCard label="Pending Review" value={loading ? null : pendingReviews} icon={Clock} iconColor="text-yellow-400" bgColor="bg-yellow-500/10" loading={loading} onClick={() => navigate('/incidents')} />
        <KpiCard label="Rejected" value={loading ? null : rejectedIncidents} icon={Shield} iconColor="text-slate-400" bgColor="bg-slate-500/10" loading={loading} />
      </div>

      {/* ── Charts Row ────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Chart 1: 7-day activity bars */}
        <div className="lg:col-span-2 bg-[hsl(222,47%,7%)] border border-[hsl(217,33%,12%)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-200">Incident Activity</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Last 7 days — created vs resolved</p>
            </div>
            <BarChart2 className="w-4 h-4 text-slate-600" />
          </div>
          {loading ? (
            <div className="h-44 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
            </div>
          ) : incidents.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center gap-2">
              <Activity className="w-6 h-6 text-slate-700" />
              <p className="text-xs text-slate-600">No incidents to chart yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-end gap-2 h-32">
                {last7Days.map((d, i) => {
                  const max = Math.max(...last7Days.map(x => Math.max(x.created, x.resolved)), 1);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className="w-full flex items-end gap-0.5" style={{ height: '120px' }}>
                        <div className="flex-1 bg-amber-500/60 rounded transition-all duration-500 hover:bg-amber-400/80"
                          style={{ height: `${Math.max((d.created / max) * 114, d.created > 0 ? 4 : 0)}px` }} />
                        <div className="flex-1 bg-emerald-500/60 rounded transition-all duration-500 hover:bg-emerald-400/80"
                          style={{ height: `${Math.max((d.resolved / max) * 114, d.resolved > 0 ? 4 : 0)}px` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between">
                {last7Days.map((d, i) => (
                  <div key={i} className="flex-1 text-center text-[10px] text-slate-600">{d.label}</div>
                ))}
              </div>
              <div className="flex items-center gap-4 pt-1 border-t border-slate-800">
                <span className="flex items-center gap-1.5 text-[11px] text-slate-500"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500/60" />Created</span>
                <span className="flex items-center gap-1.5 text-[11px] text-slate-500"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/60" />Resolved</span>
              </div>
            </div>
          )}
        </div>

        {/* Chart 2: Donut distribution */}
        <div className="bg-[hsl(222,47%,7%)] border border-[hsl(217,33%,12%)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-200">Status Distribution</p>
              <p className="text-[11px] text-slate-500 mt-0.5">All incidents by status</p>
            </div>
            <TrendingUp className="w-4 h-4 text-slate-600" />
          </div>
          {loading ? (
            <div className="h-44 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
            </div>
          ) : incidents.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center gap-2">
              <Activity className="w-6 h-6 text-slate-700" />
              <p className="text-xs text-slate-600">No data yet</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="relative shrink-0">
                <DonutChart segments={donutSegments} size={116} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-slate-200">{incidents.length}</span>
                </div>
              </div>
              <div className="space-y-2 w-full">
                {donutSegments.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                      <span className="text-slate-400 truncate">{s.label}</span>
                    </div>
                    <span className="font-semibold text-slate-300 tabular-nums">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Main content: Incidents + Teams ──────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Recent Incidents */}
        <div className="lg:col-span-2 bg-[hsl(222,47%,7%)] border border-[hsl(217,33%,12%)] rounded-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(217,33%,12%)]">
            <div>
              <p className="text-sm font-semibold text-slate-200">Recent Incidents</p>
              <p className="text-[11px] text-slate-500">Latest operational issues across the org</p>
            </div>
            <button
              onClick={() => navigate('/incidents')}
              className="flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-3 space-y-1">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-600" /></div>
            ) : incidents.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2">
                <AlertTriangle className="w-8 h-8 text-slate-700" />
                <p className="text-sm text-slate-500 font-medium">No incidents reported yet</p>
                <button onClick={() => setIsIncidentOpen(true)} className="text-xs text-cyan-400 hover:text-cyan-300">
                  Create first incident →
                </button>
              </div>
            ) : incidents.slice(0, 6).map(inc => (
              <div
                key={inc.id}
                onClick={() => navigate(`/incidents/${inc.id}`)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(217,33%,10%)] transition-colors cursor-pointer group"
              >
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_COLOR[inc.status]?.dot || 'bg-slate-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate group-hover:text-slate-100">{inc.title}</p>
                  <p className="text-[10px] text-slate-600">{inc.sourceTeam?.name || 'Unassigned'} · {new Date(inc.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <PriorityPill priority={inc.priority} />
                  <StatusPill status={inc.status} />
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-500 transition-colors" />
              </div>
            ))}
          </div>
        </div>

        {/* Teams + Org Health */}
        <div className="space-y-4">
          {/* Org Health */}
          <div className="bg-[hsl(222,47%,7%)] border border-[hsl(217,33%,12%)] rounded-xl p-4">
            <p className="text-sm font-semibold text-slate-200 mb-3">Organization Health</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Teams', value: teams.length, color: 'text-cyan-400' },
                { label: 'Members', value: totalUsers, color: 'text-blue-400' },
                { label: 'Active Incidents', value: activeIncidents, color: activeIncidents > 0 ? 'text-amber-400' : 'text-emerald-400' },
                { label: 'Pending Reviews', value: pendingReviews, color: pendingReviews > 0 ? 'text-yellow-400' : 'text-slate-500' },
              ].map((item, i) => (
                <div key={i} className="bg-[hsl(217,33%,10%)] rounded-lg p-2.5">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">{item.label}</p>
                  <p className={`text-lg font-bold tabular-nums mt-0.5 ${item.color}`}>
                    {loading ? '—' : item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Teams list */}
          <div className="bg-[hsl(222,47%,7%)] border border-[hsl(217,33%,12%)] rounded-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(217,33%,12%)]">
              <p className="text-sm font-semibold text-slate-200">Teams</p>
              <button
                onClick={() => setIsCreateTeamOpen(true)}
                className="flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <Plus className="w-3 h-3" /> New
              </button>
            </div>
            <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-slate-600" /></div>
              ) : teams.length === 0 ? (
                <div className="flex flex-col items-center py-6 gap-1.5">
                  <Users2 className="w-6 h-6 text-slate-700" />
                  <p className="text-xs text-slate-500">No teams yet</p>
                </div>
              ) : teams.map(team => (
                <div
                  key={team.id}
                  onClick={() => navigate('/teams')}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[hsl(217,33%,10%)] transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                    <Users2 className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-300 truncate">{team.name}</p>
                    <p className="text-[10px] text-slate-600">{team.memberCount || team.members?.length || 0} members</p>
                  </div>
                </div>
              ))}
            </div>
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
              Review all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-3 space-y-1">
            {incidents.filter(i => i.status === 'report_pending').slice(0, 4).map(inc => (
              <div
                key={inc.id}
                onClick={() => navigate(`/incidents/${inc.id}`)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(217,33%,10%)] transition-colors cursor-pointer group"
              >
                <Clock className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                <p className="flex-1 text-sm text-slate-300 truncate group-hover:text-slate-100">{inc.title}</p>
                <PriorityPill priority={inc.priority} />
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
            { label: 'Create Team', icon: Plus, color: 'text-cyan-400', bg: 'bg-cyan-500/10 hover:bg-cyan-500/15 border-cyan-500/20', action: () => setIsCreateTeamOpen(true) },
            { label: 'Invite Member', icon: UserPlus, color: 'text-blue-400', bg: 'bg-blue-500/10 hover:bg-blue-500/15 border-blue-500/20', action: () => setIsInviteManagerOpen(true) },
            { label: 'Incident Queue', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10 hover:bg-yellow-500/15 border-yellow-500/20', action: () => navigate('/incidents') },
            { label: 'Organization', icon: Building2, color: 'text-purple-400', bg: 'bg-purple-500/10 hover:bg-purple-500/15 border-purple-500/20', action: () => navigate('/organization') },
          ].map((item, i) => (
            <button
              key={i}
              onClick={item.action}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors ${item.bg}`}
            >
              <item.icon className={`w-5 h-5 ${item.color}`} />
              <span className="text-[11px] font-medium text-slate-400 text-center leading-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Modals */}
      <CreateTeamModal
        isOpen={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
        onSuccess={(newTeam) => { setTeams(prev => [newTeam, ...prev]); }}
      />
      <InviteModal
        isOpen={isInviteManagerOpen}
        onClose={() => setIsInviteManagerOpen(false)}
        onSuccess={fetchDashboardData}
        defaultRole="manager"
      />
    </div>
  );
};

export default AdminDashboard;

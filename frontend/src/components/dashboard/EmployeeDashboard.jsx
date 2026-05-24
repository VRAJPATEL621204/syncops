import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, Clock, MessageSquare, AlertTriangle, Loader2,
  Users, ChevronRight, BarChart2, Activity, TrendingUp, RefreshCw
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { teamAPI, incidentAPI } from '@/services/api';

// ── Status/Priority helpers ──────────────────────────────────────────────────
const E_STATUS = {
  open: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-400', label: 'Open' },
  in_progress: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', dot: 'bg-blue-400', label: 'In Progress' },
  resolved: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400', label: 'Resolved' },
  report_pending: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', dot: 'bg-yellow-400', label: 'Pending' },
  rejected: { text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', dot: 'bg-slate-400', label: 'Rejected' },
};
const E_PRIORITY = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/20',
  high: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  medium: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  low: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

const EStatusPill = ({ status }) => {
  const c = E_STATUS[status] || E_STATUS.open;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
};
const EPriorityPill = ({ priority }) => (
  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border ${E_PRIORITY[priority] || E_PRIORITY.low}`}>
    {priority}
  </span>
);

// ── Donut (SVG) ──────────────────────────────────────────────────────────────
const EDonut = ({ segments, size = 110 }) => {
  const r = 38, cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let off = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circ;
        const el = <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth="9"
          strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-off} />;
        off += dash;
        return el;
      })}
      <circle cx={cx} cy={cy} r={r - 5} fill="#0a0f1a" />
    </svg>
  );
};

// ── KPI card ─────────────────────────────────────────────────────────────────
const EKpiCard = ({ label, value, icon: Icon, iconColor, bgColor, loading, onClick }) => (
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
const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState([]);
  useEffect(() => {
    if (!authLoading && user) fetchEmployeeData();
  }, [authLoading, user]);

  const fetchEmployeeData = async () => {
    try {
      const [teamsRes, incidentsRes] = await Promise.all([
        teamAPI.getTeams(),
        incidentAPI.getIncidents({ limit: 50 }),
      ]);
      setTeams(teamsRes.data.data || []);
      setIncidents(incidentsRes.data.data?.incidents || []);
    } catch (error) {
      console.error('Fetch employee data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeIncidents = incidents.filter(i => i.status === 'open' || i.status === 'in_progress').length;
  const resolvedIncidents = incidents.filter(i => i.status === 'resolved').length;
  const pendingIncidents = incidents.filter(i => i.status === 'report_pending').length;
  const rejectedIncidents = incidents.filter(i => i.status === 'rejected').length;

  const donutSegments = [
    { label: 'Open', value: incidents.filter(i => i.status === 'open').length, color: '#f59e0b' },
    { label: 'In Progress', value: incidents.filter(i => i.status === 'in_progress').length, color: '#3b82f6' },
    { label: 'Resolved', value: resolvedIncidents, color: '#10b981' },
    { label: 'Pending', value: pendingIncidents, color: '#eab308' },
    { label: 'Rejected', value: rejectedIncidents, color: '#64748b' },
  ].filter(s => s.value > 0);

  // 7-day weekly activity
  const last7Days = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return { label: d.toLocaleDateString('en', { weekday: 'short' }), date: d.toDateString(), count: 0 };
    });
    incidents.forEach(inc => {
      const day = days.find(d => new Date(inc.createdAt).toDateString() === d.date);
      if (day) day.count++;
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
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded px-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Workspace Active
            </span>
            {activeIncidents > 0 && (
              <span className="text-[11px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-0.5">
                {activeIncidents} Active
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">Hello, {user?.fullName?.split(' ')[0]}</h1>
          <p className="text-sm text-slate-500 mt-0.5">Tracking your assigned incidents and rooms</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <p className="text-[11px] text-slate-600">{dateStr}</p>
          <div className="flex gap-2 mt-1">
            <button onClick={() => navigate('/chat')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/15 transition-colors">
              <MessageSquare className="w-3.5 h-3.5" /> Open Chat
            </button>
            <button onClick={fetchEmployeeData}
              className="p-1.5 text-slate-500 hover:text-slate-300 bg-slate-700/30 border border-slate-700/50 rounded-lg hover:bg-slate-700/60 transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── KPIs ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <EKpiCard label="Active" value={loading ? null : activeIncidents} icon={AlertTriangle} iconColor="text-amber-400" bgColor="bg-amber-500/10" loading={loading} onClick={() => navigate('/incidents')} />
        <EKpiCard label="Resolved" value={loading ? null : resolvedIncidents} icon={CheckCircle} iconColor="text-emerald-400" bgColor="bg-emerald-500/10" loading={loading} />
        <EKpiCard label="Pending" value={loading ? null : pendingIncidents} icon={Clock} iconColor="text-yellow-400" bgColor="bg-yellow-500/10" loading={loading} />
        <EKpiCard label="Total" value={loading ? null : incidents.length} icon={BarChart2} iconColor="text-blue-400" bgColor="bg-blue-500/10" loading={loading} />
        <EKpiCard label="My Teams" value={loading ? null : teams.length} icon={Users} iconColor="text-cyan-400" bgColor="bg-cyan-500/10" loading={loading} onClick={() => navigate('/teams')} />
      </div>

      {/* ── Charts ───────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Weekly activity bars */}
        <div className="lg:col-span-2 bg-[hsl(222,47%,7%)] border border-[hsl(217,33%,12%)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-200">My Incident Activity</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Last 7 days — incidents created</p>
            </div>
            <TrendingUp className="w-4 h-4 text-slate-600" />
          </div>
          {loading ? <div className="h-40 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-600" /></div>
          : incidents.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center gap-2">
              <Activity className="w-6 h-6 text-slate-700" />
              <p className="text-xs text-slate-600">No activity yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-end gap-2" style={{ height: '110px' }}>
                {last7Days.map((d, i) => {
                  const max = Math.max(...last7Days.map(x => x.count), 1);
                  return (
                    <div key={i} className="flex-1" style={{ height: '110px', display: 'flex', alignItems: 'flex-end' }}>
                      <div className="w-full bg-cyan-500/50 rounded hover:bg-cyan-400/70 transition-colors"
                        style={{ height: `${Math.max((d.count / max) * 104, d.count > 0 ? 4 : 0)}px` }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex">{last7Days.map((d, i) => <div key={i} className="flex-1 text-center text-[10px] text-slate-600">{d.label}</div>)}</div>
            </div>
          )}
        </div>

        {/* Donut */}
        <div className="bg-[hsl(222,47%,7%)] border border-[hsl(217,33%,12%)] rounded-xl p-4">
          <div className="mb-4">
            <p className="text-sm font-semibold text-slate-200">My Status Mix</p>
            <p className="text-[11px] text-slate-500 mt-0.5">All incidents by status</p>
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
                <EDonut segments={donutSegments.length ? donutSegments : [{ value: 1, color: '#1e293b' }]} size={110} />
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

      {/* ── My Incidents + My Teams ───────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* My Incidents */}
        <div className="lg:col-span-2 bg-[hsl(222,47%,7%)] border border-[hsl(217,33%,12%)] rounded-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(217,33%,12%)]">
            <div>
              <p className="text-sm font-semibold text-slate-200">My Incidents</p>
              <p className="text-[11px] text-slate-500">Incidents you reported or were assigned</p>
            </div>
            <button onClick={() => navigate('/incidents')} className="flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-3 space-y-1">
            {loading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-600" /></div>
            : incidents.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2">
                <AlertTriangle className="w-8 h-8 text-slate-700" />
                <p className="text-sm text-slate-500 font-medium">No incidents reported yet</p>
                <button onClick={() => navigate('/incidents')} className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                  Go to incidents →
                </button>
              </div>
            ) : incidents.slice(0, 6).map(inc => (
              <div key={inc.id} onClick={() => navigate(`/incidents/${inc.id}`)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(217,33%,10%)] transition-colors cursor-pointer group">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${E_STATUS[inc.status]?.dot || 'bg-slate-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate group-hover:text-slate-100">{inc.title}</p>
                  <p className="text-[10px] text-slate-600">{inc.sourceTeam?.name || 'No team'} · {new Date(inc.createdAt).toLocaleDateString()}</p>
                </div>
                <EPriorityPill priority={inc.priority} />
                <EStatusPill status={inc.status} />
                <ChevronRight className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-500 transition-colors" />
              </div>
            ))}
          </div>
        </div>

        {/* My Teams */}
        <div className="bg-[hsl(222,47%,7%)] border border-[hsl(217,33%,12%)] rounded-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(217,33%,12%)]">
            <p className="text-sm font-semibold text-slate-200">My Teams</p>
            <button onClick={() => navigate('/teams')} className="flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
              View <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-2 max-h-72 overflow-y-auto space-y-1">
            {loading ? <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-slate-600" /></div>
            : teams.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <Users className="w-7 h-7 text-slate-700" />
                <p className="text-xs text-slate-500 font-medium">Not in any teams yet</p>
                <p className="text-[10px] text-slate-600">Contact your manager</p>
              </div>
            ) : teams.map(team => (
              <div key={team.id} className="p-3 rounded-lg hover:bg-[hsl(217,33%,10%)] transition-colors cursor-pointer" onClick={() => navigate('/teams')}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-300 truncate">{team.name}</p>
                    <p className="text-[10px] text-slate-600">{team.members?.length || 0} members</p>
                  </div>
                </div>
                {team.members && team.members.length > 0 && (
                  <div className="flex items-center gap-1 mt-2 ml-10.5">
                    {team.members.slice(0, 4).map((m, i) => (
                      <div key={m.id || i} className="w-5 h-5 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-[9px] font-bold text-slate-300" title={m.fullName}>
                        {m.fullName?.charAt(0) || '?'}
                      </div>
                    ))}
                    {team.members.length > 4 && <span className="text-[10px] text-slate-600">+{team.members.length - 4}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      <div className="bg-[hsl(222,47%,7%)] border border-[hsl(217,33%,12%)] rounded-xl p-4">
        <p className="text-sm font-semibold text-slate-200 mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { label: 'Open Chat', icon: MessageSquare, color: 'text-cyan-400', bg: 'bg-cyan-500/10 hover:bg-cyan-500/15 border-cyan-500/20', action: () => navigate('/chat') },
            { label: 'View Teams', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10 hover:bg-blue-500/15 border-blue-500/20', action: () => navigate('/teams') },
            { label: 'View History', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/20', action: () => navigate('/incidents') },
          ].map((item, i) => (
            <button key={i} onClick={item.action}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors ${item.bg}`}>
              <item.icon className={`w-5 h-5 ${item.color}`} />
              <span className="text-[11px] font-medium text-slate-400 text-center leading-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};

export default EmployeeDashboard;

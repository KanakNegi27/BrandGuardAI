import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardService } from '../services/api';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import SeverityBadge from '../components/SeverityBadge';
import {
  Files,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Activity,
  PlusCircle,
  FileText
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsRes, actRes] = await Promise.all([
          dashboardService.getStats(),
          dashboardService.getActivity()
        ]);
        setStats(statsRes.data);
        setActivity(actRes.data.activity || []);
      } catch (err) {
        console.error("Dashboard data load error:", err);
        setError('Failed to load dashboard statistics.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Loading BrandGuard AI Dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Brand Governance Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time compliance monitoring, review queues, and automated content analysis.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/workspace"
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Analyze New Content</span>
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Submissions"
          value={stats?.total_submissions || 0}
          subtitle="Across all channels"
          icon={Files}
          color="blue"
        />
        <StatCard
          title="Pending Reviews"
          value={stats?.pending_reviews || 0}
          subtitle="Awaiting human decision"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Approved Content"
          value={stats?.approved_submissions || 0}
          subtitle="Eligible for publication"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Changes Required"
          value={stats?.changes_required_submissions || 0}
          subtitle="Returned to creators"
          icon={RotateCcw}
          color="purple"
        />
        <StatCard
          title="High-Risk Findings"
          value={stats?.high_risk_findings || 0}
          subtitle={`${stats?.critical_findings || 0} critical issues`}
          icon={ShieldAlert}
          color="rose"
        />
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Content Approval & Review Velocity</h3>
              <p className="text-xs text-slate-500">Submissions processed vs approved over time</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md">
              Live Database
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.approval_trend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="submittedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f766e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="approvedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="submitted" name="Submissions" stroke="#0f766e" strokeWidth={2} fillOpacity={1} fill="url(#submittedGrad)" />
                <Area type="monotone" dataKey="approved" name="Approved" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#approvedGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Issue Categories Bar Chart */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Most Common Violations</h3>
            <p className="text-xs text-slate-500">Distribution by issue category</p>
          </div>
          <div className="h-64 w-full">
            {stats?.issue_categories && stats.issue_categories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.issue_categories} layout="vertical" margin={{ top: 5, right: 20, left: 35, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={10} allowDecimals={false} />
                  <YAxis type="category" dataKey="category" stroke="#94a3b8" fontSize={10} width={90} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" name="Issues Detected" fill="#0f766e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No issue findings recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Submissions & Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Submissions Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Content Submissions</h3>
              <p className="text-xs text-slate-500">Latest material submitted for brand review</p>
            </div>
            <Link to="/submissions" className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1">
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Title & Campaign</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Creator</th>
                  <th className="px-4 py-3">Issues</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats?.recent_submissions && stats.recent_submissions.length > 0 ? (
                  stats.recent_submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-900 block truncate max-w-xs">{sub.title}</span>
                        <span className="text-[10px] text-slate-400 block">{sub.campaign_name || 'General Campaign'}</span>
                      </td>
                      <td className="px-4 py-3 capitalize">{sub.publishing_channel}</td>
                      <td className="px-4 py-3">{sub.creator_name}</td>
                      <td className="px-4 py-3">
                        {sub.issue_count > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-800">{sub.issue_count}</span>
                            {sub.critical_count > 0 && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-100 text-rose-800 font-bold">
                                {sub.critical_count} Crit
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-emerald-600 font-medium">Clean</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={sub.current_status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/submissions/${sub.id}`}
                          className="text-xs font-semibold text-teal-700 hover:text-teal-900 underline"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-slate-400 text-xs">
                      No submissions found. Create your first draft in the workspace!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Audit Activity Feed */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-700" />
                <h3 className="text-sm font-bold text-slate-900">Recent Audit Trail</h3>
              </div>
              <Link to="/audit" className="text-xs font-semibold text-teal-700 hover:text-teal-800">
                Full Log
              </Link>
            </div>

            <div className="space-y-3.5">
              {activity && activity.length > 0 ? (
                activity.slice(0, 6).map((item) => (
                  <div key={item.id} className="flex items-start gap-2.5 text-xs">
                    <div className="w-2 h-2 rounded-full bg-teal-600 mt-1.5 shrink-0"></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-1">
                        <span className="font-semibold text-slate-800 truncate">
                          {item.event_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        By {item.actor_name} ({item.actor_role})
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">No recent activity recorded.</p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <Link
              to="/reviews"
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
            >
              <span>View Review Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

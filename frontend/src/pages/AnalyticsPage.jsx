import React, { useState, useEffect } from 'react';
import { analyticsService } from '../services/api';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {
  BarChart3,
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  FileText
} from 'lucide-react';

const SEVERITY_COLORS = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#f59e0b',
  Low: '#3b82f6',
};

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [overview, setOverview] = useState(null);
  const [findingsData, setFindingsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const [oRes, fRes] = await Promise.all([
          analyticsService.getOverview(days),
          analyticsService.getFindings()
        ]);
        setOverview(oRes.data);
        setFindingsData(fRes.data);
      } catch (err) {
        console.error("Error loading analytics:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [days]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-500">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mr-3"></div>
        <span>Aggregating analytics data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header & Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-100 text-teal-800 uppercase tracking-wider">
              Executive Intelligence
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Governance Analytics Hub</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Empirical compliance trends, violation frequency, and review operational velocity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-600 shadow-xs"
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* KPI Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Average Review Turnaround</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {overview?.avg_turnaround_hours || 0} hrs
            </span>
            <span className="text-xs text-slate-500">submission to decision</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Based on {overview?.total_decisions_recorded || 0} recorded decisions</p>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Approved Submissions</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600 tracking-tight">
              {overview?.status_breakdown?.Approved || 0}
            </span>
            <span className="text-xs text-slate-500">compliant releases</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Verified with human approval signature</p>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Revisions Requested</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600 tracking-tight">
              {overview?.status_breakdown?.['Changes Required'] || 0}
            </span>
            <span className="text-xs text-slate-500">returned to creators</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Prevented non-compliant brand publishing</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Approvals vs Changes Requested */}
        <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Approval vs. Change-Request Trends</h3>
          <p className="text-xs text-slate-500 mb-4">Volume of approvals compared to revision requests</p>
          <div className="h-64 w-full">
            {overview?.approval_trend && overview.approval_trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview.approval_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="approved" name="Approved" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="changes_requested" name="Changes Requested" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No trend decisions recorded in this timeframe.
              </div>
            )}
          </div>
        </div>

        {/* Findings by Category */}
        <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Violations by Issue Category</h3>
          <p className="text-xs text-slate-500 mb-4">Frequency of brand & compliance findings</p>
          <div className="h-64 w-full">
            {findingsData?.findings_by_category && findingsData.findings_by_category.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={findingsData.findings_by_category} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={10} allowDecimals={false} />
                  <YAxis type="category" dataKey="category" stroke="#94a3b8" fontSize={10} width={90} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                  <Bar dataKey="count" name="Violations" fill="#0f766e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No category violations recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Findings by Severity (Donut Chart) */}
        <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Findings Severity Distribution</h3>
          <p className="text-xs text-slate-500 mb-4">Breakdown by risk severity tier</p>
          <div className="h-64 w-full">
            {findingsData?.findings_by_severity && findingsData.findings_by_severity.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={findingsData.findings_by_severity}
                    dataKey="count"
                    nameKey="severity"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {findingsData.findings_by_severity.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.severity] || '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No findings to display.
              </div>
            )}
          </div>
        </div>

        {/* Top Violated Guidelines Ranking */}
        <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Most Frequently Violated Guidelines</h3>
            <p className="text-xs text-slate-500 mb-4">Guidelines triggering the highest volume of detections</p>

            <div className="space-y-3">
              {findingsData?.top_violated_guidelines && findingsData.top_violated_guidelines.length > 0 ? (
                findingsData.top_violated_guidelines.map((g, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono font-bold text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded text-[10px]">
                        {g.code}
                      </span>
                      <span className="font-medium text-slate-800 truncate">{g.title}</span>
                    </div>
                    <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[11px] shrink-0">
                      {g.count} time{g.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 py-6 text-center">
                  No guideline violations recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

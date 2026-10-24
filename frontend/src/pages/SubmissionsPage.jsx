import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { submissionService } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import {
  Search,
  Filter,
  PlusCircle,
  Clock,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  FileText
} from 'lucide-react';

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [contentType, setContentType] = useState('');
  const [severity, setSeverity] = useState('');
  const [sort, setSort] = useState('newest');

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await submissionService.list({
        search,
        status,
        content_type: contentType,
        severity,
        sort,
        page,
        limit: 10
      });
      setSubmissions(res.data.submissions || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.total_pages || 1);
    } catch (err) {
      console.error("Error fetching submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [page, status, contentType, severity, sort]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchSubmissions();
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Content Submissions</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Explore, filter, and audit marketing content submissions across all departments.
          </p>
        </div>
        <Link
          to="/workspace"
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Submission</span>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search submissions by title or campaign name..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-600 text-slate-900"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
            >
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Changes Required">Changes Required</option>
              <option value="Escalated">Escalated</option>
              <option value="Approved">Approved</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Content Type
            </label>
            <select
              value={contentType}
              onChange={(e) => {
                setContentType(e.target.value);
                setPage(1);
              }}
              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
            >
              <option value="">All Types</option>
              <option value="advertisement">Advertisement</option>
              <option value="email">Email</option>
              <option value="social_media_post">Social Media</option>
              <option value="product_description">Product Description</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Risk Filter
            </label>
            <select
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value);
                setPage(1);
              }}
              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
            >
              <option value="">Any Severity</option>
              <option value="Critical">Has Critical Issues</option>
              <option value="High">Has High-Risk Issues</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Sort By
            </label>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="risk">High Risk Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Submission Details</th>
                <th className="px-4 py-3.5">Type & Channel</th>
                <th className="px-4 py-3.5">Author</th>
                <th className="px-4 py-3.5">Revisions</th>
                <th className="px-4 py-3.5">Findings</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading submissions...
                  </td>
                </tr>
              ) : submissions.length > 0 ? (
                submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <Link to={`/submissions/${sub.id}`} className="font-bold text-slate-900 hover:text-teal-700 block text-sm">
                        {sub.title}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        <span>{sub.campaign_name || 'Standard Release'}</span>
                        <span>•</span>
                        <span>{new Date(sub.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span className="capitalize block font-medium text-slate-800">{sub.content_type?.replace(/_/g, ' ')}</span>
                      <span className="capitalize text-[11px] text-slate-400 block">{sub.publishing_channel}</span>
                    </td>

                    <td className="px-4 py-4">
                      <span className="font-medium text-slate-800 block">{sub.creator_name}</span>
                      <span className="text-[10px] text-slate-400 block">{sub.creator_email}</span>
                    </td>

                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        v{sub.version_count || 1}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      {sub.issue_count > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900">{sub.issue_count} total</span>
                          {sub.critical_count > 0 && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-100 text-rose-800 font-bold">
                              {sub.critical_count} Crit
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-emerald-700 font-semibold">0 issues</span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <StatusBadge status={sub.current_status} />
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/submissions/${sub.id}`}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                        >
                          View
                        </Link>
                        <Link
                          to={`/workspace?id=${sub.id}`}
                          className="px-2.5 py-1 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors"
                        >
                          Workspace
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    No submissions matched the specified criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total submissions)
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-100 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

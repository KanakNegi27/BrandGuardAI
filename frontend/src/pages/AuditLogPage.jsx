import React, { useState, useEffect } from 'react';
import { auditService } from '../services/api';
import Modal from '../components/Modal';
import {
  History,
  Search,
  Filter,
  Shield,
  ChevronLeft,
  ChevronRight,
  Info,
  Calendar,
  User,
  Database
} from 'lucide-react';

export default function AuditLogPage() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('');

  const [selectedEvent, setSelectedEvent] = useState(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await auditService.getEvents({
        search,
        event_type: eventTypeFilter,
        resource_type: resourceTypeFilter,
        page,
        limit: 15
      });
      setEvents(res.data.events || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.total_pages || 1);
    } catch (err) {
      console.error("Error loading audit trail:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [page, eventTypeFilter, resourceTypeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchEvents();
  };

  const getEventBadgeColor = (type) => {
    if (type.includes('APPROVED')) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    if (type.includes('ESCALATED')) return 'bg-purple-50 text-purple-800 border-purple-200';
    if (type.includes('CHANGES_REQUESTED')) return 'bg-amber-50 text-amber-800 border-amber-200';
    if (type.includes('ANALYSIS')) return 'bg-teal-50 text-teal-800 border-teal-200';
    if (type.includes('AUTH')) return 'bg-blue-50 text-blue-800 border-blue-200';
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-800 uppercase tracking-wider">
              Immutable Ledger
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Enterprise Audit Log</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographically sealed, append-only record of all content evaluations, human approvals, and guideline updates.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-xs">
          <Shield className="w-4 h-4 text-teal-600" />
          <span><strong>{total}</strong> verified audit events</span>
        </div>
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
              placeholder="Search audit trail by actor, event type, or resource ID..."
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

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Event Category
            </label>
            <select
              value={eventTypeFilter}
              onChange={(e) => {
                setEventTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 text-slate-800"
            >
              <option value="">All Event Types</option>
              <option value="AUTH_LOGIN">Authentication Logins</option>
              <option value="SUBMISSION_CREATED">Submission Created</option>
              <option value="ANALYSIS_RUN">Analysis Pipeline Executions</option>
              <option value="CONTENT_REVISED">Content Revisions</option>
              <option value="REVIEW_APPROVED">Approvals</option>
              <option value="REVIEW_CHANGES_REQUESTED">Change Requests</option>
              <option value="REVIEW_ESCALATED">Escalations</option>
              <option value="GUIDELINE_CREATED">Guideline Created</option>
              <option value="GUIDELINE_UPDATED">Guideline Updated</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Resource Type
            </label>
            <select
              value={resourceTypeFilter}
              onChange={(e) => {
                setResourceTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 text-slate-800"
            >
              <option value="">All Resources</option>
              <option value="submission">Submission</option>
              <option value="guideline">Guideline</option>
              <option value="rule">Rule</option>
              <option value="user">User</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Events Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3.5">Timestamp</th>
                <th className="px-4 py-3.5">Event Type</th>
                <th className="px-4 py-3.5">Actor</th>
                <th className="px-4 py-3.5">Resource Target</th>
                <th className="px-4 py-3.5">IP Address</th>
                <th className="px-4 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400">
                    Loading immutable audit trail...
                  </td>
                </tr>
              ) : events.length > 0 ? (
                events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                      {new Date(ev.created_at).toLocaleString()}
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getEventBadgeColor(ev.event_type)}`}>
                        {ev.event_type}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-900 block">{ev.actor_name}</span>
                      <span className="text-[10px] text-slate-400 block">{ev.actor_email || ev.actor_role}</span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="capitalize text-slate-800 font-medium">{ev.resource_type}</span>
                      {ev.resource_id && (
                        <span className="text-[11px] text-slate-500 ml-1 font-mono">#{ev.resource_id}</span>
                      )}
                    </td>

                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                      {ev.ip_address || '127.0.0.1'}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedEvent(ev)}
                        className="px-2.5 py-1 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors"
                      >
                        Payload
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400">
                    No audit records match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
            <span>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total records)
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

      {/* Event Payload Inspection Modal */}
      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={`Audit Event Inspection: #${selectedEvent?.id} — ${selectedEvent?.event_type}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Actor</span>
              <strong className="text-slate-800">{selectedEvent?.actor_name} ({selectedEvent?.actor_role})</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Timestamp</span>
              <strong className="text-slate-800">{selectedEvent?.created_at && new Date(selectedEvent.created_at).toISOString()}</strong>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Immutable Event Metadata (JSON)
            </label>
            <pre className="p-3 bg-slate-900 text-teal-400 rounded-lg text-xs font-mono overflow-x-auto max-h-72 leading-relaxed">
              {JSON.stringify(selectedEvent?.metadata || {}, null, 2)}
            </pre>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setSelectedEvent(null)}
              className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

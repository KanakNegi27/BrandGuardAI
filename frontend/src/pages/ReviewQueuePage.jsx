import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reviewService } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import SeverityBadge from '../components/SeverityBadge';
import {
  ClipboardCheck,
  ShieldAlert,
  Clock,
  ArrowRight,
  User,
  AlertOctagon,
  CheckCircle2,
  FileText
} from 'lucide-react';

export default function ReviewQueuePage() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await reviewService.getQueue();
      setQueue(res.data.queue || []);
    } catch (err) {
      console.error("Error loading review queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 uppercase tracking-wider">
              Governance Gate
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Compliance Review Queue</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Material requiring authorized human evaluation prior to publication approval.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-xs">
          <Clock className="w-4 h-4 text-teal-600" />
          <span><strong>{queue.length}</strong> items awaiting evaluation</span>
        </div>
      </div>

      {/* High-risk Priority Queue Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
            <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading review queue...
          </div>
        ) : queue.length > 0 ? (
          queue.map((sub) => {
            const isEscalated = sub.current_status === 'Escalated';
            const hasCritical = sub.critical_count > 0;

            return (
              <div
                key={sub.id}
                className={`p-5 bg-white rounded-xl border transition-all hover:shadow-xs ${
                  isEscalated
                    ? 'border-purple-300 ring-2 ring-purple-100'
                    : hasCritical
                    ? 'border-rose-200 hover:border-rose-300'
                    : 'border-slate-200/90'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={sub.current_status} />
                      <span className="text-xs font-semibold text-slate-500 capitalize">
                        {sub.content_type?.replace(/_/g, ' ')} • {sub.publishing_channel}
                      </span>
                      {hasCritical && (
                        <span className="text-[10px] uppercase font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                          {sub.critical_count} Critical Issue{sub.critical_count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    <Link
                      to={`/submissions/${sub.id}`}
                      className="text-base font-bold text-slate-900 hover:text-teal-700 block truncate"
                    >
                      {sub.title}
                    </Link>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>Submitted by <strong>{sub.creator_name}</strong></span>
                      <span>•</span>
                      <span>Campaign: <strong>{sub.campaign_name || 'Standard Release'}</strong></span>
                      <span>•</span>
                      <span>Date: {new Date(sub.created_at).toLocaleDateString()}</span>
                    </div>

                    {/* Excerpt of current content body */}
                    {sub.current_version?.content_body && (
                      <p className="text-xs text-slate-600 italic line-clamp-2 max-w-3xl pt-1">
                        "{sub.current_version.content_body}"
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <Link
                      to={`/workspace?id=${sub.id}`}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      Inspect in Workspace
                    </Link>

                    <Link
                      to={`/submissions/${sub.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                    >
                      <span>Review & Decide</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-16 text-center bg-white rounded-xl border border-dashed border-slate-200">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900">Review Queue is Clear!</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              All submitted content has been evaluated and approved or returned for creator revision.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

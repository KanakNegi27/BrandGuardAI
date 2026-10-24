import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { submissionService, reviewService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import SeverityBadge from '../components/SeverityBadge';
import Modal from '../components/Modal';
import {
  ArrowLeft,
  Calendar,
  User,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  AlertOctagon,
  FileEdit,
  History,
  AlertTriangle,
  GitBranch,
  Send,
  Info
} from 'lucide-react';

export default function SubmissionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isReviewer, isAdmin } = useAuth();

  const [submission, setSubmission] = useState(null);
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Comment state
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState('general');
  const [postingComment, setPostingComment] = useState(false);

  // Review Decision Modals
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approvalReason, setApprovalReason] = useState('');
  const [allowCriticalException, setAllowCriticalException] = useState(false);
  const [criticalRationale, setCriticalRationale] = useState('');

  const [isChangeRequestModalOpen, setIsChangeRequestModalOpen] = useState(false);
  const [changeReason, setChangeReason] = useState('');

  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');

  const fetchSubmission = async () => {
    try {
      setLoading(true);
      const res = await submissionService.get(id);
      const sub = res.data.submission;
      setSubmission(sub);
      if (!selectedVersionId && sub.current_version_id) {
        setSelectedVersionId(sub.current_version_id);
      } else if (!selectedVersionId && sub.versions?.length > 0) {
        setSelectedVersionId(sub.versions[sub.versions.length - 1].id);
      }
    } catch (err) {
      console.error("Error loading submission:", err);
      setError('Could not retrieve submission details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmission();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-500">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mr-3"></div>
        <span>Loading submission details...</span>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        <p>Submission #{id} not found.</p>
        <Link to="/submissions" className="text-teal-700 font-semibold underline text-sm mt-2 inline-block">
          Return to Submissions
        </Link>
      </div>
    );
  }

  const currentVersion = submission.versions?.find(v => v.id === selectedVersionId) || submission.current_version;
  const openCriticalCount = submission.findings?.filter(f => f.status === 'open' && f.severity === 'Critical').length || 0;

  // Add Comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setPostingComment(true);
    try {
      await reviewService.addComment(submission.id, newComment.trim(), commentType);
      setNewComment('');
      setActionSuccess('Internal review comment added.');
      fetchSubmission();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post comment.');
    } finally {
      setPostingComment(false);
    }
  };

  // Approve Submission
  const handleApprove = async () => {
    try {
      await reviewService.approve(submission.id, {
        reason: approvalReason.trim() || 'Content meets all approved brand guidelines.',
        critical_exception_allowed: allowCriticalException,
        critical_exception_rationale: criticalRationale.trim()
      });
      setIsApproveModalOpen(false);
      setActionSuccess('Submission has been approved for publication!');
      fetchSubmission();
    } catch (err) {
      setError(err.response?.data?.error || 'Approval failed.');
    }
  };

  // Request Changes
  const handleRequestChanges = async () => {
    if (!changeReason.trim()) {
      setError('Please provide a descriptive reason for requesting changes.');
      return;
    }
    try {
      await reviewService.requestChanges(submission.id, changeReason.trim());
      setIsChangeRequestModalOpen(false);
      setActionSuccess('Content returned to creator with change request.');
      fetchSubmission();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to request changes.');
    }
  };

  // Escalate
  const handleEscalate = async () => {
    if (!escalateReason.trim()) {
      setError('Please provide a mandatory escalation reason.');
      return;
    }
    try {
      await reviewService.escalate(submission.id, escalateReason.trim());
      setIsEscalateModalOpen(false);
      setActionSuccess('Submission successfully escalated to legal and executive review.');
      fetchSubmission();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to escalate.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Back and Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/submissions" className="hover:text-slate-800 flex items-center gap-1 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Submissions</span>
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold truncate max-w-sm">{submission.title}</span>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 capitalize">
              {submission.content_type?.replace(/_/g, ' ')}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 capitalize">
              {submission.publishing_channel}
            </span>
            <StatusBadge status={submission.current_status} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{submission.title}</h1>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
            <span>Author: <strong>{submission.creator_name}</strong></span>
            <span>•</span>
            <span>Created: {new Date(submission.created_at).toLocaleString()}</span>
            {submission.assigned_reviewer_name && (
              <>
                <span>•</span>
                <span>Reviewer: <strong>{submission.assigned_reviewer_name}</strong></span>
              </>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/workspace?id=${submission.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            <FileEdit className="w-3.5 h-3.5 text-slate-500" />
            <span>Open in Workspace</span>
          </Link>

          {isReviewer && (
            <>
              <button
                onClick={() => setIsChangeRequestModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Request Changes</span>
              </button>

              <button
                onClick={() => setIsEscalateModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>Escalate</span>
              </button>

              <button
                onClick={() => setIsApproveModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve Content</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Action alerts */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-medium">
          {actionSuccess}
        </div>
      )}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Main Grid: Content & Findings (8 cols) vs Timeline & Comments (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Content & Version History (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Version Tabs */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-teal-700" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Version History ({submission.versions?.length || 1})
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                Active Version: <strong>v{currentVersion?.version_number}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 mt-3 pb-2 overflow-x-auto">
              {submission.versions?.map((ver) => (
                <button
                  key={ver.id}
                  onClick={() => setSelectedVersionId(ver.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all text-left ${
                    selectedVersionId === ver.id
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Version {ver.version_number} ({ver.word_count} words)
                </button>
              ))}
            </div>

            {/* Version Content Display */}
            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 text-sm whitespace-pre-wrap leading-relaxed font-sans">
              {currentVersion?.content_body}
            </div>

            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Author note: {currentVersion?.change_notes || 'Initial version'}</span>
              <span>Committed {new Date(currentVersion?.created_at).toLocaleString()}</span>
            </div>
          </div>

          {/* Active Findings on this Version */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Findings Recorded ({submission.findings?.length || 0})
              </h3>
              {openCriticalCount > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                  {openCriticalCount} Critical barrier(s)
                </span>
              )}
            </div>

            <div className="space-y-3">
              {submission.findings && submission.findings.length > 0 ? (
                submission.findings.map((finding) => (
                  <div key={finding.id} className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={finding.severity} />
                        <span className="font-bold text-slate-800">{finding.issue_category}</span>
                      </div>
                      <span className="text-[10px] uppercase font-semibold text-slate-500">
                        {finding.status}
                      </span>
                    </div>

                    <p className="font-mono bg-white p-1.5 rounded border border-slate-200 text-slate-800">
                      "{finding.affected_text}"
                    </p>
                    <p className="text-slate-600">{finding.explanation}</p>

                    {finding.suggested_correction && (
                      <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-900 italic">
                        Suggested: "{finding.suggested_correction}"
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">No issues flagged on this version.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Decisions & Review Comments (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Review Decision History */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 mb-3">
              Decision History
            </h3>

            <div className="space-y-3">
              {submission.decisions && submission.decisions.length > 0 ? (
                submission.decisions.map((dec) => (
                  <div key={dec.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold capitalize text-slate-800">{dec.decision.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(dec.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-600">By {dec.reviewer_name}</p>
                    {dec.reason && (
                      <p className="text-slate-700 italic border-l-2 border-slate-300 pl-2 mt-1">
                        "{dec.reason}"
                      </p>
                    )}
                    {dec.critical_exception_allowed && (
                      <div className="mt-1 p-1.5 bg-amber-50 text-amber-900 text-[10px] font-semibold rounded">
                        Critical compliance exception granted: {dec.critical_exception_rationale}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-2">No review decisions recorded yet.</p>
              )}
            </div>
          </div>

          {/* Reviewer Comments & Team Discussion */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Reviewer Notes & Feedback
            </h3>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {submission.comments && submission.comments.length > 0 ? (
                submission.comments.map((c) => (
                  <div key={c.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="font-bold text-slate-800">{c.user_name} ({c.user_role})</span>
                      <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{c.comment_text}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-2">No internal review notes yet.</p>
              )}
            </div>

            {/* Comment Post Form */}
            <form onSubmit={handleAddComment} className="pt-2 border-t border-slate-100 space-y-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add an internal reviewer comment or note..."
                rows={2}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
              />
              <div className="flex items-center justify-between">
                <select
                  value={commentType}
                  onChange={(e) => setCommentType(e.target.value)}
                  className="text-[11px] border border-slate-200 rounded-md px-2 py-1 bg-slate-50 text-slate-700"
                >
                  <option value="general">General Note</option>
                  <option value="line_note">Line Note</option>
                  <option value="decision_rationale">Decision Rationale</option>
                </select>

                <button
                  type="submit"
                  disabled={postingComment || !newComment.trim()}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold disabled:opacity-50 transition-colors"
                >
                  <Send className="w-3 h-3" />
                  <span>Post</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Approval Modal with Critical Barrier Check */}
      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        title="Approve Submission for Publication"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            You are granting official approval for <strong>{submission.title}</strong> (Version {currentVersion?.version_number}).
          </p>

          {openCriticalCount > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Critical Compliance Condition Unmet</span>
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                This version has <strong>{openCriticalCount} open Critical finding(s)</strong>. Governance rules forbid publication unless an explicit, justified exception is documented.
              </p>
              <label className="flex items-center gap-2 text-xs font-semibold text-rose-900 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={allowCriticalException}
                  onChange={(e) => setAllowCriticalException(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>Authorize Critical Exception</span>
              </label>

              {allowCriticalException && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-800 mb-1">
                    Mandatory Exception Rationale
                  </label>
                  <textarea
                    rows={2}
                    value={criticalRationale}
                    onChange={(e) => setCriticalRationale(e.target.value)}
                    placeholder="Provide specific legal or clinical justification for overriding critical compliance..."
                    className="w-full text-xs border border-rose-300 rounded-lg p-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500 bg-white"
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Reviewer Approval Notes
            </label>
            <textarea
              rows={2}
              value={approvalReason}
              onChange={(e) => setApprovalReason(e.target.value)}
              placeholder="e.g. Copy verified against approved brand facts and legal disclaimers."
              className="w-full text-xs border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsApproveModalOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleApprove}
              disabled={openCriticalCount > 0 && (!allowCriticalException || criticalRationale.trim().length < 10)}
              className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Confirm Approval
            </button>
          </div>
        </div>
      </Modal>

      {/* Request Changes Modal */}
      <Modal
        isOpen={isChangeRequestModalOpen}
        onClose={() => setIsChangeRequestModalOpen(false)}
        title="Request Revisions from Creator"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Specify the required adjustments before this content can be approved. The submission will return to <strong>Changes Required</strong>.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Required Changes & Feedback
            </label>
            <textarea
              rows={3}
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="e.g. Please eliminate absolute claims and include the mandatory clinical study disclaimer."
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsChangeRequestModalOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleRequestChanges}
              className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors"
            >
              Submit Change Request
            </button>
          </div>
        </div>
      </Modal>

      {/* Escalate Modal */}
      <Modal
        isOpen={isEscalateModalOpen}
        onClose={() => setIsEscalateModalOpen(false)}
        title="Escalate Submission to Legal & Executive Review"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Flag this submission for elevated risk review. An explicit reason is required and will be permanently recorded in the immutable audit log.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Escalation Reason
            </label>
            <textarea
              rows={3}
              value={escalateReason}
              onChange={(e) => setEscalateReason(e.target.value)}
              placeholder="e.g. Potential regulatory violation regarding unauthorized clinical efficacy claim."
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsEscalateModalOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleEscalate}
              className="px-4 py-1.5 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg shadow-xs transition-colors"
            >
              Confirm Escalation
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

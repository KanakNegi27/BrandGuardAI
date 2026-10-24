import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { submissionService, findingService, reviewService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import PassageHighlighter from '../components/PassageHighlighter';
import VersionDiffModal from '../components/VersionDiffModal';
import Modal from '../components/Modal';
import {
  Sparkles,
  UploadCloud,
  Save,
  Send,
  GitCompare,
  Check,
  X,
  Edit3,
  AlertCircle,
  FileText,
  Layers,
  ChevronRight,
  ShieldAlert,
  Info,
  CheckCircle2,
  Cpu
} from 'lucide-react';

export default function WorkspaceEditorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const subIdParam = searchParams.get('id');
  const { user } = useAuth();

  // Submission state
  const [submissionId, setSubmissionId] = useState(subIdParam ? Number(subIdParam) : null);
  const [submission, setSubmission] = useState(null);
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState('social_media_post');
  const [channel, setChannel] = useState('instagram');
  const [campaign, setCampaign] = useState('');
  const [contentBody, setContentBody] = useState('');
  const [activeVersionId, setActiveVersionId] = useState(null);
  const [versions, setVersions] = useState([]);

  // Findings state
  const [findings, setFindings] = useState([]);
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  // UI state
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analysisMeta, setAnalysisMeta] = useState(null);
  const [viewMode, setViewMode] = useState('editor'); // 'editor' | 'preview'
  const [isDiffOpen, setIsDiffOpen] = useState(false);

  // Modals state
  const [isDismissModalOpen, setIsDismissModalOpen] = useState(false);
  const [dismissReason, setDismissReason] = useState('');
  const [findingToDismiss, setFindingToDismiss] = useState(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [findingToEdit, setFindingToEdit] = useState(null);

  const [submitSuccess, setSubmitSuccess] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef(null);

  // Load existing submission if ID is present
  useEffect(() => {
    if (submissionId) {
      loadSubmission(submissionId);
    }
  }, [submissionId]);

  const loadSubmission = async (id) => {
    try {
      const res = await submissionService.get(id);
      const sub = res.data.submission;
      setSubmission(sub);
      setTitle(sub.title);
      setContentType(sub.content_type);
      setChannel(sub.publishing_channel);
      setCampaign(sub.campaign_name || '');
      setVersions(sub.versions || []);

      if (sub.current_version) {
        setContentBody(sub.current_version.content_body);
        setActiveVersionId(sub.current_version.id);
      }

      setFindings(sub.findings || []);
      setAnalysisMeta(sub.latest_analysis_run || null);
    } catch (err) {
      console.error("Error loading submission:", err);
      setErrorMessage('Could not load submission data.');
    }
  };

  // Word & Char counts
  const wordCount = contentBody.trim() ? contentBody.trim().split(/\s+/).length : 0;
  const charCount = contentBody.length;

  // Document Upload Handler
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMessage('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await submissionService.uploadDocument(formData);
      setContentBody(res.data.extracted_text);
      if (!title) {
        // Derive clean title from filename
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
      setSubmitSuccess(`Extracted ${res.data.word_count} words from ${file.name}`);
    } catch (err) {
      const msg = err.response?.data?.error || 'Document extraction failed. Supported formats: .txt, .docx, .pdf';
      setErrorMessage(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Analyze Handler
  const handleAnalyze = async () => {
    if (!contentBody.trim()) {
      setErrorMessage('Content cannot be empty. Please draft or paste your text first.');
      return;
    }

    setAnalyzing(true);
    setErrorMessage('');
    setSubmitSuccess('');

    try {
      let currentSubId = submissionId;
      let currentVerId = activeVersionId;

      // If not yet saved in DB, create submission first
      if (!currentSubId) {
        const createRes = await submissionService.create({
          title: title.trim() || 'Untitled Brand Copy',
          content_body: contentBody,
          content_type: contentType,
          publishing_channel: channel,
          campaign_name: campaign.trim() || null
        });
        currentSubId = createRes.data.submission.id;
        currentVerId = createRes.data.submission.current_version_id;
        setSubmissionId(currentSubId);
        setSubmission(createRes.data.submission);
        setVersions(createRes.data.submission.versions || []);
      } else {
        // If content was modified, create a new version before analyzing to preserve history
        if (submission?.current_version?.content_body !== contentBody) {
          const verRes = await submissionService.createVersion(currentSubId, {
            content_body: contentBody,
            change_notes: 'Edited prior to analysis'
          });
          currentVerId = verRes.data.version.id;
          setActiveVersionId(currentVerId);
          setVersions(prev => [...prev, verRes.data.version]);
        }
      }

      // Execute backend analysis pipeline
      const analysisRes = await submissionService.analyze(currentSubId, currentVerId);
      const findingsList = analysisRes.data.analysis.findings || [];
      setFindings(findingsList);
      setAnalysisMeta(analysisRes.data.analysis.analysis_run);
      setSubmission(analysisRes.data.submission);

      if (findingsList.length > 0) {
        setSelectedFinding(findingsList[0]);
      }
      setViewMode('preview'); // Switch to highlighter preview so user immediately sees highlighted issues!
      setSubmitSuccess(`Analysis completed: detected ${findingsList.length} potential issue(s).`);
    } catch (err) {
      console.error("Analysis execution error:", err);
      setErrorMessage(err.response?.data?.error || 'Failed to complete content analysis.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Accept Suggestion
  const handleApplySuggestion = async (finding) => {
    if (!finding.suggested_correction) return;
    try {
      const res = await findingService.applySuggestion(finding.id);
      setContentBody(res.data.updated_content);
      // Update finding locally
      setFindings(prev => prev.map(f => f.id === finding.id ? { ...f, status: 'accepted' } : f));
      setSubmitSuccess(`Suggestion applied: "${finding.suggested_correction}"`);
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to apply suggestion.');
    }
  };

  // Edit & Apply Suggestion
  const openEditModal = (finding) => {
    setFindingToEdit(finding);
    setEditedText(finding.suggested_correction || finding.affected_text);
    setIsEditModalOpen(true);
  };

  const handleSaveEditedSuggestion = async () => {
    if (!findingToEdit || !editedText.trim()) return;
    try {
      const res = await findingService.applySuggestion(findingToEdit.id, editedText.trim());
      setContentBody(res.data.updated_content);
      setFindings(prev => prev.map(f => f.id === findingToEdit.id ? { ...f, status: 'edited' } : f));
      setIsEditModalOpen(false);
      setSubmitSuccess(`Custom correction applied to text.`);
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to apply edited suggestion.');
    }
  };

  // Dismiss Finding
  const openDismissModal = (finding) => {
    setFindingToDismiss(finding);
    setDismissReason('');
    setIsDismissModalOpen(true);
  };

  const handleConfirmDismiss = async () => {
    if (!findingToDismiss || !dismissReason.trim()) {
      setErrorMessage('Please provide a valid dismissal reason.');
      return;
    }
    try {
      await findingService.dismiss(findingToDismiss.id, dismissReason.trim());
      setFindings(prev => prev.map(f => f.id === findingToDismiss.id ? { ...f, status: 'dismissed', dismiss_reason: dismissReason } : f));
      setIsDismissModalOpen(false);
      setSubmitSuccess(`Finding marked as dismissed.`);
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to dismiss finding.');
    }
  };

  // Submit for Review
  const handleSubmitForReview = async () => {
    if (!submissionId) {
      setErrorMessage('Please analyze and save your content draft first.');
      return;
    }

    try {
      const res = await reviewService.submitForReview(submissionId);
      setSubmission(res.data.submission);
      setSubmitSuccess('Content successfully submitted for human review approval!');
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to submit for review.');
    }
  };

  // Filtered findings list
  const filteredFindings = findings.filter(f => {
    if (filterSeverity === 'ALL') return true;
    return f.severity === filterSeverity;
  });

  const openFindingsCount = findings.filter(f => f.status === 'open').length;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-100 text-teal-800 uppercase tracking-wider">
              Content Studio
            </span>
            {submission && <StatusBadge status={submission.current_status} />}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {title ? title : 'New Brand Review Workspace'}
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          {versions.length > 1 && (
            <button
              onClick={() => setIsDiffOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
            >
              <GitCompare className="w-3.5 h-3.5 text-slate-500" />
              <span>Compare Versions ({versions.length})</span>
            </button>
          )}

          <button
            onClick={handleSubmitForReview}
            disabled={!submissionId || submission?.current_status === 'Pending Review' || submission?.current_status === 'Approved'}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit for Review</span>
          </button>
        </div>
      </div>

      {/* Alert Notices */}
      {submitSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{submitSuccess}</span>
          </div>
          <button onClick={() => setSubmitSuccess('')} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Metadata & Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Metadata Controls Card */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Content Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q4 Social Campaign - Winter Wellness Boost"
                className="w-full text-sm font-semibold border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Content Type
                </label>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-2 bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                >
                  <option value="advertisement">Advertisement</option>
                  <option value="email">Email Campaign</option>
                  <option value="social_media_post">Social Media Post</option>
                  <option value="product_description">Product Description</option>
                  <option value="other">Other Marketing Asset</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Publishing Channel
                </label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-2 bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                >
                  <option value="instagram">Instagram</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="website">Official Website</option>
                  <option value="email_campaign">Email Newsletter</option>
                  <option value="print">Print / Brochure</option>
                  <option value="press_release">Press Release</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={campaign}
                  onChange={(e) => setCampaign(e.target.value)}
                  placeholder="e.g. Winter Health Sprint"
                  className="w-full text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                />
              </div>
            </div>
          </div>

          {/* Primary Content Editor Card */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Editor Toolbar */}
            <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">Content Body</span>
                <div className="flex items-center rounded-lg bg-slate-200/70 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode('editor')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      viewMode === 'editor' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Edit Raw
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('preview')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      viewMode === 'preview' ? 'bg-white text-teal-800 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Visual Highlights ({findings.length})
                  </button>
                </div>
              </div>

              {/* Upload Document Button */}
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.docx,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                  <span>{uploading ? 'Extracting...' : 'Upload Doc (TXT, DOCX, PDF)'}</span>
                </button>
              </div>
            </div>

            {/* Editor / Highlight Canvas */}
            <div className="p-4">
              {viewMode === 'editor' ? (
                <textarea
                  value={contentBody}
                  onChange={(e) => setContentBody(e.target.value)}
                  placeholder="Paste or write your marketing copy here... (e.g. 'Our product guarantees 100% results in seven days.')"
                  rows={14}
                  className="w-full text-sm text-slate-900 placeholder-slate-400 border-0 focus:outline-hidden resize-y leading-relaxed font-sans"
                />
              ) : (
                <div className="min-h-72 p-3 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                  <PassageHighlighter
                    text={contentBody}
                    findings={findings}
                    selectedFindingId={selectedFinding?.id}
                    onSelectFinding={(f) => setSelectedFinding(f)}
                  />
                </div>
              )}
            </div>

            {/* Editor Footer / Stats & Primary Action */}
            <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span><strong>{wordCount}</strong> words</span>
                <span>•</span>
                <span><strong>{charCount}</strong> characters</span>
                {analysisMeta && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-teal-700 font-medium">
                      <Cpu className="w-3 h-3" />
                      Analyzed via {analysisMeta.engine_type} ({analysisMeta.model_identifier})
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <Sparkles className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
                  <span>{analyzing ? 'Evaluating Brand Guardrails...' : 'Analyze Content'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Findings & Guidance Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-teal-700" />
                <h3 className="text-sm font-bold text-slate-900">Governance Findings</h3>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                {openFindingsCount} Open Issue{openFindingsCount !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Severity Filter Tabs */}
            <div className="flex items-center gap-1 mt-3 pb-2 overflow-x-auto text-[11px] font-semibold">
              {['ALL', 'Critical', 'High', 'Medium', 'Low'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    filterSeverity === sev
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            {/* Findings List */}
            <div className="mt-3 space-y-3 max-h-[580px] overflow-y-auto pr-1">
              {filteredFindings.length > 0 ? (
                filteredFindings.map((finding) => {
                  const isSelected = selectedFinding?.id === finding.id;
                  const isResolved = finding.status !== 'open';

                  return (
                    <div
                      key={finding.id}
                      onClick={() => setSelectedFinding(finding)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-teal-600 ring-2 ring-teal-600/20 bg-teal-50/10'
                          : 'border-slate-200/90 hover:border-slate-300 bg-white'
                      } ${isResolved ? 'opacity-60 bg-slate-50' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <SeverityBadge severity={finding.severity} />
                          <span className="text-xs font-bold text-slate-800">
                            {finding.issue_category}
                          </span>
                        </div>
                        {isResolved ? (
                          <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                            {finding.status}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400">
                            {finding.engine_source === 'rule' ? 'Deterministic Rule' : 'AI Analysis'}
                          </span>
                        )}
                      </div>

                      {/* Affected passage excerpt */}
                      <div className="mt-2 text-xs font-mono p-2 bg-slate-50 border border-slate-200 rounded text-slate-800 break-words">
                        "{finding.affected_text}"
                      </div>

                      {/* Explanation */}
                      <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                        {finding.explanation}
                      </p>

                      {/* Guideline / Reference Citation */}
                      {finding.guideline_code && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-teal-800 font-medium">
                          <FileText className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>Standard Reference: <strong>{finding.guideline_code}</strong></span>
                        </div>
                      )}

                      {/* Suggested Correction Box */}
                      {finding.suggested_correction && finding.status === 'open' && (
                        <div className="mt-3 p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-lg text-xs space-y-2">
                          <div className="flex items-center justify-between text-emerald-900 font-semibold">
                            <span>Suggested Correction</span>
                            {finding.confidence && (
                              <span className="text-[10px] font-normal text-emerald-700">
                                {Math.round(finding.confidence * 100)}% confidence
                              </span>
                            )}
                          </div>
                          <p className="text-slate-800 italic">
                            "{finding.suggested_correction}"
                          </p>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApplySuggestion(finding);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-md text-[11px] font-bold shadow-xs transition-colors"
                            >
                              <Check className="w-3 h-3" />
                              <span>Accept</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(finding);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-[11px] font-semibold transition-colors"
                            >
                              <Edit3 className="w-3 h-3 text-slate-500" />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDismissModal(finding);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-[11px] font-semibold transition-colors"
                            >
                              <X className="w-3 h-3 text-slate-500" />
                              <span>Dismiss</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-xl">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <h4 className="text-xs font-bold text-slate-800">No active findings detected</h4>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                    Run analysis or load a draft to evaluate copy against brand standards and restricted claim guidelines.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Version Comparison Modal */}
      <VersionDiffModal
        isOpen={isDiffOpen}
        onClose={() => setIsDiffOpen(false)}
        versions={versions}
      />

      {/* Dismiss Finding Modal */}
      <Modal
        isOpen={isDismissModalOpen}
        onClose={() => setIsDismissModalOpen(false)}
        title="Dismiss Finding with Reason"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Audit policies require a formal justification when overriding or dismissing a brand governance finding.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Justification / Exception Rationale
            </label>
            <textarea
              rows={3}
              value={dismissReason}
              onChange={(e) => setDismissReason(e.target.value)}
              placeholder="e.g. Quoting legal disclaimer from approved third-party partner."
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-hidden focus:ring-2 focus:ring-teal-600 text-slate-900"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsDismissModalOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDismiss}
              className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
            >
              Confirm Dismissal
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Correction Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Suggested Correction"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Adjust the suggested wording before applying it directly to the active copy.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Replacement Text
            </label>
            <textarea
              rows={3}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-hidden focus:ring-2 focus:ring-teal-600 text-slate-900"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEditedSuggestion}
              className="px-4 py-1.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs"
            >
              Apply to Document
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

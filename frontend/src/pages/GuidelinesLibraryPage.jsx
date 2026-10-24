import React, { useState, useEffect } from 'react';
import { guidelineService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import {
  BookOpen,
  Search,
  PlusCircle,
  ShieldCheck,
  CheckCircle,
  XCircle,
  FileText,
  AlertTriangle,
  History,
  Layers,
  Edit,
  Archive,
  ExternalLink,
  Tag
} from 'lucide-react';

export default function GuidelinesLibraryPage() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('guidelines'); // 'guidelines' | 'facts' | 'claims' | 'assets'
  const [guidelines, setGuidelines] = useState([]);
  const [facts, setFacts] = useState([]);
  const [claims, setClaims] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Guideline Creation / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGuideline, setEditingGuideline] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('tone_voice');
  const [formContent, setFormContent] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formChangeSummary, setFormChangeSummary] = useState('');

  // Fact Modal
  const [isFactModalOpen, setIsFactModalOpen] = useState(false);
  const [factTopic, setFactTopic] = useState('');
  const [factStatement, setFactStatement] = useState('');
  const [factSource, setFactSource] = useState('');

  // Version History Modal
  const [selectedGuidelineHistory, setSelectedGuidelineHistory] = useState(null);

  const [message, setMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [gRes, fRes, cRes, aRes] = await Promise.all([
        guidelineService.list({ search, category: categoryFilter }),
        guidelineService.getFacts(),
        guidelineService.getClaims(),
        guidelineService.getAssets()
      ]);
      setGuidelines(gRes.data.guidelines || []);
      setFacts(fRes.data.facts || []);
      setClaims(cRes.data.claims || []);
      setAssets(aRes.data.assets || []);
    } catch (err) {
      console.error("Error loading guidelines:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [categoryFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const openCreateModal = () => {
    setEditingGuideline(null);
    setFormTitle('');
    setFormCategory('tone_voice');
    setFormContent('');
    setFormCode('');
    setFormChangeSummary('');
    setIsModalOpen(true);
  };

  const openEditModal = (g) => {
    setEditingGuideline(g);
    setFormTitle(g.title);
    setFormCategory(g.category);
    setFormContent(g.content);
    setFormCode(g.guideline_code);
    setFormChangeSummary(`Update to version ${g.version + 1}`);
    setIsModalOpen(true);
  };

  const handleSaveGuideline = async (e) => {
    e.preventDefault();
    try {
      if (editingGuideline) {
        await guidelineService.update(editingGuideline.id, {
          title: formTitle,
          category: formCategory,
          content: formContent,
          change_summary: formChangeSummary || 'Content updated'
        });
        setMessage(`Guideline ${editingGuideline.guideline_code} updated to version ${editingGuideline.version + 1}.`);
      } else {
        await guidelineService.create({
          title: formTitle,
          category: formCategory,
          content: formContent,
          guideline_code: formCode
        });
        setMessage('New brand guideline registered successfully.');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveFact = async (e) => {
    e.preventDefault();
    try {
      await guidelineService.createFact({
        topic: factTopic,
        statement: factStatement,
        verified_source: factSource
      });
      setIsFactModalOpen(false);
      setFactTopic('');
      setFactStatement('');
      setFactSource('');
      setMessage('Verified product fact added to reference library.');
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchive = async (gid) => {
    if (!window.confirm("Are you sure you want to archive this guideline?")) return;
    try {
      await guidelineService.delete(gid);
      setMessage("Guideline archived.");
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const viewGuidelineHistory = async (gid) => {
    try {
      const res = await guidelineService.get(gid);
      setSelectedGuidelineHistory(res.data.guideline);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-100 text-teal-800 uppercase tracking-wider">
              Single Source of Truth
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Brand Guidelines & Reference Library</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Approved voice & tone rules, verified facts, restricted claims, and certified assets.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            {activeTab === 'facts' ? (
              <button
                onClick={() => setIsFactModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Verified Fact</span>
              </button>
            ) : (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Brand Standard</span>
              </button>
            )}
          </div>
        )}
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium">
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('guidelines')}
          className={`pb-3 px-3 transition-colors border-b-2 ${
            activeTab === 'guidelines'
              ? 'border-teal-700 text-teal-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Brand Guidelines ({guidelines.length})
        </button>

        <button
          onClick={() => setActiveTab('facts')}
          className={`pb-3 px-3 transition-colors border-b-2 ${
            activeTab === 'facts'
              ? 'border-teal-700 text-teal-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Verified Facts ({facts.length})
        </button>

        <button
          onClick={() => setActiveTab('claims')}
          className={`pb-3 px-3 transition-colors border-b-2 ${
            activeTab === 'claims'
              ? 'border-teal-700 text-teal-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Restricted Claims ({claims.length})
        </button>

        <button
          onClick={() => setActiveTab('assets')}
          className={`pb-3 px-3 transition-colors border-b-2 ${
            activeTab === 'assets'
              ? 'border-teal-700 text-teal-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Approved Assets ({assets.length})
        </button>
      </div>

      {/* TAB 1: GUIDELINES */}
      {activeTab === 'guidelines' && (
        <div className="space-y-4">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearchSubmit} className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search guidelines by code, title, or rule content..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
              />
            </form>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
            >
              <option value="">All Categories</option>
              <option value="tone_voice">Tone & Voice</option>
              <option value="terminology">Terminology</option>
              <option value="restricted_claim">Restricted Claims</option>
              <option value="legal_compliance">Legal & Compliance</option>
              <option value="verified_fact">Verified Facts</option>
              <option value="visual_asset">Visual Assets</option>
            </select>
          </div>

          {/* Guidelines Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {guidelines.map((g) => (
              <div
                key={g.id}
                className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded">
                      {g.guideline_code}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      v{g.version} • {g.category?.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mb-2">{g.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{g.content}</p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <button
                    onClick={() => viewGuidelineHistory(g.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900"
                  >
                    <History className="w-3.5 h-3.5 text-slate-400" />
                    <span>Audit History</span>
                  </button>

                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(g)}
                        className="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-50 rounded"
                        title="Edit Guideline"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleArchive(g.id)}
                        className="p-1 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                        title="Archive Guideline"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: VERIFIED FACTS */}
      {activeTab === 'facts' && (
        <div className="space-y-4">
          <div className="p-4 bg-teal-50/60 border border-teal-200 rounded-xl text-xs text-teal-900 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Verified Product Knowledge Base</strong>
              <p className="mt-0.5 text-teal-800 leading-relaxed">
                These claims and metrics have verified scientific or institutional backing. The AI engine checks promotional drafts against this repository to prevent hallucinated product claims.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {facts.map((fact) => (
              <div key={fact.id} className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{fact.topic}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Verified Active
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-sans italic bg-slate-50 p-3 rounded-lg border border-slate-200">
                  "{fact.statement}"
                </p>
                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Source: <strong>{fact.verified_source}</strong></span>
                  <span>Effective: {new Date(fact.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: RESTRICTED CLAIMS */}
      {activeTab === 'claims' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {claims.map((claim) => (
              <div key={claim.id} className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 capitalize">
                    {claim.claim_type} Claim Trigger
                  </span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                    claim.severity === 'Critical' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                  }`}>
                    {claim.severity} Severity
                  </span>
                </div>

                <div className="font-mono text-xs p-2 bg-rose-50/50 border border-rose-200 rounded text-rose-900">
                  Trigger: "{claim.trigger_pattern}"
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <p><strong>Restriction Rationale:</strong> {claim.restriction_reason}</p>
                  <p><strong>Required Substantiation:</strong> {claim.required_substantiation}</p>
                  {claim.mandatory_disclaimer && (
                    <p className="text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-200 mt-2">
                      <strong>Mandatory Disclaimer:</strong> "{claim.mandatory_disclaimer}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: BRAND ASSETS */}
      {activeTab === 'assets' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {assets.map((asset) => (
            <div key={asset.id} className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-xs space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                {asset.asset_type}
              </span>
              <h4 className="text-xs font-bold text-slate-900">{asset.name}</h4>
              <p className="text-xs text-slate-600">{asset.usage_instructions}</p>
              {asset.file_url && (
                <div className="font-mono text-[10px] text-slate-400 break-all p-1.5 bg-slate-50 rounded border border-slate-100">
                  {asset.file_url}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Guideline Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingGuideline ? `Edit Guideline (${editingGuideline.guideline_code})` : "Create Brand Guideline"}
      >
        <form onSubmit={handleSaveGuideline} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Title
            </label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Approved Clinical AI Terminology"
              className="w-full text-xs border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 text-slate-800"
              >
                <option value="tone_voice">Tone & Voice</option>
                <option value="terminology">Terminology</option>
                <option value="restricted_claim">Restricted Claim</option>
                <option value="legal_compliance">Legal & Compliance</option>
                <option value="verified_fact">Verified Fact</option>
                <option value="visual_asset">Visual Asset</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Guideline Code
              </label>
              <input
                type="text"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                placeholder="e.g. BG-TERM-02"
                disabled={!!editingGuideline}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 text-slate-900 uppercase font-mono disabled:bg-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Guideline Content & Instructions
            </label>
            <textarea
              required
              rows={4}
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="State the exact rule, prohibited phrases, approved replacements, or requirements..."
              className="w-full text-xs border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
            />
          </div>

          {editingGuideline && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Revision Summary (Version {editingGuideline.version + 1})
              </label>
              <input
                type="text"
                required
                value={formChangeSummary}
                onChange={(e) => setFormChangeSummary(e.target.value)}
                placeholder="e.g. Updated FDA regulatory citation for FY2026."
                className="w-full text-xs border border-slate-200 rounded-lg p-2 text-slate-900"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs"
            >
              {editingGuideline ? "Save Revision" : "Create Guideline"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Fact Modal */}
      <Modal
        isOpen={isFactModalOpen}
        onClose={() => setIsFactModalOpen(false)}
        title="Add Verified Product Fact"
      >
        <form onSubmit={handleSaveFact} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Fact Topic
            </label>
            <input
              type="text"
              required
              value={factTopic}
              onChange={(e) => setFactTopic(e.target.value)}
              placeholder="e.g. Efficacy & Latency Reduction"
              className="w-full text-xs border border-slate-200 rounded-lg p-2 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Verified Statement
            </label>
            <textarea
              required
              rows={3}
              value={factStatement}
              onChange={(e) => setFactStatement(e.target.value)}
              placeholder="e.g. ApexPulse Pro reduces diagnostic triage latency by 42% according to the 2025 Johns Hopkins multicenter study across 14,000 patient records."
              className="w-full text-xs border border-slate-200 rounded-lg p-2 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Verification Source & Audit Citation
            </label>
            <input
              type="text"
              required
              value={factSource}
              onChange={(e) => setFactSource(e.target.value)}
              placeholder="e.g. Johns Hopkins Medicine Journal of Digital Health 2025"
              className="w-full text-xs border border-slate-200 rounded-lg p-2 text-slate-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsFactModalOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs"
            >
              Add Verified Fact
            </button>
          </div>
        </form>
      </Modal>

      {/* Version History Modal */}
      <Modal
        isOpen={!!selectedGuidelineHistory}
        onClose={() => setSelectedGuidelineHistory(null)}
        title={`Guideline Audit History: ${selectedGuidelineHistory?.guideline_code}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Immutable audit record of revisions for <strong>{selectedGuidelineHistory?.title}</strong>.
          </p>

          <div className="space-y-3 max-h-72 overflow-y-auto">
            {selectedGuidelineHistory?.versions?.map((v) => (
              <div key={v.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between font-semibold text-slate-800">
                  <span>Version {v.version_number}</span>
                  <span className="text-[10px] text-slate-400">{new Date(v.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-slate-600 italic">"{v.content}"</p>
                <div className="text-[10px] text-teal-800 pt-1">
                  Change Note: {v.change_summary || 'Initial baseline'} {v.changed_by_name ? `by ${v.changed_by_name}` : ''}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setSelectedGuidelineHistory(null)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

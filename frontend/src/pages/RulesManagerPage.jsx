import React, { useState, useEffect } from 'react';
import { ruleService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import SeverityBadge from '../components/SeverityBadge';
import Modal from '../components/Modal';
import {
  Sliders,
  PlusCircle,
  Search,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  AlertTriangle,
  Info
} from 'lucide-react';

export default function RulesManagerPage() {
  const { isAdmin } = useAuth();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ruleTypeFilter, setRuleTypeFilter] = useState('');

  // Create / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('prohibited_term');
  const [formPattern, setFormPattern] = useState('');
  const [formReplacement, setFormReplacement] = useState('');
  const [formExplanation, setFormExplanation] = useState('');
  const [formSeverity, setFormSeverity] = useState('Medium');
  const [formIsRegex, setFormIsRegex] = useState(false);
  const [formCaseSensitive, setFormCaseSensitive] = useState(false);
  const [formExceptions, setFormExceptions] = useState('');

  const [message, setMessage] = useState('');

  const loadRules = async () => {
    setLoading(true);
    try {
      const res = await ruleService.list({ search, rule_type: ruleTypeFilter });
      setRules(res.data.rules || []);
    } catch (err) {
      console.error("Error loading rules:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, [ruleTypeFilter]);

  const handleToggle = async (ruleId) => {
    try {
      await ruleService.toggle(ruleId);
      loadRules();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (ruleId) => {
    if (!window.confirm("Are you sure you want to permanently delete this rule?")) return;
    try {
      await ruleService.delete(ruleId);
      setMessage("Rule removed.");
      loadRules();
    } catch (err) {
      console.error(err);
    }
  };

  const openCreateModal = () => {
    setEditingRule(null);
    setFormName('');
    setFormType('prohibited_term');
    setFormPattern('');
    setFormReplacement('');
    setFormExplanation('');
    setFormSeverity('Medium');
    setFormIsRegex(false);
    setFormCaseSensitive(false);
    setFormExceptions('');
    setIsModalOpen(true);
  };

  const openEditModal = (r) => {
    setEditingRule(r);
    setFormName(r.rule_name);
    setFormType(r.rule_type);
    setFormPattern(r.pattern);
    setFormReplacement(r.replacement || '');
    setFormExplanation(r.explanation);
    setFormSeverity(r.severity);
    setFormIsRegex(r.is_regex);
    setFormCaseSensitive(r.case_sensitive);
    setFormExceptions(r.exceptions || '');
    setIsModalOpen(true);
  };

  const handleSaveRule = async (e) => {
    e.preventDefault();
    try {
      if (editingRule) {
        await ruleService.update(editingRule.id, {
          rule_name: formName,
          rule_type: formType,
          pattern: formPattern,
          replacement: formReplacement,
          explanation: formExplanation,
          severity: formSeverity,
          is_regex: formIsRegex,
          case_sensitive: formCaseSensitive,
          exceptions: formExceptions
        });
        setMessage(`Rule "${formName}" updated successfully.`);
      } else {
        await ruleService.create({
          rule_name: formName,
          rule_type: formType,
          pattern: formPattern,
          replacement: formReplacement,
          explanation: formExplanation,
          severity: formSeverity,
          is_regex: formIsRegex,
          case_sensitive: formCaseSensitive,
          exceptions: formExceptions
        });
        setMessage(`New rule "${formName}" created successfully.`);
      }
      setIsModalOpen(false);
      loadRules();
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
              Deterministic Engine
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Configurable Terminology Rules</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Backend-evaluated regex & exact word boundary rules for instant compliance detection.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Rule</span>
          </button>
        )}
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium">
          {message}
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyUp={(e) => e.key === 'Enter' && loadRules()}
            placeholder="Search rules by name or regex pattern..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
          />
        </div>

        <select
          value={ruleTypeFilter}
          onChange={(e) => setRuleTypeFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
        >
          <option value="">All Rule Types</option>
          <option value="prohibited_term">Prohibited Terms</option>
          <option value="disallowed_absolute_claim">Disallowed Absolute Claims</option>
          <option value="required_disclaimer">Required Disclaimers</option>
          <option value="approved_product_name">Approved Product Names</option>
          <option value="word_limit">Word Limits</option>
          <option value="character_limit">Character Limits</option>
        </select>
      </div>

      {/* Rules Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Rule Name & Type</th>
                <th className="px-4 py-3.5">Pattern</th>
                <th className="px-4 py-3.5">Suggested Replacement</th>
                <th className="px-4 py-3.5">Severity</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400">
                    Loading terminology rules...
                  </td>
                </tr>
              ) : rules.length > 0 ? (
                rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => isAdmin && handleToggle(rule.id)}
                        disabled={!isAdmin}
                        className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                          rule.is_active ? 'bg-teal-700' : 'bg-slate-300'
                        }`}
                        title={rule.is_active ? 'Click to disable' : 'Click to enable'}
                      >
                        <div
                          className={`bg-white w-3 h-3 rounded-full shadow-xs transform transition-transform ${
                            rule.is_active ? 'translate-x-3' : 'translate-x-0'
                          }`}
                        ></div>
                      </button>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-bold text-slate-900 block">{rule.rule_name}</span>
                      <span className="text-[10px] text-slate-400 capitalize">
                        {rule.rule_type?.replace(/_/g, ' ')} {rule.is_regex ? '(Regex)' : ''}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-[11px] text-rose-800 bg-rose-50/40 rounded max-w-xs truncate">
                      {rule.pattern}
                    </td>

                    <td className="px-4 py-3.5 font-mono text-[11px] text-emerald-800 max-w-xs truncate">
                      {rule.replacement || '—'}
                    </td>

                    <td className="px-4 py-3.5">
                      <SeverityBadge severity={rule.severity} />
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {isAdmin && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(rule)}
                            className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded"
                            title="Edit Rule"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(rule.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                            title="Delete Rule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400">
                    No terminology rules configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create / Edit Rule */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRule ? `Edit Rule: ${editingRule.rule_name}` : "Create Terminology Rule"}
      >
        <form onSubmit={handleSaveRule} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Rule Name
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. 100% Results Guarantee Prohibited"
              className="w-full text-xs border border-slate-200 rounded-lg p-2 text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Rule Type
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 text-slate-800"
              >
                <option value="prohibited_term">Prohibited Term</option>
                <option value="disallowed_absolute_claim">Disallowed Absolute Claim</option>
                <option value="required_disclaimer">Required Disclaimer</option>
                <option value="approved_product_name">Approved Product Name</option>
                <option value="word_limit">Word Limit</option>
                <option value="character_limit">Character Limit</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Severity
              </label>
              <select
                value={formSeverity}
                onChange={(e) => setFormSeverity(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 text-slate-800"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Matching Pattern (Word, Phrase, or Regex)
            </label>
            <input
              type="text"
              required
              value={formPattern}
              onChange={(e) => setFormPattern(e.target.value)}
              placeholder="e.g. guarantee(s)?\s+100%\s+results?"
              className="w-full text-xs font-mono border border-slate-200 rounded-lg p-2 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Suggested Replacement (Optional)
            </label>
            <input
              type="text"
              value={formReplacement}
              onChange={(e) => setFormReplacement(e.target.value)}
              placeholder="e.g. delivers clinically validated outcomes"
              className="w-full text-xs border border-slate-200 rounded-lg p-2 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Explanation & Rationale
            </label>
            <textarea
              required
              rows={3}
              value={formExplanation}
              onChange={(e) => setFormExplanation(e.target.value)}
              placeholder="Explain why this term violates brand governance and healthcare compliance..."
              className="w-full text-xs border border-slate-200 rounded-lg p-2 text-slate-900"
            />
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-700 pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formIsRegex}
                onChange={(e) => setFormIsRegex(e.target.checked)}
                className="rounded text-teal-600"
              />
              <span>Is Regular Expression (Regex)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formCaseSensitive}
                onChange={(e) => setFormCaseSensitive(e.target.checked)}
                className="rounded text-teal-600"
              />
              <span>Case Sensitive</span>
            </label>
          </div>

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
              Save Rule
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

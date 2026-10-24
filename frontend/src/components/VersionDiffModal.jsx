import React, { useState } from 'react';
import Modal from './Modal';
import { GitCompare, Clock, User } from 'lucide-react';

export default function VersionDiffModal({ isOpen, onClose, versions = [] }) {
  if (!versions || versions.length < 2) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Version Comparison">
        <div className="text-center py-8 text-slate-500">
          <GitCompare className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p>At least two versions are required to compare revisions.</p>
        </div>
      </Modal>
    );
  }

  const [verAIndex, setVerAIndex] = useState(0); // Older
  const [verBIndex, setVerBIndex] = useState(versions.length - 1); // Newer

  const verA = versions[verAIndex];
  const verB = versions[verBIndex];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compare Content Versions" maxWidth="max-w-4xl">
      <div className="space-y-4">
        {/* Version selectors */}
        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Base Version</label>
            <select
              value={verAIndex}
              onChange={(e) => setVerAIndex(Number(e.target.value))}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-teal-600 font-medium"
            >
              {versions.map((v, idx) => (
                <option key={v.id} value={idx}>
                  Version {v.version_number} — {new Date(v.created_at).toLocaleDateString()}
                </option>
              ))}
            </select>
            <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
              <span>{verA.word_count} words</span>
              <span>•</span>
              <span>{verA.change_notes || 'Initial version'}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Comparison Version</label>
            <select
              value={verBIndex}
              onChange={(e) => setVerBIndex(Number(e.target.value))}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-teal-600 font-medium"
            >
              {versions.map((v, idx) => (
                <option key={v.id} value={idx}>
                  Version {v.version_number} — {new Date(v.created_at).toLocaleDateString()}
                </option>
              ))}
            </select>
            <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
              <span>{verB.word_count} words</span>
              <span>•</span>
              <span>{verB.change_notes || 'Revision'}</span>
            </div>
          </div>
        </div>

        {/* Side-by-side text comparison */}
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
            <div className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              Version {verA.version_number} Body
            </div>
            <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
              {verA.content_body}
            </div>
          </div>

          <div className="border border-teal-200 rounded-lg p-4 bg-teal-50/20">
            <div className="text-xs font-semibold text-teal-800 mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-600"></span>
              Version {verB.version_number} Body (Revised)
            </div>
            <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
              {verB.content_body}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

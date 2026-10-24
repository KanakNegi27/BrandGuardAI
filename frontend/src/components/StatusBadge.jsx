import React from 'react';
import { Clock, CheckCircle2, AlertOctagon, RotateCcw, AlertTriangle, FileText } from 'lucide-react';

export default function StatusBadge({ status, className = '' }) {
  const st = status || 'Draft';

  switch (st) {
    case 'Approved':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Approved
        </span>
      );
    case 'Pending Review':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 ${className}`}>
          <Clock className="w-3.5 h-3.5 text-sky-600" />
          Pending Review
        </span>
      );
    case 'Changes Required':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 ${className}`}>
          <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
          Changes Required
        </span>
      );
    case 'Escalated':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 ${className}`}>
          <AlertOctagon className="w-3.5 h-3.5 text-purple-600" />
          Escalated
        </span>
      );
    case 'Analyzing':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 animate-pulse ${className}`}>
          <AlertTriangle className="w-3.5 h-3.5 text-teal-600 animate-spin" />
          Analyzing...
        </span>
      );
    case 'Draft':
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 ${className}`}>
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          Draft
        </span>
      );
  }
}

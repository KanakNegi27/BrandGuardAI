import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { reviewService } from '../services/api';
import {
  LayoutDashboard,
  FileEdit,
  Files,
  ClipboardCheck,
  BookOpen,
  Sliders,
  BarChart3,
  History,
  ShieldAlert,
} from 'lucide-react';

export default function Sidebar() {
  const { user, isAdmin, isReviewer } = useAuth();
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const fetchQueueCount = async () => {
      try {
        const res = await reviewService.getQueue();
        setQueueCount(res.data.total || res.data.queue?.length || 0);
      } catch (err) {
        // Silently ignore if not authorized
      }
    };
    fetchQueueCount();
    const interval = setInterval(fetchQueueCount, 30000); // 30s polling
    return () => clearInterval(interval);
  }, []);

  const navItemClass = ({ isActive }) =>
    `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-teal-50 text-teal-800 font-semibold border-r-2 border-teal-700'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
    }`;

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-6">
        {/* Core Operations */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
            Operations
          </div>
          <nav className="space-y-1">
            <NavLink to="/" end className={navItemClass}>
              <div className="flex items-center gap-3">
                <LayoutDashboard className="w-4 h-4 text-slate-500" />
                <span>Dashboard</span>
              </div>
            </NavLink>

            <NavLink to="/workspace" className={navItemClass}>
              <div className="flex items-center gap-3">
                <FileEdit className="w-4 h-4 text-slate-500" />
                <span>Review Workspace</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 font-bold uppercase">
                New
              </span>
            </NavLink>

            <NavLink to="/submissions" className={navItemClass}>
              <div className="flex items-center gap-3">
                <Files className="w-4 h-4 text-slate-500" />
                <span>All Submissions</span>
              </div>
            </NavLink>

            <NavLink to="/reviews" className={navItemClass}>
              <div className="flex items-center gap-3">
                <ClipboardCheck className="w-4 h-4 text-slate-500" />
                <span>Review Queue</span>
              </div>
              {queueCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800">
                  {queueCount}
                </span>
              )}
            </NavLink>
          </nav>
        </div>

        {/* Governance & Reference Libraries */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
            Brand Standards
          </div>
          <nav className="space-y-1">
            <NavLink to="/guidelines" className={navItemClass}>
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 text-slate-500" />
                <span>Guidelines Library</span>
              </div>
            </NavLink>

            <NavLink to="/rules" className={navItemClass}>
              <div className="flex items-center gap-3">
                <Sliders className="w-4 h-4 text-slate-500" />
                <span>Terminology Rules</span>
              </div>
            </NavLink>
          </nav>
        </div>

        {/* Intelligence & Compliance */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
            Compliance & Insights
          </div>
          <nav className="space-y-1">
            <NavLink to="/analytics" className={navItemClass}>
              <div className="flex items-center gap-3">
                <BarChart3 className="w-4 h-4 text-slate-500" />
                <span>Analytics Hub</span>
              </div>
            </NavLink>

            <NavLink to="/audit" className={navItemClass}>
              <div className="flex items-center gap-3">
                <History className="w-4 h-4 text-slate-500" />
                <span>Audit Trail</span>
              </div>
            </NavLink>
          </nav>
        </div>
      </div>

      {/* Human-in-the-Loop Governance Notice Card */}
      <div className="p-4 m-3 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-slate-800">Human Approval Rule</h4>
            <p className="text-[11px] text-slate-600 leading-tight mt-1">
              AI checks act as advisory recommendations. Official release requires human review approval.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

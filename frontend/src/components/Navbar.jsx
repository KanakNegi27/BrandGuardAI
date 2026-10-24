import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Bell, ChevronDown, LogOut, User, Building2, Cpu } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const roleColors = {
    admin: 'bg-purple-100 text-purple-800 border-purple-200',
    reviewer: 'bg-sky-100 text-sky-800 border-sky-200',
    creator: 'bg-teal-100 text-teal-800 border-teal-200',
  };

  return (
    <header className="h-16 border-b border-slate-200 bg-white sticky top-0 z-30 px-6 flex items-center justify-between">
      {/* Brand & Workspace */}
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-teal-700 flex items-center justify-center text-white shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-slate-900 tracking-tight text-base leading-none block">
              BrandGuard <span className="text-teal-700 font-extrabold">AI</span>
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-600 block mt-0.5">
              Team Slayers Enterprise
            </span>
          </div>
        </Link>

        {/* Workspace Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-100/80 border border-slate-200/80 rounded-lg text-xs font-medium text-slate-600">
          <Building2 className="w-3.5 h-3.5 text-slate-600" />
          <span>Workspace: <strong className="text-slate-800">ApexPulse Global</strong></span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Engine status pill */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 border border-teal-200/80 rounded-full text-[11px] font-medium text-teal-800">
          <Cpu className="w-3.5 h-3.5 text-teal-600" />
          <span>Governance Engine: Active</span>
        </div>

        {/* Role indicator badge */}
        {user && (
          <span className={`capitalize text-xs font-semibold px-2.5 py-0.5 rounded-full border ${roleColors[user.role] || roleColors.creator}`}>
            {user.role}
          </span>
        )}

        {/* Notification indicator */}
        <button 
          className="p-2 rounded-lg text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors relative"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-teal-600 absolute top-2 right-2 ring-2 ring-white"></span>
        </button>

        {/* User profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-semibold text-xs text-slate-700">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden lg:block text-xs">
              <span className="font-semibold text-slate-800 block">{user?.name || 'User'}</span>
              <span className="text-[10px] text-slate-600 block">{user?.email}</span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-600" />
          </button>

          {dropdownOpen && (
            <div 
              className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-40"
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900">{user?.name}</p>
                <p className="text-[11px] text-slate-600 truncate">{user?.email}</p>
                <p className="text-[10px] text-teal-700 font-medium mt-1 uppercase tracking-wider">{user?.department || user?.role}</p>
              </div>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors text-left"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

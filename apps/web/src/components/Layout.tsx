import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Play,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  KeyRound,
  Layers,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const ROLES = [
  {
    label: 'Operator Role',
    role: 'operator',
    token: 'pw-operator-token-dev-only-001',
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  },
  {
    label: 'Admin Role',
    role: 'admin',
    token: 'pw-admin-token-dev-only-0001',
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  },
  {
    label: 'Viewer Role',
    role: 'viewer',
    token: 'pw-viewer-token-dev-only-0001',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
] as const;

export default function Layout({ children }: LayoutProps) {
  const [currentRole, setCurrentRole] = useState<(typeof ROLES)[number]>(ROLES[0]);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const matched = ROLES.find((r) => r.token === savedToken);
    if (matched) {
      setCurrentRole(matched);
    } else {
      localStorage.setItem('auth_token', ROLES[0].token);
    }
  }, []);

  const handleSwitchRole = (r: (typeof ROLES)[number]) => {
    localStorage.setItem('auth_token', r.token);
    setCurrentRole(r);
    setShowRoleMenu(false);
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#080C14] text-slate-100 selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      {/* Subtle Background Glow Orbs */}
      <div className="fixed top-[-100px] left-[-100px] w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-[20%] right-[-100px] w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Sticky Glassmorphic Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0B0F19]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Brand / Logo */}
            <div className="flex items-center space-x-8">
              <Link to="/runs" className="flex items-center space-x-3 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 p-[1px] shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all">
                  <div className="w-full h-full bg-slate-950/90 rounded-xl flex items-center justify-center">
                    <Layers className="h-5 w-5 text-indigo-400 group-hover:scale-110 transition-transform" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-lg tracking-tight gradient-text">
                      PersonaDiff
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      v0.1.0
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block">
                    Multi-Persona Differential Audit & Verification
                  </p>
                </div>
              </Link>

              {/* Brand Description Tag */}
              <div className="hidden lg:flex items-center space-x-2 pl-4 border-l border-white/10 text-xs text-slate-400">
                <span>Zero State Contamination</span>
              </div>
            </div>

            {/* Right: Telemetry Badges & Role Controls */}
            <div className="flex items-center space-x-3">
              {/* System Connectivity Pill */}
              <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>API Infrastructure Online</span>
              </div>

              {/* Role Switcher Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowRoleMenu(!showRoleMenu)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${currentRole.color}`}
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>{currentRole.label}</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </button>

                {showRoleMenu && (
                  <div className="absolute right-0 mt-2 w-52 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-2.5 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                      Switch Auth Identity
                    </div>
                    {ROLES.map((r) => (
                      <button
                        key={r.role}
                        type="button"
                        onClick={() => handleSwitchRole(r)}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                          currentRole.role === r.role
                            ? 'bg-indigo-600/20 text-indigo-300'
                            : 'text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <span>{r.label}</span>
                        {currentRole.role === r.role && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Single Consolidated Action Button */}
              <Link
                to="/runs/new"
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all active:scale-95"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Launch Live Audit</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {children}
      </main>

      {/* Modern Footer */}
      <footer className="border-t border-white/5 bg-slate-950/60 py-6 text-xs text-slate-500 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1.5 text-slate-400">
              <ShieldCheck className="h-4 w-4 text-indigo-400" />
              <span>PersonaDiff: Evidence-First Differential Web Verification</span>
            </span>
            <span className="text-slate-700">•</span>
            <span className="text-slate-400">Zero State Contamination</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-slate-500">Fastify REST & Playwright Isolated Contexts</span>
            <span className="text-slate-700">•</span>
            <a
              href="https://github.com/omerfarooq223/ParallelWeb"
              target="_blank"
              rel="noreferrer"
              className="hover:text-indigo-400 flex items-center space-x-1 transition-colors"
            >
              <span>GitHub</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

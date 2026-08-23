import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ExternalLink, Layers, RefreshCw, Sparkles } from 'lucide-react';
import { DeveloperModal } from './DeveloperModal';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isDevModalOpen, setIsDevModalOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#080C14] text-slate-100 selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      {/* Subtle Background Glow Orbs */}
      <div className="fixed top-[-100px] left-[-100px] w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-[20%] right-[-100px] w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Sticky Glassmorphic Navbar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B0F19]/80 backdrop-blur-xl">
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

              {/* Nav Links */}
              <nav className="hidden md:flex items-center space-x-1">
                <Link
                  to="/runs"
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Runs</span>
                </Link>
                <Link
                  to="/scheduled-jobs"
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Monitors</span>
                </Link>
              </nav>
            </div>

            {/* Right: Role Switcher & Developer Profile Icon */}
            <div className="flex items-center space-x-3">
              {/* Active Persona / Role Switcher */}
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900/85 border border-white/10 text-xs text-slate-300">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Role:
                </span>
                <select
                  value={localStorage.getItem('auth_token') || 'pw-admin-token-dev-only-0001'}
                  onChange={(e) => {
                    localStorage.setItem('auth_token', e.target.value);
                    window.location.reload();
                  }}
                  className="bg-transparent text-indigo-400 font-semibold focus:outline-none cursor-pointer hover:text-indigo-300"
                >
                  <option
                    value="pw-admin-token-dev-only-0001"
                    className="bg-[#0B0F19] text-slate-300"
                  >
                    Admin
                  </option>
                  <option
                    value="pw-operator-token-dev-only-001"
                    className="bg-[#0B0F19] text-slate-300"
                  >
                    Operator
                  </option>
                  <option
                    value="pw-viewer-token-dev-only-0001"
                    className="bg-[#0B0F19] text-slate-300"
                  >
                    Viewer
                  </option>
                </select>
              </div>

              {/* Developer Profile Modal Trigger */}
              <button
                type="button"
                onClick={() => setIsDevModalOpen(true)}
                title="Developer: Muhammad Umar Farooq"
                className="relative group p-[2px] rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 rounded-full blur opacity-60 group-hover:opacity-100 transition duration-300" />
                <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200 border border-white/20">
                  UF
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {children}
      </main>

      {/* Modern Footer */}
      <footer className="border-t border-white/5 bg-slate-950/70 py-6 text-xs text-slate-400 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1.5 text-slate-300">
              <ShieldCheck className="h-4 w-4 text-indigo-400" />
              <span className="font-semibold text-slate-200">PersonaDiff</span>
              <span className="text-slate-500">v0.1.0</span>
            </span>
            <span className="text-slate-700">•</span>
            <span className="text-slate-400">Zero-Leakage Multi-Persona Web Verification</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
            <button
              onClick={() => setIsDevModalOpen(true)}
              className="flex items-center space-x-1.5 text-slate-300 hover:text-indigo-300 transition-colors group cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span>
                Developer:{' '}
                <span className="font-medium text-white group-hover:text-indigo-300">
                  Muhammad Umar Farooq
                </span>
              </span>
            </button>
            <span className="text-slate-700 hidden sm:inline">•</span>
            <a
              href="https://omerfarooq223.github.io"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 font-medium transition-colors"
            >
              <span>Portfolio</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <span className="text-slate-700 hidden sm:inline">•</span>
            <a
              href="https://github.com/omerfarooq223/ParallelWeb"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white flex items-center space-x-1 text-slate-400 transition-colors"
            >
              <span>GitHub</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </footer>

      {/* Developer Profile Modal */}
      <DeveloperModal isOpen={isDevModalOpen} onClose={() => setIsDevModalOpen(false)} />
    </div>
  );
}

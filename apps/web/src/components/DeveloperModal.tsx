import React, { useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';

interface DeveloperModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeveloperModal({ isOpen, onClose }: DeveloperModalProps) {
  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Developer Profile"
        className="relative w-full max-w-sm sm:max-w-md bg-[#0B0F19]/95 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_-10px_rgba(99,102,241,0.3)] backdrop-blur-2xl z-10 transition-all animate-in zoom-in-95 duration-200 overflow-hidden"
      >
        {/* Top Glowing Indigo/Purple Accent Bar Indicator */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-b-full shadow-[0_0_15px_rgba(99,102,241,0.8)]" />

        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Close modal"
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center mt-2">
          {/* Glowing Avatar Initials Circle */}
          <div className="relative group mb-4">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 opacity-80 blur-md group-hover:opacity-100 transition-opacity" />
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 border-2 border-white/20">
              <span className="text-white font-black text-2xl sm:text-3xl tracking-tight">UF</span>
            </div>
          </div>

          {/* Developer Name */}
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Muhammad Umar Farooq
          </h2>

          {/* Role Pill / Subtitle */}
          <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[11px] font-bold text-indigo-400 tracking-[0.2em] uppercase">
            AI ENGINEER
          </div>

          {/* University / Affiliation Card */}
          <div className="w-full mt-6 p-4 rounded-2xl bg-slate-900/80 border border-white/10 text-center shadow-inner">
            <p className="text-sm font-semibold text-slate-200 tracking-wide">
              Department of Artificial Intelligence
            </p>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              University of Management and Technology
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Lahore, Pakistan</p>
          </div>

          {/* Action Links */}
          <div className="w-full mt-6 space-y-3">
            {/* GitHub Repository */}
            <a
              href="https://github.com/omerfarooq223/ParallelWeb"
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center space-x-2.5 py-3 px-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-white/10 hover:border-slate-600 transition-all duration-200 shadow-sm font-medium text-sm group"
            >
              <svg
                className="w-4 h-4 fill-current text-slate-300 group-hover:text-white transition-colors"
                viewBox="0 0 24 24"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span>GitHub Repository</span>
            </a>

            {/* Developer Portfolio */}
            <a
              href="https://omerfarooq223.github.io"
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center space-x-2.5 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold border border-indigo-400/30 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200 text-sm group"
            >
              <ExternalLink className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
              <span>Visit Developer Portfolio</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

import { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAppStore } from '@/store';
import { useAdherence } from '@/hooks/useAdherence';

const NAV = [
  { to: '/', label: '首页', icon: '🏠' },
  { to: '/today', label: '今日服药', icon: '⏰' },
  { to: '/medications', label: '我的药品', icon: '💊' },
  { to: '/inventory', label: '库存', icon: '📦' },
  { to: '/follow-up', label: '复诊', icon: '🩺' },
  { to: '/insights', label: 'AI 助手', icon: '🤖' },
  { to: '/profile', label: '我', icon: '👤' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const fontSize = useAppStore((s) => s.fontSize);
  const setFontSize = useAppStore((s) => s.setFontSize);
  const ad = useAdherence(7);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar with adherence progress */}
      <header className="sticky top-0 z-40 bg-white border-b border-ink-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500 text-white flex items-center justify-center font-bold">
              药
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold text-ink-900 leading-none">
                慢病用药小管家
              </h1>
              <p className="text-xs text-ink-500 mt-0.5 hidden md:block">
                让每一次服药都更有把握
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4 flex-1 max-w-md">
            <div className="flex-1">
              <div className="flex justify-between text-xs text-ink-500 mb-1">
                <span>本周依从性</span>
                <span className="font-semibold text-ink-700">{ad.score} 分</span>
              </div>
              <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    ad.score >= 85 ? 'bg-success' : ad.score >= 60 ? 'bg-warning' : 'bg-danger'
                  }`}
                  style={{ width: `${ad.score}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-500 hidden sm:inline">字号</span>
            <div className="flex bg-ink-100 rounded-lg p-1">
              {(['normal', 'large', 'xlarge'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFontSize(s)}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                    fontSize === s ? 'bg-white shadow-sm text-brand-600' : 'text-ink-500'
                  }`}
                  style={{ minHeight: 32 }}
                >
                  {s === 'normal' ? 'A' : s === 'large' ? 'A+' : 'A++'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:flex w-56 flex-col gap-1 px-4 py-6 sticky top-16 self-start">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-ink-700 hover:bg-ink-100'
                }`
              }
            >
              <span className="text-lg">{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </aside>

        <main className="flex-1 px-4 md:px-8 py-6 pb-24 md:pb-10 min-w-0">{children}</main>
      </div>

      {/* Bottom TabBar (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-ink-100">
        <div className="grid grid-cols-5">
          {[NAV[0], NAV[1], NAV[2], NAV[5], NAV[6]].map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 py-2 ${
                  isActive ? 'text-brand-600' : 'text-ink-500'
                }`
              }
              style={{ minHeight: 56 }}
            >
              <span className="text-xl">{n.icon}</span>
              <span className="text-xs font-medium">{n.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

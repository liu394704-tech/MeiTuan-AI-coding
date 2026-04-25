import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Dashboard } from '@/pages/Dashboard';
import { Reminders } from '@/pages/Reminders';
import { MedicationList } from '@/pages/Medications/MedicationList';
import { MedicationWizard } from '@/pages/Medications/MedicationWizard';
import { MedicationDetail } from '@/pages/Medications/MedicationDetail';
import { Insights } from '@/pages/Insights';
import { Profile } from '@/pages/Profile';
import { Family } from '@/pages/Family';
import { Articles } from '@/pages/Articles';
import { useAppStore } from '@/store';

export default function App() {
  const ready = useAppStore((s) => s.ready);
  const bootstrap = useAppStore((s) => s.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-ink-500">加载中…</div>
      </div>
    );
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppShell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/reminders" element={<Reminders />} />
          {/* 旧路由兼容 */}
          <Route path="/today" element={<Navigate to="/reminders" replace />} />
          <Route path="/follow-up" element={<Navigate to="/reminders" replace />} />
          <Route path="/inventory" element={<Navigate to="/medications" replace />} />
          <Route path="/medications" element={<MedicationList />} />
          <Route path="/medications/new" element={<MedicationWizard />} />
          <Route path="/medications/:id" element={<MedicationDetail />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/family" element={<Family />} />
          <Route path="/articles" element={<Articles />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

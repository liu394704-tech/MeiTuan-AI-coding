import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Dashboard } from '@/pages/Dashboard';
import { Today } from '@/pages/Today';
import { MedicationList } from '@/pages/Medications/MedicationList';
import { MedicationWizard } from '@/pages/Medications/MedicationWizard';
import { MedicationDetail } from '@/pages/Medications/MedicationDetail';
import { Inventory } from '@/pages/Inventory';
import { FollowUp } from '@/pages/FollowUp';
import { Insights } from '@/pages/Insights';
import { Profile } from '@/pages/Profile';
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
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/today" element={<Today />} />
          <Route path="/medications" element={<MedicationList />} />
          <Route path="/medications/new" element={<MedicationWizard />} />
          <Route path="/medications/:id" element={<MedicationDetail />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/follow-up" element={<FollowUp />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
